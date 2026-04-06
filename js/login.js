const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

function setLoginError(message) {
  errorBox.innerText = message || "";
  errorBox.style.display = message ? "block" : "none";
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  setLoginError("");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        type: "login",
        username,
        password
      })
    });

    const result = await res.json();

    if (result.success) {
      localStorage.setItem("loggedInUser", result.username);
      localStorage.setItem("userRole", result.role);
      window.location.href = "dashboard.html";
    } else {
      setLoginError("Invalid username or password");
    }

  } catch (error) {
    console.error("Login error:", error);
    setLoginError("Login failed. Try again.");
  }
});
