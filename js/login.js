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
    const result = await window.apiPost({
      type: "login",
      username,
      password
    });

    if (result.success) {
      if (!result.auth_token || !result.expires_at) {
        setLoginError("Invalid server response. Contact administrator.");
        return;
      }

      window.AuthSession.set({
        username: result.username,
        role: result.role,
        token: result.auth_token,
        expiresAt: Number(result.expires_at)
      });

      if (window.AppDataCache) {
        window.AppDataCache.invalidate();
      }
      window.location.href = "dashboard.html";
    } else if (result.throttled) {
      setLoginError("Too many failed attempts. Try again in a few minutes.");
    } else if (result.unauthorized) {
      setLoginError("Session invalid. Please login again.");
    } else {
      setLoginError("Invalid username or password");
    }

  } catch (error) {
    console.error("Login error:", error);
    setLoginError("Login failed. Try again.");
  }
});
