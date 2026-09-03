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
        📞 Order on WhatsApp
      </a>
    </div>

    <div class="side-actions">
      <button class="like-btn" data-id="${product.id}">
        ❤️ <span>${product.like_count || 0}</span>
      </button>
      <button class="comment-btn">
        💬 <span>0</span>
      </button>
      <button class="share-btn">
        ↗️ <span>${0}</span>
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
