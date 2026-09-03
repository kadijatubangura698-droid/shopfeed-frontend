// ============================================================================
// SHOPFEED — AUTH HELPER
// Shared by every page. Keeps the login token in the browser's localStorage
// so the user stays logged in between visits.
// ============================================================================

function getToken() {
  return localStorage.getItem("shopfeed_token");
}

function isLoggedIn() {
  return !!getToken();
}

function saveToken(token, user) {
  localStorage.setItem("shopfeed_token", token);
  localStorage.setItem("shopfeed_user", JSON.stringify(user));
}

function logout() {
  localStorage.removeItem("shopfeed_token");
  localStorage.removeItem("shopfeed_user");
  window.location.href = "index.html";
}

function getCurrentUser() {
  const raw = localStorage.getItem("shopfeed_user");
  return raw ? JSON.parse(raw) : null;
}

// Call this before any action that requires login (like, follow, post, chat).
// If not logged in, sends the user to the login page and returns false.
function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
