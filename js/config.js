const API_URL = "https://script.google.com/macros/s/AKfycbzIAaoiMnYH6aIJQnKAu93Y3bemMhPheIzioxdUgv1P1eBbuVFWbq_EAvP10S2jVc_u/exec";
/*const Deployment_ID = "AKfycbyaTkDRx7dejPy2KvAv599ItfZunT4q54p-2TZLqgm6J9yvu4wN_fJ3evzWvrPNGzXM";*/

window.AuthSession = (() => {
	const SESSION_KEY = "lm_auth_session_v1";
	const LEGACY_USER_KEY = "loggedInUser";
	const LEGACY_ROLE_KEY = "userRole";

	function safeRead() {
		try {
			const raw = sessionStorage.getItem(SESSION_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== "object") return null;
			return parsed;
		} catch (_error) {
			return null;
		}
	}

	function safeWrite(session) {
		try {
			sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
		} catch (_error) {
			// Ignore private mode quota errors.
		}
	}

	function clear() {
		try {
			sessionStorage.removeItem(SESSION_KEY);
		} catch (_error) {
			// Ignore.
		}

		// Clean up old auth storage keys.
		try {
			localStorage.removeItem(LEGACY_USER_KEY);
			localStorage.removeItem(LEGACY_ROLE_KEY);
		} catch (_error) {
			// Ignore.
		}
	}

	function isExpired(session) {
		if (!session || !session.expiresAt) return true;
		return Number(session.expiresAt) <= Date.now();
	}

	function get() {
		const session = safeRead();
		if (!session || isExpired(session)) {
			clear();
			return null;
		}
		return session;
	}

	function set(session) {
		safeWrite({
			username: String(session && session.username ? session.username : ""),
			role: String(session && session.role ? session.role : ""),
			token: String(session && session.token ? session.token : ""),
			expiresAt: Number(session && session.expiresAt ? session.expiresAt : 0)
		});
	}

	function requireValid(options = {}) {
		const session = get();
		if (session) return session;
		if (options.redirect !== false) {
			window.location.href = "login.html";
		}
		return null;
	}

	return {
		get,
		set,
		clear,
		requireValid
	};
})();

window.apiPost = async function apiPost(payload) {
	const body = payload && typeof payload === "object" ? { ...payload } : {};
	const isLogin = body.type === "login";
	const session = window.AuthSession ? window.AuthSession.get() : null;

	if (!isLogin) {
		if (!session || !session.token) {
			if (window.AuthSession) window.AuthSession.clear();
			window.location.href = "login.html";
			throw new Error("Missing or expired session");
		}
		body.auth_token = session.token;
	}

	const response = await fetch(API_URL, {
		method: "POST",
		cache: "no-store",
		body: JSON.stringify(body)
	});

	let data;
	try {
		data = await response.json();
	} catch (_error) {
		throw new Error("Invalid server response");
	}

	if (!response.ok) {
		throw new Error(data && data.message ? data.message : "Request failed");
	}

	if (data && data.unauthorized) {
		if (window.AuthSession) window.AuthSession.clear();
		window.location.href = "login.html";
		throw new Error("Unauthorized session");
	}

	return data;
};

window.AppDataCache = (() => {
	const CACHE_PREFIX = "lm_cache_v2";
	const META_KEY = `${CACHE_PREFIX}:meta`;
	const META_TTL_MS = 15000;
	const FALLBACK_TTL_MS = 120000;
	const RESOURCE_ACTIONS = ["leads", "master", "followups"];

	let metaPromise = null;

	function buildUrl(action) {
		const session = window.AuthSession ? window.AuthSession.get() : null;
		if (!session || !session.token) {
			throw new Error("Missing or expired session");
		}

		if (!action || action === "leads") {
			return `${API_URL}?auth_token=${encodeURIComponent(session.token)}`;
		}

		return `${API_URL}?action=${encodeURIComponent(action)}&auth_token=${encodeURIComponent(session.token)}`;
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
		const response = await fetch(buildUrl(action), { cache: "no-store" });
		const data = await response.json();

		if (data && data.unauthorized) {
			if (window.AuthSession) window.AuthSession.clear();
			window.location.href = "login.html";
			throw new Error("Unauthorized session");
		}

		return data;
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

	async function searchGlobal(query) {
		const session = window.AuthSession ? window.AuthSession.get() : null;
		if (!session || !session.token) {
			throw new Error("Missing or expired session");
		}

		const q = String(query || "").trim();
		if (!q) {
			return { query: "", total: 0, results: [] };
		}

		const url = `${API_URL}?action=global_search&q=${encodeURIComponent(q)}&auth_token=${encodeURIComponent(session.token)}`;
		const response = await fetch(url, { cache: "no-store" });
		const data = await response.json();

		if (data && data.unauthorized) {
			if (window.AuthSession) window.AuthSession.clear();
			window.location.href = "login.html";
			throw new Error("Unauthorized session");
		}

		return data;
	}

	return {
		getResource,
		prefetch,
		invalidate,
		getMeta,
		searchGlobal
	};
})();
