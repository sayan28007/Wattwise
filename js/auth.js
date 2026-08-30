/* ============================================================
   WattWise — Authentication (localStorage prototype)
   ============================================================ */

const USERS_KEY = "wattwise_users";
const SESSION_KEY = "currentUser";

let authMode = "login"; // "login" | "signup"

function getUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function switchTab(mode) {
  authMode = mode;
  document.getElementById("tabLogin").classList.toggle("active", mode === "login");
  document.getElementById("tabSignup").classList.toggle("active", mode === "signup");
  document.getElementById("authSubmit").textContent = mode === "login" ? "Log In" : "Create Account";
  document.getElementById("authError").textContent = "";

  const switchText = document.getElementById("authSwitchText");
  if (mode === "login") {
    switchText.innerHTML = 'New to WattWise? <b onclick="switchTab(\'signup\')" style="cursor:pointer">Create an account</b>';
  } else {
    switchText.innerHTML = 'Already have an account? <b onclick="switchTab(\'login\')" style="cursor:pointer">Log in</b>';
  }
}

function setAuthError(msg) {
  document.getElementById("authError").textContent = msg;
}

function handleAuthSubmit() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    setAuthError("Please enter both a username and password.");
    return;
  }

  const users = getUsers();

  if (authMode === "signup") {
    if (users[username]) {
      setAuthError("That username is already taken.");
      return;
    }
    users[username] = { password, bills: [], usageHistory: [] };
    saveUsers(users);
    loginUser(username);
  } else {
    const user = users[username];
    if (!user || user.password !== password) {
      setAuthError("Incorrect username or password.");
      return;
    }
    loginUser(username);
  }
}

function loginUser(username) {
  localStorage.setItem(SESSION_KEY, username);
  window.location.href = "dashboard.html";
}

function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

// Auto-redirect if already logged in
(function checkSession() {
  const current = localStorage.getItem(SESSION_KEY);
  if (current) {
    const users = getUsers();
    if (users[current]) {
      window.location.href = "dashboard.html";
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }
})();

// Enter key submits form
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("authForm");
  if (form) {
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAuthSubmit();
      }
    });
  }
});
