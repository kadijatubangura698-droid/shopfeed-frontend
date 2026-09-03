// ============================================================================
// SHOPFEED — LOGIN LOGIC
// Phone + OTP flow, fully driven by the backend:
//   /auth/otp/request  -> sends SMS code
//   /auth/otp/verify   -> confirms code, returns a login token
//   /auth/role         -> sets buyer or business on first login
// ============================================================================

const phoneStep = document.getElementById("phone-step");
const otpStep = document.getElementById("otp-step");
const roleStep = document.getElementById("role-step");
const statusMsg = document.getElementById("status-msg");

const phoneInput = document.getElementById("phone-input");
const otpInput = document.getElementById("otp-input");

let fullPhoneNumber = "";

// ---- Step 1: request OTP ----
document.getElementById("send-otp-btn").addEventListener("click", async () => {
  const errorEl = document.getElementById("phone-error");
  errorEl.textContent = "";

  const digits = phoneInput.value.trim();
  if (!/^\d{8,9}$/.test(digits)) {
    errorEl.textContent = "Enter a valid Sierra Leone number.";
    return;
  }

  fullPhoneNumber = `+232${digits}`;
  setStatus("Sending code...");

  try {
    const res = await fetch(`${API_BASE_URL}/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhoneNumber }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error === "too_many_otp_requests"
        ? "Too many attempts. Try again in a few minutes."
        : "Couldn't send code. Check the number and try again.";
      setStatus("");
      return;
    }

    setStatus("");
    phoneStep.classList.add("hidden");
    otpStep.classList.remove("hidden");
  } catch (err) {
    errorEl.textContent = "Network error — check your connection.";
    setStatus("");
  }
});

// ---- Step 2: verify OTP ----
document.getElementById("verify-otp-btn").addEventListener("click", async () => {
  const errorEl = document.getElementById("otp-error");
  errorEl.textContent = "";

  const code = otpInput.value.trim();
  if (!/^\d{4,6}$/.test(code)) {
    errorEl.textContent = "Enter the code you received.";
    return;
  }

  setStatus("Verifying...");

  try {
    const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhoneNumber, code }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = "Incorrect code. Try again.";
      setStatus("");
      return;
    }

    saveToken(data.token, data.user);
    setStatus("");

    if (data.is_new_user) {
      otpStep.classList.add("hidden");
      roleStep.classList.remove("hidden");
    } else {
      goHome();
    }
  } catch (err) {
    errorEl.textContent = "Network error — check your connection.";
    setStatus("");
  }
});

// ---- Step 3: pick buyer or business (first-time users only) ----
document.querySelectorAll(".role-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const role = btn.dataset.role;
    setStatus("Setting up your account...");

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
        setStatus("Something went wrong. Try again.");
      }
    } catch (err) {
      setStatus("Network error — check your connection.");
    }
  });
});

document.getElementById("back-btn").addEventListener("click", () => {
  otpStep.classList.add("hidden");
  phoneStep.classList.remove("hidden");
});

function setStatus(msg) {
  statusMsg.textContent = msg;
}

function goHome() {
  window.location.href = "index.html";
}

// If already logged in, skip straight home
if (isLoggedIn()) {
  goHome();
}
