// ============================================================================
// SHOPFEED — INBOX LOGIC
// Loads the current user's conversations from GET /chat/rooms
// ============================================================================

const loggedOutView = document.getElementById("logged-out-view");
const inboxView = document.getElementById("inbox-view");

async function initInbox() {
  if (!isLoggedIn()) {
    loggedOutView.classList.remove("hidden");
    return;
  }
  inboxView.classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE_URL}/chat/rooms`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    const rooms = data.rooms || [];

    if (rooms.length === 0) {
      document.getElementById("empty-msg").classList.remove("hidden");
      return;
    }

    const list = document.getElementById("rooms-list");
    rooms.forEach((room) => {
      list.appendChild(renderRoom(room));
    });
  } catch (err) {
    console.error("Failed to load inbox:", err);
  }
}

function renderRoom(room) {
  const a = document.createElement("a");
  a.href = `chat.html?room=${room.id}`;
  a.className = "room-item";

  const product = room.products || {};
  const currentUser = getCurrentUser();
  const otherPartyIsSeller = currentUser && currentUser.id === room.buyer_id;

  a.innerHTML = `
    <img class="room-thumb" src="${product.thumbnail_url || ''}" alt="" />
    <div class="room-info">
      <p class="room-title">${escapeHtml(product.title || (otherPartyIsSeller ? "Seller" : "Buyer"))}</p>
      <p class="room-subtitle">Tap to view conversation</p>
    </div>
    <span class="room-time">${formatTime(room.last_message_at)}</span>
  `;
  return a;
}

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

initInbox();
