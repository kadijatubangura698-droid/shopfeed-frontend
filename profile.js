// ============================================================================
// SHOPFEED — PROFILE LOGIC
// Pulls everything from the backend:
//   /users/me                 -> current user's info
//   /users/:id/storefront     -> their own listings (business accounts)
//   /saved-items              -> items they've saved (buyers)
// ============================================================================

const loggedOutView = document.getElementById("logged-out-view");
const profileView = document.getElementById("profile-view");

async function initProfile() {
  if (!isLoggedIn()) {
    loggedOutView.classList.remove("hidden");
    return;
  }
  profileView.classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    renderUser(data.user);

    if (data.user.role === "business") {
      document.getElementById("post-cta").classList.remove("hidden");
      document.getElementById("stat-listings-label").textContent = "Listings";
      await loadListings(data.user.id);
    } else {
      document.getElementById("upgrade-cta").classList.remove("hidden");
      document.getElementById("stat-listings-label").textContent = "Saved";
      document.getElementById("tab-listings").textContent = "Saved";
      document.getElementById("tab-saved").classList.add("hidden");
      await loadSaved();
    }
  } catch (err) {
    console.error("Failed to load profile:", err);
  }
}

function renderUser(user) {
  const name = user.display_name || `+232 ${user.phone.slice(4)}`;
  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-handle").textContent = user.phone;

  const avatar = document.getElementById("profile-avatar");
  avatar.textContent = name.charAt(0).toUpperCase();

  const badge = document.getElementById("role-badge");
  badge.textContent = user.role === "business" ? "Business" : "Buyer";
  if (user.is_verified) {
    badge.textContent += " ✓ Verified";
    badge.classList.add("verified");
  }
}

async function loadListings(userId) {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/storefront`);
  const data = await res.json();
  const grid = document.getElementById("listings-grid");
  const listings = data.listings || [];

  document.getElementById("stat-listings").textContent = listings.length;
  document.getElementById("stat-views").textContent = formatCount(
    listings.reduce((sum, p) => sum + (p.view_count || 0), 0)
  );
  document.getElementById("stat-likes").textContent = formatCount(
    listings.reduce((sum, p) => sum + (p.like_count || 0), 0)
  );

  if (listings.length === 0) {
    document.getElementById("empty-msg").classList.remove("hidden");
    return;
  }

  listings.forEach((product) => {
    grid.appendChild(renderThumb(product));
  });
}

async function loadSaved() {
  const res = await fetch(`${API_BASE_URL}/saved-items`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  const grid = document.getElementById("listings-grid");
  const items = (data.items || []).map((i) => i.products).filter(Boolean);

  document.getElementById("stat-listings").textContent = items.length;

  if (items.length === 0) {
    document.getElementById("empty-msg").classList.remove("hidden");
    return;
  }

  items.forEach((product) => {
    grid.appendChild(renderThumb(product));
  });
}

function renderThumb(product) {
  const div = document.createElement("div");
  div.className = "thumb-item";
  div.innerHTML = `
    <img src="${product.thumbnail_url || ''}" alt="${escapeHtml(product.title)}" />
    <span class="thumb-price">SLE ${product.price_sle}</span>
  `;
  return div;
}

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

document.getElementById("logout-btn").addEventListener("click", () => {
  logout();
});

initProfile();
