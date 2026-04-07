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

if (topbarUsername) topbarUsername.textContent = loggedInUser;
if (topbarRole) topbarRole.textContent = userRole;
if (welcomeUser && loggedInUser) {
  welcomeUser.textContent = `Welcome back, ${loggedInUser}. Your pipeline is ready.`;
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
