const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  errorBox.innerText = "";

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
      // Save login session
      localStorage.setItem("loggedInUser", result.username);
      localStorage.setItem("userRole", result.role);

      // Redirect
      window.location.href = "dashboard.html";
    } else {
      errorBox.innerText = "Invalid username or password";
    }

  } catch (error) {
    console.error("Login error:", error);
    errorBox.innerText = "Login failed. Try again.";
  }
});
