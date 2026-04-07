(function () {
// Running from file:// breaks fetch + storage in many browsers.
// Show a clear message so users run via localhost.
if (window.location.protocol === "file:") {
  try {
    const box = document.createElement("div");
    box.style.margin = "16px";
    box.style.padding = "14px 16px";
    box.style.borderRadius = "14px";
    box.style.border = "1px solid #fed7aa";
    box.style.background = "#fff";
    box.style.boxShadow = "0 4px 14px rgba(0,0,0,0.06)";
    box.innerHTML = `
      <div style="font-weight:800;color:#9a3412;">Run this app via localhost</div>
      <div style="margin-top:6px;color:#374151; font-size:14px; line-height:1.35;">
        You opened this page using <code>file://</code>, which browsers restrict for security and can break loading data.
        Start a local server (example: <code>python -m http.server 8000</code>) and open
        <code>http://localhost:8000/login.html</code>.
      </div>
    `;
    (document.body || document.documentElement).prepend(box);
  } catch (e) {
    // ignore
  }
}

const session = window.AuthSession ? window.AuthSession.requireValid({ redirect: true }) : null;
if (!session) return;

const loggedInUser = session.username;
const userRole = session.role;

const topbarUsername = document.getElementById("topbarUsername");
const topbarRole = document.getElementById("topbarRole");
const welcomeUser = document.getElementById("welcomeUser");

const sidebarIconMap = {
  "index.html": `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.25 9.75V21h13.5V9.75" />
      <path d="M9.75 21v-6h4.5v6" />
    </svg>
  `,
  "dashboard.html": `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="11" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="17.5" width="7" height="3" rx="1.5" />
    </svg>
  `,
  "leads.html": `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 7.5h16" />
      <path d="M4 12h16" />
      <path d="M4 16.5h10" />
      <circle cx="18" cy="16.5" r="2.5" />
    </svg>
  `,
  "add-lead.html": `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  `,
  "followups.html": `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6.8 9A7 7 0 0 1 20 12" />
      <path d="M17.2 15A7 7 0 0 1 4 12" />
    </svg>
  `,
  "reports.html": `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M5 19.5h14" />
      <path d="M7.5 16V10" />
      <path d="M12 16V6.5" />
      <path d="M16.5 16v-4" />
    </svg>
  `
};

if (topbarUsername) topbarUsername.textContent = loggedInUser;
if (topbarRole) topbarRole.textContent = userRole;
if (welcomeUser && loggedInUser) {
  welcomeUser.textContent = `Welcome back, ${loggedInUser}. Your pipeline is ready.`;
}

try {
  document.querySelectorAll(".sidebar-nav a[href]").forEach((link) => {
    const href = (link.getAttribute("href") || "").toLowerCase();
    const svgMarkup = sidebarIconMap[href];

    if (!svgMarkup || link.querySelector(".nav-icon")) return;

    const icon = document.createElement("span");
    icon.className = "nav-icon";
    icon.innerHTML = svgMarkup.trim();
    link.prepend(icon);
  });
} catch (e) {
  // ignore
}

try {
  const sidebarFooter = document.querySelector(".sidebar-footer");
  if (sidebarFooter && !document.querySelector(".shell-credit")) {
    const credit = document.createElement("div");
    credit.className = "shell-credit";
    credit.innerHTML = `
      <strong>Created by Surajdev</strong>
      <p><a href="https://www.surajdev.com" target="_blank" rel="noopener noreferrer">www.surajdev.com</a></p>
    `;
    sidebarFooter.appendChild(credit);
  }
} catch (e) {
  // ignore
}

function showGlobalAppError(message) {
  try {
    const host =
      document.querySelector(".page-content") ||
      document.querySelector(".main-wrapper") ||
      document.body;

    const existing = document.getElementById("globalAppErrorBox");
    if (existing) existing.remove();

    const box = document.createElement("div");
    box.id = "globalAppErrorBox";
    box.style.margin = "16px";
    box.style.padding = "14px 16px";
    box.style.borderRadius = "14px";
    box.style.border = "1px solid #fecaca";
    box.style.background = "#fff";
    box.style.boxShadow = "0 4px 14px rgba(0,0,0,0.06)";
    const title = document.createElement("div");
    title.style.fontWeight = "800";
    title.style.color = "#dc2626";
    title.textContent = "App Error";

    const detail = document.createElement("div");
    detail.style.marginTop = "6px";
    detail.style.color = "#374151";
    detail.style.fontSize = "14px";
    detail.style.lineHeight = "1.35";
    detail.textContent = String(message || "Something went wrong.");

    const tip = document.createElement("div");
    tip.style.marginTop = "8px";
    tip.style.color = "#6b7280";
    tip.style.fontSize = "12px";
    tip.textContent = "Tip: open DevTools Console for details.";

    box.appendChild(title);
    box.appendChild(detail);
    box.appendChild(tip);

    host.prepend(box);
  } catch (e) {
    // ignore
  }
}

window.addEventListener("error", (event) => {
  const msg = event && event.message ? event.message : "Script error";
  showGlobalAppError(msg);
});
window.addEventListener("unhandledrejection", (event) => {
  const msg =
    event && event.reason
      ? event.reason.message || String(event.reason)
      : "Unhandled promise rejection";
  showGlobalAppError(msg);
});

document.body.classList.remove("sidebar-collapsed");

const reportsLink = document.getElementById("reportsLink");
if (reportsLink && userRole === "Agent") {
  reportsLink.style.display = "none";
}

try {
  const currentPage = (window.location.pathname.split("/").pop() || "").toLowerCase();
  const navLinks = document.querySelectorAll(".sidebar-nav a[href]");
  navLinks.forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href && href === currentPage) a.classList.add("active");
    else a.classList.remove("active");
  });
} catch (e) {
  // ignore
}

let sidebarSearchDebounceTimer = null;
let sidebarSearchRequestId = 0;

function getMenuSearchItems() {
  return Array.from(document.querySelectorAll(".sidebar-nav a[href]")).map((link) => ({
    kind: "menu",
    title: String(link.textContent || "").trim(),
    subtitle: "Menu",
    target_page: String(link.getAttribute("href") || "index.html")
  }));
}

function normalizeForSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function createSidebarResultItem(item, query) {
  const result = document.createElement("a");
  result.className = "sidebar-search-item";
  result.href = item.target_page || "index.html";

  const left = document.createElement("div");
  left.className = "sidebar-search-item-copy";

  const title = document.createElement("strong");
  title.textContent = item.title || "Result";

  const subtitle = document.createElement("span");
  const owner = item.owner ? `Owner: ${item.owner}` : "";
  const assignedHint = item.assigned_to_me === false ? "Not assigned to you" : "";
  subtitle.textContent = [item.subtitle || "", owner, assignedHint].filter(Boolean).join(" • ");

  left.appendChild(title);
  left.appendChild(subtitle);

  const chip = document.createElement("em");
  chip.className = `sidebar-search-chip ${item.kind === "menu" ? "menu" : "data"}`;
  chip.textContent = item.kind === "menu" ? "Menu" : "Data";

  result.appendChild(left);
  result.appendChild(chip);

  if (item.kind !== "menu") {
    result.addEventListener("click", () => {
      try {
        sessionStorage.setItem("lm_sidebar_search_query", String(query || ""));
      } catch (e) {
        // ignore
      }
    });
  }

  return result;
}

function renderSidebarSearchResults(container, query, menuMatches, dataResults, isLoading) {
  container.innerHTML = "";

  const hasAny = menuMatches.length || dataResults.length;

  if (isLoading) {
    const loading = document.createElement("div");
    loading.className = "sidebar-search-state";
    loading.textContent = "Searching...";
    container.appendChild(loading);
    return;
  }

  if (!hasAny) {
    const empty = document.createElement("div");
    empty.className = "sidebar-search-state";
    empty.textContent = "No matches found.";
    container.appendChild(empty);
    return;
  }

  const all = [...menuMatches, ...dataResults].slice(0, 10);
  all.forEach((item) => {
    container.appendChild(createSidebarResultItem(item, query));
  });
}

function initSidebarSearch() {
  const sidebar = document.querySelector(".sidebar");
  const nav = document.querySelector(".sidebar-nav");
  if (!sidebar || !nav) return;
  if (document.querySelector(".sidebar-search")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "sidebar-search";

  const input = document.createElement("input");
  input.type = "search";
  input.id = "sidebarSearchInput";
  input.className = "sidebar-search-input";
  input.placeholder = "Search menu, leads, follow-ups...";
  input.autocomplete = "off";

  const results = document.createElement("div");
  results.className = "sidebar-search-results";
  results.hidden = true;

  wrapper.appendChild(input);
  wrapper.appendChild(results);
  sidebar.insertBefore(wrapper, nav);

  const menuItems = getMenuSearchItems();

  input.addEventListener("input", () => {
    const query = normalizeForSearch(input.value);
    const menuMatches = menuItems.filter((item) => normalizeForSearch(item.title).includes(query));

    if (!query) {
      results.hidden = true;
      results.innerHTML = "";
      return;
    }

    results.hidden = false;
    renderSidebarSearchResults(results, query, menuMatches, [], true);

    if (sidebarSearchDebounceTimer) {
      clearTimeout(sidebarSearchDebounceTimer);
    }

    sidebarSearchDebounceTimer = setTimeout(async () => {
      const requestId = ++sidebarSearchRequestId;
      let dataResults = [];

      if (window.AppDataCache && typeof window.AppDataCache.searchGlobal === "function") {
        try {
          const response = await window.AppDataCache.searchGlobal(query);
          const rawResults = Array.isArray(response && response.results) ? response.results : [];
          dataResults = rawResults.map((item) => ({
            kind: String(item.kind || "data"),
            title: String(item.title || "Result"),
            subtitle: String(item.subtitle || "Data"),
            owner: String(item.owner || ""),
            assigned_to_me: item.assigned_to_me !== false,
            target_page: String(item.target_page || "leads.html")
          }));
        } catch (error) {
          console.error("Sidebar global search failed:", error);
        }
      }

      if (requestId !== sidebarSearchRequestId) return;
      renderSidebarSearchResults(results, query, menuMatches, dataResults, false);
    }, 240);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      input.value = "";
      results.hidden = true;
      results.innerHTML = "";
      input.blur();
    }
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) {
      results.hidden = true;
    }
  });
}

initSidebarSearch();

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (window.AuthSession) {
      window.AuthSession.clear();
    }
    if (window.AppDataCache) {
      window.AppDataCache.invalidate();
    }
    window.location.href = "login.html";
  });
}

document.querySelectorAll(".sidebar-nav a[href]").forEach((a) => {
  a.addEventListener("click", () => {
    // Sidebar is fixed/open by design.
  });
});

if (window.AppDataCache) {
  window.AppDataCache.prefetch(["leads", "master", "followups"]);
}
})();
