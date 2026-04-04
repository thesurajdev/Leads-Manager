const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const agentName = document.getElementById("agentName").value;

  if (!agentName) {
    alert("Please select your name.");
    return;
  }

  localStorage.setItem("loggedInUser", agentName);

  alert(`Welcome, ${agentName}!`);
  window.location.href = "index.html";
});
