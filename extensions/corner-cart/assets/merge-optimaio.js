/* ============================================================
   OPTIMAIO UNIFIED GIFT ENGINE
   Merges:
   - Free Gift Engine (with popup)
   - BXGY Engine (auto apply)
   - Shared cart hooks, shared campaign fetcher
=============================================================== */

(() => {
  if (window.__optimaioUnifiedGiftInit) return;
  window.__optimaioUnifiedGiftInit = true;

  console.log("🎁🧮 Optimaio Unified Gift Engine initializing…");

  /* -----------------------------------------------------------
     GLOBAL FLAGS
  ----------------------------------------------------------- */
  window.__isGiftInProgress = false;
  window.__isBXGYInProgress = false;

  let debounceTimer = null;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const WAIT =
    navigator.connection?.effectiveType?.includes("2g") ||
    navigator.connection?.rtt > 600
      ? 200
      : 80;

  /* -----------------------------------------------------------
     SHARED CART HELPERS
  ----------------------------------------------------------- */
  async function getCart() {
    return await window.OptimaioCartController.getCart();
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

  const addFreeGift = id =>
    cartChange("add", {
      id,
      quantity: 1,
      properties: { isFreeGift: "true" }
    });

  const addBxgyGift = (id, qty = 1) =>
    cartChange("add", {
      id,
      quantity: qty,
      properties: { isBXGYGift: "true" }
    });

  const removeByKey = key =>
    cartChange("change", { id: key, quantity: 0 });

  const updateQtyToOne = key =>
    cartChange("change", { id: key, quantity: 1 });

  /* -----------------------------------------------------------
     SHARED CAMPAIGN PARSER
  ----------------------------------------------------------- */
  async function parseCampaignData() {
    const start = performance.now();

    try {
      const json = await getCampaignData();
      const end = performance.now();

      console.log(
        `⚡ Campaign Data loaded in ${Math.round(end - start)}ms`,
        json
      );

      return json;
    } catch (err) {
      console.warn("❌ Campaign Data fetch failed", err);
      return null;
    }
  }

  /* -----------------------------------------------------------
     🎁 FREE GIFT POPUP CREATION
  ----------------------------------------------------------- */
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

  /* -----------------------------------------------------------
     🎁 FREE GIFT POPUP HANDLER
  ----------------------------------------------------------- */
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
          <img src="${p.image?.url || p.featured_image || p.images?.[0] || ""}">
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

      for (const vid of selected) await addFreeGift(vid);

      ensureUnifiedGiftEngine();
    };
  }

  /* -----------------------------------------------------------
     🎁 FREE GIFT ENGINE
  ----------------------------------------------------------- */
  async function runFreeGiftEngine(cart, campaign) {
    if (!campaign) return;

    const goal = campaign.goals?.find(g => g.type === "free_product");
    if (!goal) return;

    const giftProducts = goal.products || [];
    if (!giftProducts.length) return;

    const giftVariantIds = giftProducts.map(p =>
      Number(p.id.split("/").pop())
    );

    const giftLines = cart.items.filter(i => i.properties?.isFreeGift === "true");

    const subtotal = cart.items
      .filter(i => !giftVariantIds.includes(i.variant_id))
      .reduce((sum, i) => sum + i.final_line_price, 0) / 100;

    const totalQty = cart.items
      .filter(i => !giftVariantIds.includes(i.variant_id))
      .reduce((a, i) => a + i.quantity, 0);

    const track = campaign.trackType;
    const tAmt = parseFloat(goal.target || goal.thresholdAmount || 0);
    const tQty = parseInt(goal.target || goal.minQty || 0, 10);

    const cond =
      track === "quantity" ? totalQty >= tQty : subtotal >= tAmt;

    // Always enforce quantity = 1
    for (const g of giftLines)
      if (g.quantity !== 1) await updateQtyToOne(g.key);

    if (cond) {
      if (giftProducts.length === 1) {
        const vid = giftVariantIds[0];
        if (!giftLines.some(i => i.variant_id === vid))
          await addFreeGift(vid);
      } else if (!giftLines.length) {
        showGiftSelectionPopup(giftProducts, goal.giftQty || 1);
      }
    } else {
      for (const g of giftLines) await removeByKey(g.key);
    }
  }

  /* -----------------------------------------------------------
     🧮 BXGY ENGINE
  ----------------------------------------------------------- */
  async function runBxgyEngine(cart, bxgyCampaigns) {
    if (!bxgyCampaigns?.length) return;

    const giftLines = cart.items.filter(i => i.properties?.isBXGYGift === "true");
    const usedGiftVariantIds = new Set();
    const ops = [];

    // internal helper: load collection IDs (fresh)
    async function getCollectionProductIds(handle) {
      let allIds = [];
      let page = 1;

      while (true) {
        const res = await fetch(
          `/collections/${handle}/products.json?limit=250&page=${page}&t=${Date.now()}`,
          { cache: "no-store" }
        );
        const json = await res.json();

        if (!json.products || !json.products.length) break;
        json.products.forEach(p => allIds.push(p.id));

        if (json.products.length < 250) break;
        page++;
      }

      return allIds;
    }

    for (const bxgy of bxgyCampaigns) {
      const goal = bxgy.goals?.[0];
      if (!goal) continue;

      const buyQty = parseInt(goal.buyQty || 1, 10);
      const getQty = parseInt(goal.getQty || 1, 10);
      const mode = goal.bxgyMode || "cart";

      const buyVariantIds = (goal.buyProducts || []).map(p =>
        Number(p.id.split("/").pop())
      );
      const getVariantIds = (goal.getProducts || []).map(p =>
        Number(p.id.split("/").pop())
      );

      let condition = false;

      switch (mode) {
        case "product": {
          const qty = cart.items
            .filter(
              i =>
                !i.properties?.isBXGYGift &&
                buyVariantIds.includes(i.variant_id)
            )
            .reduce((a, i) => a + i.quantity, 0);

          condition = qty >= buyQty;
          break;
        }

        case "collection": {
          let ids = [];
          for (const col of goal.buyCollections)
            ids.push(...(await getCollectionProductIds(col.handle)));

          const qty = cart.items
            .filter(i => !i.properties?.isBXGYGift && ids.includes(i.product_id))
            .reduce((a, i) => a + i.quantity, 0);

          condition = qty >= buyQty;
          break;
        }

        case "spend_any_collection": {
          let ids = [];
          for (const col of goal.buyCollections)
            ids.push(...(await getCollectionProductIds(col.handle)));

          const spend = cart.items
            .filter(i => ids.includes(i.product_id))
            .reduce((sum, i) => sum + i.price * i.quantity, 0) / 100;

          condition = spend >= goal.spendAmount;
          break;
        }

        case "all": {
          const qty = cart.items
            .filter(i => !i.properties?.isBXGYGift)
            .reduce((a, i) => a + i.quantity, 0);

          condition = qty >= buyQty;
          break;
        }
      }

      if (condition) {
        for (const vid of getVariantIds) {
          usedGiftVariantIds.add(vid);

          const existing = giftLines.find(i => i.variant_id === vid);

          if (existing) {
            if (existing.quantity !== getQty)
              ops.push(
                cartChange("change", { id: existing.key, quantity: getQty })
              );
          } else {
            ops.push(addBxgyGift(vid, getQty));
          }
        }
      }
    }

    for (const g of giftLines)
      if (!usedGiftVariantIds.has(g.variant_id))
        ops.push(removeByKey(g.key));

    await Promise.allSettled(ops);
  }

  /* -----------------------------------------------------------
     MASTER ENGINE
  ----------------------------------------------------------- */
  async function ensureUnifiedGiftEngine() {
    if (window.__isGiftInProgress || window.__isBXGYInProgress) return;

    window.__isGiftInProgress = true;
    window.__isBXGYInProgress = true;

    try {
      const data = await parseCampaignData();
      if (!data?.campaigns?.length) return;

      window.__OPTIMAIO_CAMPAIGNS__ = data;

      const freeGiftCampaign = data.campaigns
        .filter(c => c.status === "active" && c.campaignType === "tiered")
        .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))[0];

      const bxgyCampaigns = data.campaigns.filter(
        c => c.status === "active" && c.campaignType === "bxgy"
      );

      const cart = await getCart();

      await runFreeGiftEngine(cart, freeGiftCampaign);
      await runBxgyEngine(cart, bxgyCampaigns);

      document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
    } catch (err) {
      console.warn("❌ Unified gift engine error", err);
    } finally {
      window.__isGiftInProgress = false;
      window.__isBXGYInProgress = false;
    }
  }

  /* -----------------------------------------------------------
     EVENT HOOKS (single set)
  ----------------------------------------------------------- */
  const triggerUnified = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(ensureUnifiedGiftEngine, 250);
  };

  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    const res = await _fetch(...args);
    const url = typeof args[0] === "string" ? args[0] : args[0].url || "";
    if (/\/cart\/(add|change|update|clear)(\.js)?/.test(url)) {
      triggerUnified();
    }
    return res;
  };

  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener("load", () => {
      if (/\/cart\/(add|change|update|clear)(\.js)?/.test(url))
        triggerUnified();
    });
    return _open.call(this, method, url, ...rest);
  };

  /* -----------------------------------------------------------
     INITIAL LOAD
  ----------------------------------------------------------- */
  window.addEventListener("DOMContentLoaded", () => getCart());
  setTimeout(ensureUnifiedGiftEngine, 800);
})();
