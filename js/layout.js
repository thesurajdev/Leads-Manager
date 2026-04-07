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

const loggedInUser = localStorage.getItem("loggedInUser");
const userRole = localStorage.getItem("userRole");

if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

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
    box.innerHTML = `
      <div style="font-weight:800;color:#dc2626;">App Error</div>
      <div style="margin-top:6px;color:#374151; font-size:14px; line-height:1.35;">
        ${String(message || "Something went wrong.")}
      </div>
      <div style="margin-top:8px;color:#6b7280; font-size:12px;">
        Tip: open DevTools Console for details.
      </div>
    `;

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

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
  });
}

document.querySelectorAll(".sidebar-nav a[href]").forEach((a) => {
  a.addEventListener("click", () => {
    // Sidebar is fixed/open by design.
  });
});
})();
