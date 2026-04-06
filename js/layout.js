const loggedInUser = localStorage.getItem("loggedInUser");
const userRole = localStorage.getItem("userRole");

// Redirect to login if not logged in
if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

// Set topbar user info
const topbarUsername = document.getElementById("topbarUsername");
const topbarRole = document.getElementById("topbarRole");

if (topbarUsername) topbarUsername.textContent = loggedInUser;
if (topbarRole) topbarRole.textContent = userRole;

// Hide reports for Agent
const reportsLink = document.getElementById("reportsLink");
if (reportsLink && userRole === "Agent") {
  reportsLink.style.display = "none";
}

// Logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
  });
}
