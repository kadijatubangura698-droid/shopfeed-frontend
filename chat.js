// ============================================================================
// SHOPFEED — CHAT LOGIC
//   GET  /chat/rooms/:id/messages  -> load message history
//   POST /chat/rooms/:id/messages  -> send a new message
// ============================================================================

if (!requireLogin()) {
  // requireLogin() already redirects to login.html
}

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");
const messagesList = document.getElementById("messages-list");
const currentUser = getCurrentUser();

if (!roomId) {
  window.location.href = "inbox.html";
}

async function loadRoomInfo() {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/rooms`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    const room = (data.rooms || []).find((r) => r.id === roomId);
    if (room && room.products) {
      document.getElementById("chat-title").textContent = room.products.title || "Chat";
      const pinned = document.getElementById("pinned-product");
      pinned.classList.remove("hidden");
      document.getElementById("pinned-thumb").src = room.products.thumbnail_url || "";
      document.getElementById("pinned-title").textContent = room.products.title || "";
    }
  } catch (err) {
    console.error("Failed to load room info:", err);
  }
}

async function loadMessages() {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    const messages = (data.messages || []).reverse(); // backend returns newest-first

    messagesList.innerHTML = "";
    messages.forEach((msg) => {
      messagesList.appendChild(renderMessage(msg));
    });
    scrollToBottom();
  } catch (err) {
    console.error("Failed to load messages:", err);
  }
}

function renderMessage(msg) {
  const div = document.createElement("div");
  const isMine = currentUser && msg.sender_id === currentUser.id;
  div.className = `message-bubble ${isMine ? "mine" : "theirs"}`;
  div.textContent = msg.body;
  return div;
}

function scrollToBottom() {
  messagesList.scrollTop = messagesList.scrollHeight;
}

document.getElementById("message-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("message-input");
  const body = input.value.trim();
  if (!body) return;

  input.value = "";

  try {
    const res = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (res.ok) {
      messagesList.appendChild(renderMessage(data.message));
      scrollToBottom();
    }
  } catch (err) {
    console.error("Failed to send message:", err);
  }
});

loadRoomInfo();
loadMessages();
