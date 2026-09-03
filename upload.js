// ============================================================================
// SHOPFEED — UPLOAD LOGIC
// Flow, fully driven by the backend:
//   1. POST /products/upload-url  -> get a signed URL to upload the video directly
//   2. PUT the video file to that signed URL (bypasses this server entirely)
//   3. POST /products             -> create the listing, kicks off processing
//   4. (optional) POST /payments/boost -> start a mobile money boost payment
// ============================================================================

const loggedOutView = document.getElementById("logged-out-view");
const notBusinessView = document.getElementById("not-business-view");
const formView = document.getElementById("upload-form-view");

let selectedFile = null;

async function initUploadPage() {
  if (!isLoggedIn()) {
    loggedOutView.classList.remove("hidden");
    return;
  }

  const user = getCurrentUser();
  if (!user || user.role !== "business") {
    notBusinessView.classList.remove("hidden");
    return;
  }

  formView.classList.remove("hidden");
}

// ---- Video selection + 15s validation ----
const videoInput = document.getElementById("video-input");
const videoPreview = document.getElementById("video-preview");
const videoPlaceholder = document.getElementById("video-picker-placeholder");
const videoError = document.getElementById("video-error");

videoInput.addEventListener("change", () => {
  videoError.textContent = "";
  const file = videoInput.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  videoPreview.src = url;

  videoPreview.onloadedmetadata = () => {
    if (videoPreview.duration > 15.5) {
      videoError.textContent = "Video must be 15 seconds or shorter.";
      selectedFile = null;
      return;
    }
    selectedFile = file;
    videoPreview.classList.remove("hidden");
    videoPlaceholder.classList.add("hidden");
  };
});

// ---- Boost toggle ----
document.getElementById("boost-checkbox").addEventListener("change", (e) => {
  document.getElementById("boost-options").classList.toggle("hidden", !e.target.checked);
});

// ---- Form submit ----
document.getElementById("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const errorEl = document.getElementById("upload-error");
  const statusEl = document.getElementById("upload-status");
  const publishBtn = document.getElementById("publish-btn");
  errorEl.textContent = "";

  if (!selectedFile) {
    errorEl.textContent = "Select a video first.";
    return;
  }

  const title = document.getElementById("title-input").value.trim();
  const category = document.getElementById("category-input").value;
  const price_sle = document.getElementById("price-input").value;
  const location = document.getElementById("location-input").value.trim();
  const whatsappDigits = document.getElementById("whatsapp-input").value.trim();

  if (!/^\d{8,9}$/.test(whatsappDigits)) {
    errorEl.textContent = "Enter a valid WhatsApp number.";
    return;
  }
  const whatsapp_number = `+232${whatsappDigits}`;

  publishBtn.disabled = true;

  try {
    // 1. Get signed upload URL from backend
    statusEl.textContent = "Preparing upload...";
    const urlRes = await fetch(`${API_BASE_URL}/products/upload-url`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const urlData = await urlRes.json();
    if (!urlRes.ok) throw new Error("Could not start upload.");

    // 2. Upload the video directly to storage (never touches our server)
    statusEl.textContent = "Uploading video...";
    const uploadRes = await fetch(urlData.upload_url, {
      method: "PUT",
      headers: { "Content-Type": selectedFile.type || "video/mp4" },
      body: selectedFile,
    });
    if (!uploadRes.ok) throw new Error("Video upload failed.");

    // 3. Create the product listing
    statusEl.textContent = "Creating your listing...";
    const productRes = await fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        title,
        category,
        price_sle: parseFloat(price_sle),
        location,
        whatsapp_number,
        raw_file_path: urlData.file_path,
      }),
    });
    const productData = await productRes.json();
    if (!productRes.ok) throw new Error("Could not create listing.");

    // 4. Optional boost
    const boostChecked = document.getElementById("boost-checkbox").checked;
    if (boostChecked) {
      statusEl.textContent = "Starting boost payment...";
      const duration = document.getElementById("boost-duration").value;
      const provider = document.getElementById("boost-provider").value;

      const boostRes = await fetch(`${API_BASE_URL}/payments/boost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ product_id: productData.product.id, provider, duration }),
      });
      const boostData = await boostRes.json();
      if (boostRes.ok && boostData.redirect_url) {
        window.location.href = boostData.redirect_url;
        return;
      }
    }

    statusEl.textContent = "Posted! It'll appear in the feed once approved.";
    setTimeout(() => {
      window.location.href = "profile.html";
    }, 1500);

  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || "Something went wrong. Try again.";
    statusEl.textContent = "";
    publishBtn.disabled = false;
  }
});

initUploadPage();
