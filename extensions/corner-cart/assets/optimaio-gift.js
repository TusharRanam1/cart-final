/* ============================================================
      OPTIMAIO UNIFIED GIFT ENGINE
   - Free Gift Engine (popup + multi-gift)
   - BXGY Engine (multi-campaign)
   - Shared hooks, shared cart, shared campaign
   - No double fetch, no double triggers
============================================================= */

(() => {
  if (window.__OptimaioGiftEngineInit) return;
  window.__OptimaioGiftEngineInit = true;

  console.log("🎁🧮 Optimaio Unified Gift Engine initializing…");

  /* -----------------------------------------------------------
        GLOBAL FLAGS
  ----------------------------------------------------------- */
  window.__isFreeGiftRunning = false;
  window.__isBXGYRunning = false;
  window.__optimaioPopupOpen = false;

  /* -----------------------------------------------------------
   SHARED GIFT STATE (Single Source of Truth)
----------------------------------------------------------- */
  window.OptimaioGiftState = window.OptimaioGiftState || {
    gifts: {},      // keep for engine safety (do NOT remove)
    campaigns: {}   // NEW: UI + campaign state
  };


  let debounceTimer = null;


  function updateCampaignState({
    campaignId,
    isEligible,
    maxQty,
    eligibleGifts,
    selectedGifts
  }) {
    const selectedQty = Math.min(selectedGifts.length, maxQty);
    const isFulfilled = selectedQty >= maxQty;
    const hasChoices = eligibleGifts.length > 1;
  
    window.OptimaioGiftState.campaigns[campaignId] = {
      id: campaignId,
  
      state: !isEligible
        ? "locked"
        : isFulfilled
          ? "unlocked"
          : "eligible",
  
      fulfillment: !isFulfilled
        ? "none"
        : hasChoices
          ? "choice"
          : "auto",
  
      maxQty,
  
      gifts: {
        eligible: eligibleGifts,
        selected: selectedGifts.slice(0, maxQty)
      },
  
      canChangeGift: isEligible && isFulfilled && hasChoices
    };
  }
  

  /* -----------------------------------------------------------
        🔥 EARLY CAMPAIGN PREFETCH (SAFE)
        - Deduped by pending
        - Uses session/memory cache
  ----------------------------------------------------------- */
  getCampaignData().catch(() => null);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WAIT =
    navigator.connection?.effectiveType?.includes("2g") ||
      navigator.connection?.rtt > 600 ? 200 : 80;

  /* -----------------------------------------------------------
        SHARED CART HELPERS
  ----------------------------------------------------------- */
  async function getCart() {
    return await window.OptimaioCartController.getCart();
  }

  async function cartChange(action, payload) {
    await fetch(`/cart/${action}.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    await sleep(WAIT);
  }

  const addFreeGift = id =>
    cartChange("add", { id, quantity: 1, properties: { isFreeGift: "true" } });

  const addBxgyGift = (id, qty, campaignId) =>
    cartChange("add", { id, quantity: qty, properties: { isBXGYGift: "true", bxgyCampaignId: campaignId } });

  const updateQtyToOne = key =>
    cartChange("change", { id: key, quantity: 1 });

  const removeByKey = key =>
    cartChange("change", { id: key, quantity: 0 });

  /* -----------------------------------------------------------
        SHARED CAMPAIGN FETCHER
  ----------------------------------------------------------- */
  async function getCampaign() {
    const start = performance.now();
    try {
      if (!navigator.onLine && window.__OPTIMIAO_FETCH_STATE__?.data) {
        return window.__OPTIMIAO_FETCH_STATE__.data;
      }

      const data = await getCampaignData();
      const duration = Math.round(performance.now() - start);

      console.log(
        duration < 20
          ? "⚡ Campaign loaded from cache"
          : `⚡ Campaign fetched in ${duration}ms`,
        data
      );
      return data;
    } catch (err) {
      console.warn("❌ Campaign fetch failed", err);
      return null;
    }
  }


  function createGiftPlaceholders(products, maxQty = 1) {
    window.__expectedFreeGifts = window.__expectedFreeGifts || {};

    products.slice(0, maxQty).forEach(p => {
      const vid = Number(p.id.split("/").pop());

      window.__expectedFreeGifts[vid] = {
        title: p.productTitle || p.title || "Free Gift",
        image: p.image?.url || ""
      };
    });

    // 🔄 Re-render drawer immediately
    document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
  }

  /* -----------------------------------------------------------
        FREE GIFT POPUP (Created once using requestIdleCallback)
  ----------------------------------------------------------- */
  requestIdleCallback(() => {
    if (document.getElementById("optimaio-gift-popup")) return;

    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div id="optimaio-gift-popup" class="optimaio-gift-popup" style="display:none;">
        <div class="optimaio-gift-popup__inner">
          <h3>🎁 Choose Your Free Gifts</h3>
          <p>Select up to <span id="optimaio-max-gifts">1</span> gifts:</p>
          <div id="optimaio-gift-options"></div>
          <p id="optimaio-gift-error" style="color:#c00;font-size:13px;display:none;"></p>
          <div class="optimaio-gift-popup__actions">
            <button id="optimaio-cancel-gifts" class="optimaio-btn optimaio-btn--light">Cancel</button>
            <button id="optimaio-confirm-gifts" class="optimaio-btn">Confirm</button>
          </div>
        </div>
      </div>
      `
    );

    const style = document.createElement("style");
    style.textContent = `
      .optimaio-gift-popup{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:12000;}
      .optimaio-gift-popup__inner{background:#fff;padding:20px;border-radius:16px;width:90%;max-width:420px;text-align:center;}
      .optimaio-gift-option{display:inline-block;margin:10px;cursor:pointer;border:2px solid transparent;border-radius:10px;padding:6px;background:#fff7f8;width:120px;}
      .optimaio-gift-option.selected{border-color:#d48b8b;background:#fdeaea;}
      .optimaio-btn{background:#000;color:#fff;padding:10px 16px;border-radius:8px;font-weight:600;margin:8px;cursor:pointer;}
      .optimaio-btn--light{background:#eee;color:#333;}
    `;
    document.head.appendChild(style);
  });

  /* -----------------------------------------------------------
        FREE GIFT: POPUP HANDLER
  ----------------------------------------------------------- */
  function showGiftPopup(products, maxQty) {
    if (window.__optimaioPopupOpen) return;
    if (!document.querySelector('.optimaio-cart-drawer.open')) return;  // <— Correct selector

    const popup = document.getElementById("optimaio-gift-popup");
    const container = document.getElementById("optimaio-gift-options");
    const maxEl = document.getElementById("optimaio-max-gifts");
    const error = document.getElementById("optimaio-gift-error");

    maxEl.textContent = maxQty;
    error.style.display = "none";

    container.innerHTML = products
      .map(p => {
        const vid = Number(p.id.split("/").pop());
        return `
        <div class="optimaio-gift-option" data-id="${vid}">
          <img src="${p.image?.url || p.featured_image || ""}" width="80" height="80">
          <p>${p.productTitle || p.title}</p>
        </div>
      `;
      })
      .join("");

    popup.style.display = "flex";
    window.__optimaioPopupOpen = true;

    const selected = new Set();

    container.querySelectorAll(".optimaio-gift-option").forEach(el => {
      el.onclick = () => {
        const id = Number(el.dataset.id);
        if (selected.has(id)) {
          selected.delete(id);
          el.classList.remove("selected");
        } else if (selected.size < maxQty) {
          selected.add(id);
          el.classList.add("selected");
        } else {
          error.textContent = `You can select only ${maxQty} gifts.`;
          error.style.display = "block";
          setTimeout(() => (error.style.display = "none"), 1200);
        }
      };
    });

    document.getElementById("optimaio-cancel-gifts").onclick = () => {
      popup.style.display = "none";
      window.__optimaioPopupOpen = false;
    };

    document.getElementById("optimaio-confirm-gifts").onclick = async () => {
      popup.style.display = "none";
      window.__optimaioPopupOpen = false;

      // for (const vid of selected) await addFreeGift(vid);

      const selectedProducts = products.filter(p =>
        selected.has(Number(p.id.split("/").pop()))
      );

      createGiftPlaceholders(selectedProducts, maxQty);

      for (const vid of selected) {
        await addFreeGift(vid);
      }


      runFreeGiftEngine();
    };
  }



  /* -----------------------------------------------------------
        BXGY POPUP HANDLER
----------------------------------------------------------- */
  function showBxgyPopup(products, maxQty, confirmCallback) {
    if (window.__optimaioPopupOpen) return;
    if (!document.querySelector('.optimaio-cart-drawer.open')) return;  // <— Correct selector

    const popup = document.getElementById("optimaio-gift-popup");
    const container = document.getElementById("optimaio-gift-options");
    const maxEl = document.getElementById("optimaio-max-gifts");
    const error = document.getElementById("optimaio-gift-error");

    maxEl.textContent = maxQty;
    error.style.display = "none";

    container.innerHTML = products
      .map(p => {
        const vid = Number(p.id.split("/").pop());
        return `
        <div class="optimaio-gift-option" data-id="${vid}">
          <img src="${p.image?.url || p.featured_image || ""}" width="80">
          <p>${p.productTitle || p.title}</p>
        </div>
      `;
      })
      .join("");

    popup.style.display = "flex";
    window.__optimaioPopupOpen = true;

    const selected = new Set();

    container.querySelectorAll(".optimaio-gift-option").forEach(el => {
      el.onclick = () => {
        const id = Number(el.dataset.id);
        if (selected.has(id)) {
          selected.delete(id);
          el.classList.remove("selected");
        } else if (selected.size < maxQty) {
          selected.add(id);
          el.classList.add("selected");
        } else {
          error.textContent = `You can select only ${maxQty} gifts.`;
          error.style.display = "block";
          setTimeout(() => (error.style.display = "none"), 1200);
        }
      };
    });

    document.getElementById("optimaio-cancel-gifts").onclick = () => {
      popup.style.display = "none";
      window.__optimaioPopupOpen = false;
    };

    document.getElementById("optimaio-confirm-gifts").onclick = async () => {
      popup.style.display = "none";
      window.__optimaioPopupOpen = false;
      await confirmCallback(Array.from(selected));
    };
  }



  /* -----------------------------------------------------------
        FREE GIFT ENGINE
  ----------------------------------------------------------- */
  async function runFreeGiftEngine() {
    if (window.__isFreeGiftRunning) return;
    if (window.__optimaioPopupOpen) return;  // ⭐ ADD THIS LINE
    window.__isFreeGiftRunning = true;

    try {
      const data = await getCampaign();
      if (!data?.campaigns?.length) return;

      const campaign = data.campaigns
        .filter(c => c.status === "active" && c.campaignType === "tiered")[0];

      if (!campaign) return;

      const goal = campaign.goals?.find(g => g.type === "free_product");
      if (!goal?.products?.length) return;

      const giftVariantIds = goal.products.map(p =>
        Number(p.id.split("/").pop())
      );

      const cart = await getCart();

      const giftLines = cart.items.filter(i => i.properties?.isFreeGift === "true");

      const items = cart.items.filter(
        i => !i.properties?.isFreeGift && !i.properties?.isBXGYGift
      );

      const subtotal = items.reduce((a, i) => a + i.final_line_price, 0) / 100;
      const totalQty = items.reduce((a, i) => a + i.quantity, 0);

      const condition =
        campaign.trackType === "quantity"
          ? totalQty >= Number(goal.target)
          : subtotal >= Number(goal.target);

      

      // 🔐 UPDATE FREE GIFT STATE
      updateCampaignState({
        campaignId: campaign.id,
        campaignType: "tiered",
        isEligible: condition,
        maxQty: goal.giftQty || 1,
        eligibleGifts: giftVariantIds,
        selectedGifts: giftLines.map(i => i.variant_id)
      });



      // Keep free gifts always quantity = 1
      for (const line of giftLines)
        if (line.quantity !== 1) await updateQtyToOne(line.key);

      if (condition && items.length > 0) {
        if (goal.products.length === 1) {
          const vid = giftVariantIds[0];
          // if (!giftLines.some(i => i.variant_id === vid)) {
          //   await addFreeGift(vid);
          // }

          if (!giftLines.some(i => i.variant_id === vid)) {
            createGiftPlaceholders([goal.products[0]], 1);
            await addFreeGift(vid);
          }

        } else if (!giftLines.length) {
          showGiftPopup(goal.products, goal.giftQty || 1);
        }
      } else {
        for (const g of giftLines) await removeByKey(g.key);
      }
    } finally {
      window.__isFreeGiftRunning = false;
    }
  }

  /* -----------------------------------------------------------
        BXGY ENGINE
  ----------------------------------------------------------- */
  async function runBxgyEngine() {
    if (window.__isBXGYRunning) return;
    if (window.__optimaioPopupOpen) return;  // ⭐ ADD THIS LINE
    window.__isBXGYRunning = true;

    try {
      const data = await getCampaign();
      if (!data?.campaigns?.length) return;

      const bxgyCampaigns = data.campaigns.filter(
        c => c.status === "active" && c.campaignType === "bxgy"
      );

      if (!bxgyCampaigns.length) return;

      const cart = await getCart();
      const giftLines = cart.items.filter(
        i => i.properties?.isBXGYGift && i.properties?.bxgyCampaignId
      );

      const ops = [];
      const usedGiftIds = new Set();

      async function getCollectionIds(handle) {
        const res = await fetch(
          `/collections/${handle}/products.json?limit=250&t=${Date.now()}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        return json.products.map(p => p.id);
      }

      for (const bxgy of bxgyCampaigns) {
        const goal = bxgy.goals?.[0];
        if (!goal) continue;

        const buyQty = Number(goal.buyQty || 1);
        const getQty = Number(goal.getQty || 1);
        const mode = goal.bxgyMode || "cart";

        const buyVariantIds = (goal.buyProducts || []).map(p =>
          Number(p.id.split("/").pop())
        );
        const getVariantIds = (goal.getProducts || []).map(p =>
          Number(p.id.split("/").pop())
        );

        // ✅ ADD HERE
        const campaignGiftLines = giftLines.filter(
          i =>
            getVariantIds.includes(i.variant_id) &&
            i.properties?.bxgyCampaignId === bxgy.id
        );


        // campaignGiftLines.forEach(line => {
        //   usedGiftIds.add(line.variant_id);
        // });


        let condition = false;

        const items = cart.items.filter(
          i => !i.properties?.isBXGYGift && !i.properties?.isFreeGift
        );

        /* PRODUCT MODE */
        if (mode === "product") {
          const qty = items
            .filter(i => buyVariantIds.includes(i.variant_id))
            .reduce((a, i) => a + i.quantity, 0);

          condition = qty >= buyQty;
        }

        /* COLLECTION MODE */
        else if (mode === "collection") {
          let ids = [];
          for (const col of goal.buyCollections)
            ids.push(...(await getCollectionIds(col.handle)));

          const qty = items
            .filter(i => ids.includes(i.product_id))
            .reduce((a, i) => a + i.quantity, 0);

          condition = qty >= buyQty;
        }

        /* SPEND ANY COLLECTION */
        else if (mode === "spend_any_collection") {
          let ids = [];
          for (const col of goal.buyCollections)
            ids.push(...(await getCollectionIds(col.handle)));

          const spend =
            items
              .filter(i => ids.includes(i.product_id))
              .reduce((total, i) => total + i.price * i.quantity, 0) / 100;

          condition = spend >= Number(goal.spendAmount);
        }

        /* ALL MODE */
        else if (mode === "all") {
          const qty = items.reduce((a, i) => a + i.quantity, 0);
          condition = qty >= buyQty;
        }



        // 🔐 UPDATE BXGY GIFT STATE
        updateCampaignState({
          campaignId: bxgy.id,
          campaignType: "bxgy",
          isEligible: condition,
          maxQty: getQty,
          eligibleGifts: getVariantIds,
          selectedGifts: campaignGiftLines.map(i => i.variant_id)
        });



        /* APPLY GIFTS */
        /* APPLY GIFTS */
        /* APPLY GIFTS */
        if (condition) {
          // ✅ Only protect gifts when campaign is valid
          campaignGiftLines.forEach(line => {
            usedGiftIds.add(line.variant_id);
          });


          // 🟢 MULTI BXGY → popup only if NO gift from THIS campaign exists
          if (getVariantIds.length > 1 && campaignGiftLines.length === 0) {
            showBxgyPopup(goal.getProducts, getQty, async selectedIds => {

              window.__expectedFreeGifts = window.__expectedFreeGifts || {};

              for (const vid of selectedIds) {
                usedGiftIds.add(vid);

                const productData = goal.getProducts.find(
                  p => Number(p.id.split("/").pop()) === vid
                );

                window.__expectedFreeGifts[vid] = {
                  title: productData?.productTitle || productData?.title,
                  image: productData?.image?.url
                };

                await addBxgyGift(vid, 1, bxgy.id);

              }

              document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
            });

            continue; // ⛔ never auto-add multi BXGY
          }

          // 🟢 SINGLE BXGY → auto add (Free Gift behavior)
          if (getVariantIds.length === 1) {
            const vid = getVariantIds[0];
            usedGiftIds.add(vid);

            const line = campaignGiftLines.find(i => i.variant_id === vid);

            if (!line) {
              await addBxgyGift(vid, getQty, bxgy.id);
            } else if (line.quantity !== getQty) {
              await cartChange("change", { id: line.key, quantity: getQty });
            }
          }
        }
      }

      /* REMOVE UNUSED BXGY GIFTS */
      for (const g of giftLines)
        if (!usedGiftIds.has(g.variant_id)) ops.push(removeByKey(g.key));

      await Promise.allSettled(ops);
    } finally {
      window.__isBXGYRunning = false;
    }
  }

  /* -----------------------------------------------------------
        MASTER ENGINE
  ----------------------------------------------------------- */
  async function runGiftEngine() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {

      // ✅ RESET campaign UI state each run
      window.OptimaioGiftState.campaigns = {};
      await runFreeGiftEngine();
      await runBxgyEngine();
      document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
      console.log("🎯 Final Campaign State", window.OptimaioGiftState.campaigns);


      // 🔔 Notify UI blocks (offer cards, etc.)
      document.dispatchEvent(
        new CustomEvent("optimaio:gifts:updated", {
          detail: window.OptimaioGiftState
        })
      );
    }, 150);
  }

  /* -----------------------------------------------------------
       GLOBAL CART EVENT HOOKS (GUARDED)
 ----------------------------------------------------------- */
  if (!window.__OptimaioFetchWrapped) {
    window.__OptimaioFetchWrapped = true;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url;

      if (/\/cart\/(add|change|update|clear)(\.js)?/.test(url))
        runGiftEngine();

      return res;
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.addEventListener("load", () => {
        if (/\/cart\/(add|change|update|clear)(\.js)?/.test(url))
          runGiftEngine();
      });
      return originalOpen.call(this, method, url, ...rest);
    };
  }


  document.addEventListener("submit", e => {
    const form = e.target;
    if (form.action && form.action.includes("/cart/add"))
      setTimeout(runGiftEngine, 300);
  });

  /* -----------------------------------------------------------
        INITIAL RUN
  ----------------------------------------------------------- */
  window.addEventListener("DOMContentLoaded", () => getCart());
  setTimeout(runGiftEngine, 50);
})();
