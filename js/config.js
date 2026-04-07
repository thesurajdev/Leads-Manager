const API_URL = "https://script.google.com/macros/s/AKfycbw5u_3A9tLdz11teIBNJp8c-ESNRTKR2Z3mO_DkQUcRHdH9KBkthN52mc8lQZ0T_wh-/exec";
/*const Deployment_ID = "AKfycbyaTkDRx7dejPy2KvAv599ItfZunT4q54p-2TZLqgm6J9yvu4wN_fJ3evzWvrPNGzXM";*/

window.AppDataCache = (() => {
	const CACHE_PREFIX = "lm_cache_v2";
	const META_KEY = `${CACHE_PREFIX}:meta`;
	const META_TTL_MS = 15000;
	const FALLBACK_TTL_MS = 120000;
	const RESOURCE_ACTIONS = ["leads", "master", "followups"];

	let metaPromise = null;

	function buildUrl(action) {
		if (!action || action === "leads") return API_URL;
		return `${API_URL}?action=${encodeURIComponent(action)}`;
	}

	function getResourceKey(action) {
		return `${CACHE_PREFIX}:${action}`;
	}

	function safeRead(key) {
		try {
			const raw = localStorage.getItem(key);
			return raw ? JSON.parse(raw) : null;
		} catch (_error) {
			return null;
		}
	}

	function safeWrite(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (_error) {
			// Ignore storage quota or privacy mode issues.
		}
	}

	function safeRemove(key) {
		try {
			localStorage.removeItem(key);
		} catch (_error) {
			// Ignore storage issues.
		}
	}

	async function fetchJson(action) {
		const response = await fetch(buildUrl(action));
		return response.json();
	}

	function readCachedResource(action) {
		return safeRead(getResourceKey(action));
	}

	function getCachedMeta() {
		return safeRead(META_KEY);
	}

	function getMetaVersion(meta) {
		return String(meta && meta.spreadsheet_last_updated ? meta.spreadsheet_last_updated : "");
	}

	async function getMeta(options = {}) {
		const force = Boolean(options.force);
		const cachedMeta = getCachedMeta();
		const now = Date.now();

		if (!force && cachedMeta && now - Number(cachedMeta.cached_at || 0) < META_TTL_MS) {
			return cachedMeta;
		}

		if (!force && metaPromise) {
			return metaPromise;
		}

		metaPromise = (async () => {
			try {
				const meta = await fetchJson("meta");
				const payload = {
					...meta,
					cached_at: Date.now()
				};
				safeWrite(META_KEY, payload);
				return payload;
			} catch (error) {
				if (cachedMeta) {
					return cachedMeta;
				}
				throw error;
			} finally {
				metaPromise = null;
			}
		})();

		return metaPromise;
	}

	function shouldRefreshByFallback(resource) {
		if (!resource) return true;
		return Date.now() - Number(resource.cached_at || 0) > FALLBACK_TTL_MS;
	}

	async function fetchAndCacheResource(action, options = {}) {
		const meta = options.meta || await getMeta({ force: true }).catch(() => null);
		const version = getMetaVersion(meta);
		const data = await fetchJson(action);
		const payload = {
			action,
			version,
			cached_at: Date.now(),
			data
		};
		safeWrite(getResourceKey(action), payload);
		return payload;
	}

	async function revalidateResource(action, options = {}) {
		const cachedResource = readCachedResource(action);
		let meta = null;

		try {
			meta = await getMeta({ force: false });
		} catch (_error) {
			if (!shouldRefreshByFallback(cachedResource)) {
				return cachedResource ? cachedResource.data : null;
			}
		}

		const version = getMetaVersion(meta);
		const needsRefresh =
			!cachedResource ||
			!cachedResource.version ||
			(version && cachedResource.version !== version) ||
			(!version && shouldRefreshByFallback(cachedResource));

		if (!needsRefresh) {
			return cachedResource ? cachedResource.data : null;
		}

		const fresh = await fetchAndCacheResource(action, { meta });
		if (typeof options.onUpdate === "function") {
			options.onUpdate(fresh.data);
		}
		return fresh.data;
	}

	async function getResource(action, options = {}) {
		const cachedResource = readCachedResource(action);

		if (cachedResource && cachedResource.data !== undefined) {
			revalidateResource(action, options).catch((error) => {
				console.error(`Cache revalidation failed for ${action}:`, error);
			});
			return cachedResource.data;
		}

		const fresh = await fetchAndCacheResource(action);
		return fresh.data;
	}

	function invalidate(actions = RESOURCE_ACTIONS) {
		actions.forEach((action) => safeRemove(getResourceKey(action)));
		safeRemove(META_KEY);
	}

	function prefetch(actions = RESOURCE_ACTIONS) {
		actions.forEach((action) => {
			revalidateResource(action).catch((error) => {
				console.error(`Background prefetch failed for ${action}:`, error);
			});
		});
	}

	return {
		getResource,
		prefetch,
		invalidate,
		getMeta
	};
})();
