/* extensions/corner-cart/assets/free-gift.js */
(() => {
  if (window.__freeGiftInit) return;
  window.__freeGiftInit = true;

  console.log("🎁 Ultra-Fast Dynamic Free Gift script initializing…");

  // ----------------------------
  // 🔒 STATE & UTILITIES
  // ----------------------------
  // let cartCache = null;
  // let cartCacheTime = 0;
  // const CART_TTL = 500; // ms cache for cart
  // const CAMPAIGN_TTL = 60000; // 1 minute cache for campaigns
  // let lastCampaignFetch = 0;
  // let cachedCampaign = null;
  let debounceTimer = null;
  window.__isGiftInProgress = false;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // auto-tune delay based on connection
  const isSlowConnection =
    navigator.connection?.effectiveType?.includes("2g") ||
    navigator.connection?.rtt > 600;
  const WAIT = isSlowConnection ? 200 : 80;

  // ----------------------------
  // 🛒 CART HELPERS
  // ----------------------------
  async function getCart() {
  const res = await fetch("/cart.js", { cache: "no-store" });
  return await res.json();
}


  async function cartChange(action, payload) {
    window.__isGiftInProgress = true;
    await fetch(`/cart/${action}.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await sleep(WAIT);
    window.__isGiftInProgress = false;
  }

  const addToCart = id =>
    cartChange("add", { id, quantity: 1, properties: { isFreeGift: "true" } });
  const updateQuantityToOne = key =>
    cartChange("change", { id: key, quantity: 1 });
  const removeByKey = key =>
    cartChange("change", { id: key, quantity: 0 });

  // ----------------------------
// 🎯 CAMPAIGN DATA (with fetch timer)
// ----------------------------
async function parseCampaignData() {
  const start = performance.now(); // ⏱️ START TIMER

  try {
    const res = await fetch("/apps/optimaio-cart/activeCampaigns", { cache: "no-store" });
    const data = await res.json();

    const end = performance.now(); // ⏱️ END TIMER
    const timeTaken = Math.round(end - start);

    console.log(`⚡ Free Gift Campaign fetch time: ${timeTaken} ms`, data);

    const active = (data.campaigns || []).filter(c => c.status === "active");
    if (active.length) {
      active.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
      return active[0];
    }
  } catch (err) {
    const end = performance.now();
    const timeTaken = Math.round(end - start);
    console.warn(`⚠️ Free Gift Campaign fetch FAILED after ${timeTaken} ms`, err);
  }

  return null;
}



  // ----------------------------
  // 🎨 POPUP (deferred creation)
  // ----------------------------
  requestIdleCallback(() => {
    const popupHTML = `
      <div id="optimaio-gift-popup" class="optimaio-gift-popup" style="display:none;">
        <div class="optimaio-gift-popup__inner">
          <h3>🎁 Choose Your Free Gifts</h3>
          <p>Select up to <span id="optimaio-max-gifts">1</span> gifts:</p>
          <div id="optimaio-gift-options"></div>
          <p id="optimaio-gift-error" style="color:#c00;font-size:13px;display:none;margin-top:6px;"></p>
          <div class="optimaio-gift-popup__actions">
            <button id="optimaio-cancel-gifts" class="optimaio-btn optimaio-btn--light">Cancel</button>
            <button id="optimaio-confirm-gifts" class="optimaio-btn">Confirm</button>
          </div>
        </div>
      </div>`;
    if (!document.getElementById("optimaio-gift-popup"))
      document.body.insertAdjacentHTML("beforeend", popupHTML);

    const style = document.createElement("style");
    style.textContent = `
      .optimaio-gift-popup{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:11000;font-family:Inter,sans-serif;}
      .optimaio-gift-popup__inner{background:#fff;padding:20px;border-radius:16px;width:90%;max-width:420px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.25);}
      .optimaio-gift-option{display:inline-block;margin:10px;cursor:pointer;border:2px solid transparent;border-radius:10px;padding:6px;background:#fff7f8;width:120px;transition:all .2s;}
      .optimaio-gift-option img{width:80px;height:80px;border-radius:8px;object-fit:cover;}
      .optimaio-gift-option p{font-size:13px;font-weight:500;color:#222;margin:6px 0 0;}
      .optimaio-gift-option:hover{border-color:#f1b0b0;transform:translateY(-2px);}
      .optimaio-gift-option.selected{border-color:#d48b8b;background:#fdeaea;}
      .optimaio-btn{background:#000;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;margin:8px;}
      .optimaio-btn--light{background:#eee;color:#333;}
      .optimaio-gift-popup__actions{display:flex;justify-content:center;gap:10px;margin-top:12px;}
    `;
    document.head.appendChild(style);
  });

  // ----------------------------
  // 🪄 POPUP HANDLER
  // ----------------------------
  function showGiftSelectionPopup(products, maxQty) {
    const popup = document.getElementById("optimaio-gift-popup");
    const container = document.getElementById("optimaio-gift-options");
    const maxEl = document.getElementById("optimaio-max-gifts");
    const error = document.getElementById("optimaio-gift-error");
    maxEl.textContent = maxQty;
    error.style.display = "none";

    container.innerHTML = products
      .map(
        p => `
        <div class="optimaio-gift-option" data-id="${Number(
          p.id.split("/").pop()
        )}">
          <img src="${p.image?.url || p.featured_image || p.images?.[0] || ""}" alt="${p.title}">
          <p>${p.productTitle || p.title}</p>
        </div>`
      )
      .join("");

    popup.style.display = "flex";
    const selected = new Set();

    container.querySelectorAll(".optimaio-gift-option").forEach(opt => {
      opt.onclick = () => {
        const id = Number(opt.dataset.id);
        if (selected.has(id)) {
          selected.delete(id);
          opt.classList.remove("selected");
        } else if (selected.size < maxQty) {
          selected.add(id);
          opt.classList.add("selected");
        } else {
          error.textContent = `You can only select ${maxQty} gifts.`;
          error.style.display = "block";
          setTimeout(() => (error.style.display = "none"), 1500);
        }
      };
    });

    document.getElementById("optimaio-cancel-gifts").onclick = () =>
      (popup.style.display = "none");
    document.getElementById("optimaio-confirm-gifts").onclick = async () => {
      popup.style.display = "none";
      for (const vid of selected) await addToCart(vid);
      ensureFreeGift();
    };
  }

  // ----------------------------
  // 🎁 CORE GIFT LOGIC
  // ----------------------------
  async function ensureFreeGift() {
    if (window.__isGiftInProgress) return;
    window.__isGiftInProgress = true;

    try {
      const campaign = await parseCampaignData();
      if (!campaign) return;
      const giftGoal = campaign.goals?.find(g => g.type === "free_product");
      if (!giftGoal || !giftGoal.products?.length) return;

      const giftVariantIds = giftGoal.products.map(p =>
        Number(p.id.split("/").pop())
      );
      const cart = await getCart();
      const giftLines = cart.items.filter(i => i.properties?.isFreeGift === "true");
      const hasNonGiftProducts = cart.items.some(
        i => !giftVariantIds.includes(i.variant_id)
      );

      const subtotal =
        cart.items
          .filter(i => !giftVariantIds.includes(i.variant_id))
          .reduce((a, i) => a + i.final_line_price, 0) / 100;

      const totalQty = cart.items
        .filter(i => !giftVariantIds.includes(i.variant_id))
        .reduce((a, i) => a + i.quantity, 0);

      const trackType = campaign.trackType;
      const targetAmount = parseFloat(giftGoal.target || giftGoal.thresholdAmount || 0);
      const targetQty = parseInt(giftGoal.target || giftGoal.minQty || 0, 10);

      const conditionMet =
        trackType === "quantity" ? totalQty >= targetQty : subtotal >= targetAmount;
      console.log(`[🎯 Gift Check] Condition met: ${conditionMet}`);

      // enforce quantity = 1
      for (const g of giftLines)
        if (g.quantity !== 1) await updateQuantityToOne(g.key);

      if (conditionMet && hasNonGiftProducts) {
        const giftCount = giftGoal.products.length;
        const giftQty = giftGoal.giftQty || 1;

        if (giftCount === 1) {
          const vid = giftVariantIds[0];
          if (!giftLines.some(i => i.variant_id === vid)) await addToCart(vid);
        } else if (!giftLines.length) {
          showGiftSelectionPopup(giftGoal.products, giftQty);
        }
      } else {
        for (const g of giftLines) await removeByKey(g.key);
      }

      document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
    } finally {
      window.__isGiftInProgress = false;
    }
  }

  // ----------------------------
  // ⚡ CART EVENT HOOKS (Debounced)
  // ----------------------------
  const triggerGiftCheck = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => ensureFreeGift(), 250);
  };

  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    const res = await _fetch(...args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    if (/\/cart\/(add|change|update|clear)\.js/.test(url)) triggerGiftCheck();
    return res;
  };

  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener("load", () => {
      if (
        typeof url === "string" &&
        /\/cart\/(add|change|update|clear)\.js/.test(url)
      )
        triggerGiftCheck();
    });
    return _open.call(this, method, url, ...rest);
  };

  // ----------------------------
  // 🧩 INITIAL LOAD + PREFETCH
  // ----------------------------
  window.addEventListener("DOMContentLoaded", () => getCart());

  setTimeout(async () => {
    const cart = await getCart();
    for (const i of cart.items)
      if (i.properties?.isFreeGift === "true" && i.quantity !== 1)
        await updateQuantityToOne(i.key);
    ensureFreeGift();
  }, 800);
})();