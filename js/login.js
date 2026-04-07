const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

function setLoginError(message) {
  errorBox.innerText = message || "";
  errorBox.style.display = message ? "block" : "none";
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  setLoginError("");

  const validationErrors = [];

  if (username.length < 3) {
    validationErrors.push("Username must be at least 3 characters.");
  }

  if (username.length > 50) {
    validationErrors.push("Username cannot exceed 50 characters.");
  }

  if (password.length < 4) {
    validationErrors.push("Password must be at least 4 characters.");
  }

  if (password.length > 100) {
    validationErrors.push("Password cannot exceed 100 characters.");
  }

  usernameInput.classList.toggle("is-invalid", username.length < 3 || username.length > 50);
  passwordInput.classList.toggle("is-invalid", password.length < 4 || password.length > 100);

  if (validationErrors.length) {
    setLoginError(validationErrors.join(" "));
    return;
  }

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
