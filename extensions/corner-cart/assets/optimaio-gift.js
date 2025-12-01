/* ============================================================
   OPTIMAIO CART ENGINE — FOUNDATION LAYER (PART 1)
   Shared for BXGY + Free Gift + Drawer + Progress Bar
   ============================================================ */
(() => {
  if (window.__optimaioUnifiedInit) return;
  window.__optimaioUnifiedInit = true;

  console.log("⚙️ Optimaio Unified Engine — Core Loaded");

  /* ============================================================
     GLOBAL FLAGS
  ============================================================ */
  window.__isBXGYInProgress = false;
  window.__isFreeGiftInProgress = false;

  /* Global campaign storage (BXGY + FreeGift share this) */
  window.__OPTIMAIO_CAMPAIGNS__ = null;

  /* Shared expected placeholder gifts (BXGY + Free Gift) */
  window.__expectedFreeGifts = {};   // IMPORTANT for drawer UI

  /* ============================================================
     ALWAYS–FRESH CART FETCH
  ============================================================ */
  let currentFetch = null;

  async function getFreshCart() {
    if (currentFetch) return currentFetch;

    currentFetch = fetch("/cart.js", { cache: "no-store" })
      .then((res) => res.json())
      .finally(() => (currentFetch = null));

    return currentFetch;
  }
  window.__optimaioGetCart = getFreshCart;

  /* ============================================================
     CART CHANGE WRAPPER (add/change/remove)
  ============================================================ */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const WAIT =
    navigator.connection?.effectiveType?.includes("2g") ||
    navigator.connection?.rtt > 600
      ? 200
      : 80;

  async function cartChange(action, payload) {
    await fetch(`/cart/${action}.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    await sleep(WAIT);
  }
  window.__optimaioCartChange = cartChange;

  /* ============================================================
     BROADCAST CART UPDATE EVENT
  ============================================================ */
  async function broadcastCart() {
    const cart = await getFreshCart();

    document.dispatchEvent(
      new CustomEvent("optimaio:cart:updated", { detail: cart })
    );

    return cart;
  }
  window.__optimaioRefreshCart = broadcastCart;

  /* ============================================================
     FETCH INTERCEPTOR (detect add/change/remove)
  ============================================================ */
  const nativeFetch = window.fetch;

  window.fetch = async (...args) => {
    const res = await nativeFetch(...args);

    const url =
      typeof args[0] === "string" ? args[0] : args[0]?.url || "";

    if (/\/cart\/(add|change|update|clear)(\.js)?/.test(url)) {
      document.dispatchEvent(
        new CustomEvent("optimaio:cart:refresh")
      );
    }

    return res;
  };

  /* ============================================================
     XHR INTERCEPTOR
  ============================================================ */
  const _open = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener("load", () => {
      if (
        typeof url === "string" &&
        /\/cart\/(add|change|update|clear)(\.js)?/.test(url)
      ) {
        document.dispatchEvent(
          new CustomEvent("optimaio:cart:refresh")
        );
      }
    });

    return _open.call(this, method, url, ...rest);
  };

  /* ============================================================
     MASTER CART REFRESH DISPATCHER (NO LOOP)
  ============================================================ */
  let lastRun = 0;
  document.addEventListener("optimaio:cart:refresh", () => {
    const now = Date.now();

    // Prevent rapid-fire loops
    if (now - lastRun < 80) return;
    lastRun = now;

    /* Run BXGY first */
    if (window.__optimaioRunBxgy && !window.__isBXGYInProgress) {
      window.__optimaioRunBxgy();
    }

    /* Run Free Gift second */
    if (window.__optimaioRunFreeGift && !window.__isFreeGiftInProgress) {
      window.__optimaioRunFreeGift();
    }

    /* Update cart drawer & progress bar listeners */
    broadcastCart();
  });
})();


/* ============================================================
   OPTIMAIO BXGY ENGINE (PART 2)
   Unified + Placeholder Support + Collection Logic
   (Exact previous behavior — no modifications)
   ============================================================ */
(() => {
  if (window.__optimaioBxgyInit) return;
  window.__optimaioBxgyInit = true;

  console.log("🎁 BXGY Engine Loaded (Unified Mode)");

  /* SHORTCUTS */
  const getCart = window.__optimaioGetCart;
  const cartChange = window.__optimaioCartChange;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const WAIT =
    navigator.connection?.effectiveType?.includes("2g") ||
    navigator.connection?.rtt > 600
      ? 200
      : 80;

  const addToCart = (id, qty = 1) =>
    cartChange("add", {
      id,
      quantity: qty,
      properties: { isBXGYGift: "true" },
    });

  const removeByKey = (key) =>
    cartChange("change", { id: key, quantity: 0 });

  /* CAMPAIGN CACHE */
  window.__bxgyCampaignCache = window.__bxgyCampaignCache || {
    data: null,
    time: 0,
  };

  async function parseCampaignData() {
    const now = Date.now();
    const cache = window.__bxgyCampaignCache;

    if (cache.data && now - cache.time < 60000) return cache.data;

    try {
      const res = await fetch("/apps/optimaio-cart", {
        cache: "no-store",
      });
      const json = await res.json();

      console.log("📦 BXGY Campaigns Loaded:", json);

      cache.data = json;
      cache.time = now;

      window.__OPTIMAIO_CAMPAIGNS__ = json; // used by progress bar

      return json;
    } catch (err) {
      console.warn("⚠️ BXGY Campaign Fetch Failed", err);
      return cache.data || null;
    }
  }

  /* ALWAYS-FRESH COLLECTION PRODUCT IDS */
  async function getCollectionProductIds(handle) {
    console.log(`🔍 Fetching collection: ${handle}`);

    let ids = [];
    let page = 1;

    while (true) {
      const res = await fetch(
        `/collections/${handle}/products.json?limit=250&page=${page}&t=${Date.now()}`,
        { cache: "no-store" }
      );
      const json = await res.json();

      if (!json.products?.length) break;

      json.products.forEach((p) => ids.push(p.id));

      if (json.products.length < 250) break;
      page++;
    }

    console.log(`📦 Collection ${handle} IDs:`, ids.length);
    return ids;
  }

  /* ============================================================
     BXGY MAIN ENGINE
     EXACT previous logic — just loop-safe
     ============================================================ */
  async function ensureBxgyGift() {
    if (window.__isBXGYInProgress) return;
    window.__isBXGYInProgress = true;

    console.log("🔄 BXGY Check Starting…");

    try {
      const data = await parseCampaignData();
      if (!data?.campaigns?.length) {
        console.log("⛔ No BXGY campaigns found");
        return;
      }

      const bxgyCampaigns = data.campaigns.filter(
        (c) => c.campaignType === "bxgy" && c.status === "active"
      );

      if (!bxgyCampaigns.length) {
        console.log("⛔ No active BXGY campaigns");
        return;
      }

      const cart = await getCart();
      const giftLines = cart.items.filter((i) => i.properties?.isBXGYGift);

      let usedGiftIds = new Set();
      const ops = [];

      /* PROCESS EACH ACTIVE BXGY CAMPAIGN */
      for (const bxgy of bxgyCampaigns) {
        const goal = bxgy.goals?.[0];
        if (!goal) continue;

        const buyQty = parseInt(goal.buyQty || 1, 10);
        const getQty = parseInt(goal.getQty || 1, 10);
        const mode = goal.bxgyMode || "cart";

        console.log(`➡️ BXGY Mode: ${mode}`);

        const getProducts = (goal.getProducts || []).map((p) => ({
          id: Number(p.id.split("/").pop()),
          title: p.productTitle,
          image: p.image?.url,
        }));

        const buyVariantIds = (goal.buyProducts || []).map((p) =>
          Number(p.id.split("/").pop())
        );

        /* COUNT ELIGIBLE ITEMS */
        let eligible = 0;

        if (mode === "product") {
          eligible = cart.items
            .filter(
              (i) =>
                !i.properties?.isBXGYGift &&
                buyVariantIds.includes(i.variant_id)
            )
            .reduce((a, i) => a + i.quantity, 0);

          console.log(`🟠 product → qty: ${eligible}/${buyQty}`);
        }

        if (mode === "collection") {
          let collectionIds = [];
          for (const col of goal.buyCollections) {
            const ids = await getCollectionProductIds(col.handle);
            collectionIds.push(...ids);
          }

          eligible = cart.items
            .filter(
              (i) =>
                !i.properties?.isBXGYGift &&
                collectionIds.includes(i.product_id)
            )
            .reduce((a, i) => a + i.quantity, 0);

          console.log(`🟢 collection → qty: ${eligible}/${buyQty}`);
        }

        if (mode === "spend_any_collection") {
          let ids = [];
          for (const col of goal.buyCollections) {
            const x = await getCollectionProductIds(col.handle);
            ids.push(...x);
          }

          const totalSpend = cart.items
            .filter(
              (i) =>
                !i.properties?.isBXGYGift &&
                ids.includes(i.product_id)
            )
            .reduce((a, i) => a + i.price * i.quantity, 0);

          eligible = totalSpend / 100;

          console.log(
            `💰 spend_any_collection → ₹${eligible} / Needed ₹${goal.spendAmount}`
          );
        }

        if (mode === "all") {
          eligible = cart.items
            .filter((i) => !i.properties?.isBXGYGift)
            .reduce((a, i) => a + i.quantity, 0);

          console.log(`🔵 all → qty: ${eligible}/${buyQty}`);
        }

        const conditionMet =
          mode === "spend_any_collection"
            ? eligible >= (goal.spendAmount || 0)
            : eligible >= buyQty;

        if (!conditionMet) {
          console.log("❌ Condition NOT met for this BXGY");
          continue;
        }

        console.log("✅ BXGY Condition MET");

        /* ADD GIFTS + PLACEHOLDERS */
        for (const gift of getProducts) {
          usedGiftIds.add(gift.id);

          window.__expectedFreeGifts[gift.id] = {
            title: gift.title,
            image: gift.image,
          };

          document.dispatchEvent(
            new CustomEvent("optimaio:cart:refresh")
          );

          const existing = giftLines.find(
            (i) => i.variant_id === gift.id
          );

          if (existing) {
            if (existing.quantity !== getQty) {
              ops.push(
                cartChange("change", {
                  id: existing.key,
                  quantity: getQty,
                })
              );
            }
          } else {
            ops.push(addToCart(gift.id, getQty));
          }
        }
      }

      /* REMOVE UNUSED GIFTS */
      for (const g of giftLines) {
        if (!usedGiftIds.has(g.variant_id)) {
          console.log("🗑 Removing old BXGY gift:", g.variant_id);
          ops.push(removeByKey(g.key));
        }
      }

      await Promise.allSettled(ops);

      document.dispatchEvent(
        new CustomEvent("optimaio:cart:refresh")
      );

      console.log("🎉 BXGY Completed Successfully");
    } catch (err) {
      console.warn("❌ BXGY Engine Error:", err);
    } finally {
      window.__isBXGYInProgress = false;
    }
  }

  window.__optimaioRunBxgy = ensureBxgyGift;
})();


/* ============================================================
   OPTIMAIO FREE GIFT ENGINE (PART 3)
   Unified with BXGY + Shared Placeholder System
   EXACT previous logic — loop-safe — tiered compatible
   ============================================================ */
(() => {
  if (window.__optimaioFreeGiftInit) return;
  window.__optimaioFreeGiftInit = true;

  console.log("🎁 Free Gift Engine Loaded (Unified Mode)");

  /* SHORTCUTS */
  const getCart = window.__optimaioGetCart;
  const cartChange = window.__optimaioCartChange;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const WAIT =
    navigator.connection?.effectiveType?.includes("2g") ||
    navigator.connection?.rtt > 600
      ? 200
      : 80;

  const addToCart = (id) =>
    cartChange("add", {
      id,
      quantity: 1,
      properties: { isFreeGift: "true" },
    });

  const fixQty = (key) =>
    cartChange("change", { id: key, quantity: 1 });

  const removeGift = (key) =>
    cartChange("change", { id: key, quantity: 0 });

  /* CAMPAIGN CACHE */
  window.__freeGiftCampaignCache = window.__freeGiftCampaignCache || {
    data: null,
    time: 0,
  };

  async function parseCampaign() {
    const now = Date.now();
    const cache = window.__freeGiftCampaignCache;

    if (cache.data && now - cache.time < 60000) return cache.data;

    try {
      const res = await fetch("/apps/optimaio-cart", { cache: "no-store" });
      const json = await res.json();

      console.log("📦 Free Gift Campaign Loaded:", json);

      cache.data = json;
      cache.time = now;
      return json;
    } catch (err) {
      console.warn("❌ Free Gift: Could not fetch campaigns", err);
      return cache.data || null;
    }
  }

  /* -----------------------------------------------------------
     POPUP BUILDER (lazy load)
  ----------------------------------------------------------- */
  requestIdleCallback(() => {
    if (document.getElementById("optimaio-gift-popup")) return;

    const html = `
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
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);

    const css = document.createElement("style");
    css.textContent = `
      .optimaio-gift-popup{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:11000;font-family:Inter,sans-serif;}
      .optimaio-gift-popup__inner{background:#fff;padding:20px;border-radius:16px;width:90%;max-width:420px;text-align:center;}
      .optimaio-gift-option{display:inline-block;margin:10px;cursor:pointer;border:2px solid transparent;border-radius:10px;padding:6px;background:#fff7f8;width:120px;transition:all .2s;}
      .optimaio-gift-option.selected{border-color:#d48b8b;background:#fdeaea;}
      .optimaio-btn{background:#000;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;margin:8px;}
      .optimaio-btn--light{background:#eee;color:#333;}
    `;
    document.head.appendChild(css);
  });

  /* POPUP HANDLER */
  function showGiftPopup(products, limit) {
    const popup = document.getElementById("optimaio-gift-popup");
    const list = document.getElementById("optimaio-gift-options");
    const maxEl = document.getElementById("optimaio-max-gifts");
    const err = document.getElementById("optimaio-gift-error");

    maxEl.textContent = limit;
    err.style.display = "none";

    list.innerHTML = products
      .map(
        (p) => `
      <div class="optimaio-gift-option" data-id="${p.id}">
        <img src="${p.image || ""}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;">
        <p>${p.title}</p>
      </div>`
      )
      .join("");

    popup.style.display = "flex";

    const selected = new Set();

    list.querySelectorAll(".optimaio-gift-option").forEach((opt) => {
      opt.onclick = () => {
        const id = Number(opt.dataset.id);

        if (selected.has(id)) {
          selected.delete(id);
          opt.classList.remove("selected");
        } else if (selected.size < limit) {
          selected.add(id);
          opt.classList.add("selected");
        } else {
          err.textContent = `Select max ${limit} gifts`;
          err.style.display = "block";
          setTimeout(() => (err.style.display = "none"), 1500);
        }
      };
    });

    document.getElementById("optimaio-cancel-gifts").onclick = () =>
      (popup.style.display = "none");

    document.getElementById("optimaio-confirm-gifts").onclick = async () => {
      popup.style.display = "none";

      for (const vid of selected) {
        await addToCart(vid);
      }

      ensureFreeGift();
    };
  }

  /* ============================================================
     MAIN FREE GIFT ENGINE — EXACT PREVIOUS LOGIC
     ============================================================ */
  async function ensureFreeGift() {
    if (window.__isFreeGiftInProgress) return;
    window.__isFreeGiftInProgress = true;

    console.log("🔄 Free Gift Check Starting…");

    try {
      const data = await parseCampaign();
      if (!data?.campaigns?.length) {
        console.log("⛔ No free gift campaigns");
        return;
      }

      /* ✔ FIX: Now correctly picking tiered + free_product */
      const campaign = data.campaigns.find(
        (c) => c.campaignType === "tiered" && c.status === "active"
      );

      if (!campaign) {
        console.log("⛔ No active tiered free gift campaign");
        return;
      }

      const cart = await getCart(true);

      const goal = campaign.goals?.find((g) => g.type === "free_product");
      if (!goal?.products?.length) return;

      const giftProducts = goal.products.map((p) => ({
        id: Number(p.id.split("/").pop()),
        title: p.productTitle,
        image: p.image?.url,
      }));

      const giftIds = giftProducts.map((g) => g.id);

      const giftLines = cart.items.filter((i) => i.properties?.isFreeGift);
      const nonGift = cart.items.filter((i) => !giftIds.includes(i.variant_id));

      const subtotal =
        nonGift.reduce((a, i) => a + i.final_line_price, 0) / 100;

      const qty = nonGift.reduce((a, i) => a + i.quantity, 0);

      console.log("🧮 Free Gift → subtotal:", subtotal, "qty:", qty);

      const type = campaign.trackType;
      const targetAmount = parseFloat(goal.target || goal.thresholdAmount || 0);
      const targetQty = parseInt(goal.target || goal.minQty || 0, 10);

      const eligible =
        type === "quantity" ? qty >= targetQty : subtotal >= targetAmount;

      console.log("🎯 Free Gift Condition:", eligible);

      /* Enforce quantity 1 */
      for (const g of giftLines)
        if (g.quantity !== 1) await fixQty(g.key);

      if (eligible && nonGift.length) {
        const limit = goal.giftQty || 1;

        if (giftIds.length === 1) {
          const vid = giftIds[0];
          if (!giftLines.some((i) => i.variant_id === vid)) {
            console.log("🎁 Adding single free gift:", vid);

            window.__expectedFreeGifts[vid] = {
              title: giftProducts[0].title,
              image: giftProducts[0].image,
            };

            document.dispatchEvent(
              new CustomEvent("optimaio:cart:refresh")
            );

            await addToCart(vid);
          }
        } else if (!giftLines.length) {
          console.log("🎁 Showing free gift popup…");
          showGiftPopup(giftProducts, limit);
        }
      } else {
        for (const g of giftLines) {
          console.log("🗑 Removing free gift:", g.variant_id);
          await removeGift(g.key);
        }
      }

      document.dispatchEvent(
        new CustomEvent("optimaio:cart:refresh")
      );

      console.log("🎉 Free Gift Check Completed");
    } catch (err) {
      console.warn("❌ Free Gift Error:", err);
    } finally {
      window.__isFreeGiftInProgress = false;
    }
  }

  window.__optimaioRunFreeGift = ensureFreeGift;
})();


/* ============================================================
   OPTIMAIO MASTER INITIALIZER (PART 4)
   Runs BXGY + Free Gift + Drawer in correct order
   Safe, loop-free, optimized
   ============================================================ */

(() => {
  if (window.__optimaioMasterInit) return;
  window.__optimaioMasterInit = true;

  console.log("🚀 Optimaio Unified Master Init Loaded");

  /* MASTER DEBOUNCER (prevents infinite loops) */
  let masterTimer = null;

  async function runMasterRefresh() {
    clearTimeout(masterTimer);

    masterTimer = setTimeout(async () => {
      console.log("🔄 MASTER: Running BXGY + FreeGift + Drawer");

      /* 1️⃣ Run BXGY */
      if (window.__optimaioRunBxgy) {
        console.log("➡️ MASTER: Trigger BXGY");
        await window.__optimaioRunBxgy();
      }

      /* 2️⃣ Run Free Gift */
      if (window.__optimaioRunFreeGift) {
        console.log("➡️ MASTER: Trigger Free Gift");
        await window.__optimaioRunFreeGift();
      }

      /* 3️⃣ Update drawer UI */
      if (window.__optimaioRefreshCart) {
        console.log("➡️ MASTER: Refresh Drawer");
        await window.__optimaioRefreshCart();
      }

      console.log("✅ MASTER REFRESH COMPLETE");
    }, 120); // Safe delay
  }

  window.__optimaioMasterRefresh = runMasterRefresh;

  /* LISTEN TO CART EVENTS from Part 1 */
  document.addEventListener("optimaio:cart:refresh", () => {
    console.log("📢 EVENT: optimaio:cart:refresh → Master");
    runMasterRefresh();
  });

  /* FIRST RUN ON PAGE LOAD */
  window.addEventListener("DOMContentLoaded", () => {
    console.log("✨ DOM Ready → Initial Master Refresh");
    runMasterRefresh();
  });

  /* SECOND RUN after theme scripts load */
  setTimeout(() => {
    console.log("✨ Secondary Init After Page Load");
    runMasterRefresh();
  }, 600);

})();
