// ============================================================================
// SHOPFEED — HOME FEED LOGIC
// Loads videos from the backend and renders them. Anyone can watch without
// logging in — but tapping Like checks requireLogin() first.
// ============================================================================

const feedContainer = document.getElementById("feed-container");
const loadingMsg = document.getElementById("loading-msg");

async function loadFeed(page = 0) {
  try {
    const res = await fetch(`${API_BASE_URL}/feed?page=${page}`);
    const data = await res.json();

    if (loadingMsg) loadingMsg.remove();

    if (!data.items || data.items.length === 0) {
      feedContainer.innerHTML = `<p class="loading-msg">No videos yet — check back soon!</p>`;
      return;
    }

    data.items.forEach((product) => {
      feedContainer.appendChild(renderVideoCard(product));
    });

  } catch (err) {
    console.error("Failed to load feed:", err);
    if (loadingMsg) loadingMsg.textContent = "Couldn't load videos. Pull to refresh.";
  }
}

function renderVideoCard(product) {
  const card = document.createElement("div");
  card.className = "video-card";

  card.innerHTML = `
    <video src="${product.video_url}" loop playsinline muted></video>

    <div class="video-info">
      <p class="seller-handle">@${product.seller_id ? "seller" : ""}</p>
      <p class="product-title">${escapeHtml(product.title)}</p>
      <span class="product-price">SLE ${product.price_sle}</span>
      <br/>
      <a class="whatsapp-btn" href="https://wa.me/?text=Hi, I'm interested in ${encodeURIComponent(product.title)}" target="_blank">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3C4.4 15 4 13.5 4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8z"/></svg>
        Order on WhatsApp
      </a>
    </div>

    <div class="side-actions">
      <div class="avatar-wrap">
        <div class="avatar"></div>
        <button class="follow-btn" aria-label="Follow">+</button>
      </div>

      <button class="action-btn like-btn" data-id="${product.id}">
        <svg class="icon heart-icon" viewBox="0 0 24 24" width="30" height="30">
          <path d="M12 21s-6.7-4.35-9.3-8.1C1 10.5 1.5 7 4.4 5.6 6.6 4.5 9 5.3 10.2 7 10.9 8 11.5 8.7 12 9.3c.5-.6 1.1-1.3 1.8-2.3C15 5.3 17.4 4.5 19.6 5.6c2.9 1.4 3.4 4.9 1.7 7.3C18.7 16.65 12 21 12 21z"/>
        </svg>
        <span>${formatCount(product.like_count || 0)}</span>
      </button>

      <button class="action-btn comment-btn">
        <svg class="icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12c0 4.4-4 8-9 8-1.1 0-2.2-.2-3.2-.5L3 21l1.6-4.8C3.6 14.9 3 13.5 3 12c0-4.4 4-8 9-8s9 3.6 9 8z"/>
        </svg>
        <span>0</span>
      </button>

      <button class="action-btn save-btn">
        <svg class="icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>
        </svg>
        <span>0</span>
      </button>

      <button class="action-btn share-btn">
        <svg class="icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14"/>
        </svg>
        <span>0</span>
      </button>
    </div>
  `;

  // Play the video only when it's the one in view (saves bandwidth on 3G)
  const video = card.querySelector("video");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        video.play().catch(() => {});
        registerView(product.id);
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.6 });
  observer.observe(card);

  // Like button — gated behind login
  const likeBtn = card.querySelector(".like-btn");
  likeBtn.addEventListener("click", () => handleLike(product.id, likeBtn));

  // Follow button — gated behind login
  const followBtn = card.querySelector(".follow-btn");
  followBtn.addEventListener("click", () => handleFollow(product.seller_id, followBtn));

  return card;
}

async function handleLike(productId, btnEl) {
  if (!requireLogin()) return; // sends to login.html if not logged in, stops here

  try {
    const res = await fetch(`${API_BASE_URL}/products/${productId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (data.ok) {
      btnEl.classList.add("liked");
    }
  } catch (err) {
    console.error("Like failed:", err);
  }
}

async function handleFollow(sellerId, btnEl) {
  if (!requireLogin()) return;
  // Backend follow endpoint isn't built yet — this just reflects the tap for now.
  btnEl.classList.add("following");
  btnEl.textContent = "✓";
}

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

async function registerView(productId) {
  try {
    await fetch(`${API_BASE_URL}/products/${productId}/view`, { method: "POST" });
  } catch (err) {
    // silent fail — view counts aren't critical
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

loadFeed();
