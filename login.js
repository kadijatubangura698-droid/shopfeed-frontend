// ============================================================================
// SHOPFEED — LOGIN / SIGNUP LOGIC
// Plain email + password, calling:
//   POST /auth/signup  -> create account (first time)
//   POST /auth/login   -> log in (returning users)
//   POST /auth/role    -> set buyer/business after signup
// ============================================================================

const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");
const submitBtn = document.getElementById("submit-btn");
const toggleText = document.getElementById("toggle-text");
const toggleBtn = document.getElementById("toggle-btn");
const errorEl = document.getElementById("auth-error");
const statusEl = document.getElementById("status-msg");
const roleStep = document.getElementById("role-step");

let mode = "login"; // or "signup"

if (isLoggedIn()) {
  window.location.href = "index.html";
}

toggleBtn.addEventListener("click", () => {
  mode = mode === "login" ? "signup" : "login";
  updateModeUI();
});

function updateModeUI() {
  errorEl.textContent = "";
  if (mode === "login") {
    authTitle.textContent = "Welcome back";
    authSubtitle.textContent = "Log in to continue";
    submitBtn.textContent = "Log In";
    toggleText.textContent = "Don't have an account?";
    toggleBtn.textContent = "Sign up";
  } else {
    authTitle.textContent = "Create your account";
    authSubtitle.textContent = "Buy and sell with a swipe.";
    submitBtn.textContent = "Sign Up";
    toggleText.textContent = "Already have an account?";
    toggleBtn.textContent = "Log in";
  }
}

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const email = document.getElementById("email-input").value.trim();
  const password = document.getElementById("password-input").value;

  submitBtn.disabled = true;
  statusEl.textContent = mode === "login" ? "Logging in..." : "Creating your account...";

  try {
    const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = describeError(data.error);
      statusEl.textContent = "";
      submitBtn.disabled = false;
      return;
    }

    saveToken(data.token, data.user);
    statusEl.textContent = "";

    if (data.is_new_user) {
      authForm.classList.add("hidden");
      document.querySelector(".toggle-row").classList.add("hidden");
      roleStep.classList.remove("hidden");
    } else {
      goHome();
    }
  } catch (err) {
    errorEl.textContent = `Network error: ${err.message}`;
    statusEl.textContent = "";
    submitBtn.disabled = false;
  }
});

document.querySelectorAll(".role-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const role = btn.dataset.role;
    statusEl.textContent = "Setting up your account...";

    try {
      const res = await fetch(`${API_BASE_URL}/auth/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) {
        saveToken(getToken(), data.user);
        goHome();
      } else {
        statusEl.textContent = "Something went wrong. Try again.";
      }
    } catch (err) {
      statusEl.textContent = "Network error — check your connection.";
    }
  });
});

function describeError(code) {
  switch (code) {
    case "email_taken": return "That email is already registered — try logging in instead.";
    case "weak_password": return "Password must be at least 6 characters.";
    case "invalid_email": return "Enter a valid email address.";
    case "invalid_credentials": return "Incorrect email or password.";
    case "too_many_attempts": return "Too many attempts. Wait a few minutes.";
    default: return `Something went wrong (${code || "unknown error"}).`;
  }
}

function goHome() {
  window.location.href = "index.html";
}

updateModeUI();
