(() => {
  if (window.__bxgyInit) return;
  window.__bxgyInit = true;

  console.log("🧮 Optimaio BXGY script initializing (no cart cache)...");

  // ----------------------------
  // 🔒 STATE & HELPERS
  // ----------------------------
  window.__isBXGYInProgress = false;
  let debounceTimer = null;

  // window.__bxgyCollectionCache = window.__bxgyCollectionCache || {};
  

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WAIT =
    navigator.connection?.effectiveType?.includes("2g") ||
    navigator.connection?.rtt > 600
      ? 200
      : 80;

  // ----------------------------
  // 🛒 ALWAYS-FRESH CART FETCH
  // ----------------------------
  async function getCart() {
    const res = await fetch("/cart.js", { cache: "no-store" });
    const json = await res.json();
    return json;
  }

  async function cartChange(action, payload) {
    await fetch(`/cart/${action}.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await sleep(WAIT);
  }

  const addToCart = (id, qty = 1) =>
    cartChange("add", { id, quantity: qty, properties: { isBXGYGift: "true" } });

  const removeByKey = key =>
    cartChange("change", { id: key, quantity: 0 });

  // ----------------------------
  // 🧠 FETCH CAMPAIGN DATA (cached for 1 minute)
  // ----------------------------

async function parseCampaignData() {
  const startTime = performance.now();   // ⏱️ START TIMER

  try {
    // 🟦 Fetch via MAIN shared fetcher (NO duplicate API call)
    const data = await getCampaignDataCached();

    const endTime = performance.now();   // ⏱️ END TIMER
    const duration = Math.round(endTime - startTime);

    console.log(`⚡ BXGY Campaign (cached) fetched in ${duration} ms`, data);

    return data;

  } catch (err) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    console.warn(`⚠️ BXGY Campaign fetch failed after ${duration} ms`, err);

    return null;
  }
}



  // ----------------------------
  // 🎯 BXGY MULTI-CAMPAIGN LOGIC
  // ----------------------------
  async function ensureBxgyGift() {
    if (window.__isBXGYInProgress) return;
    window.__isBXGYInProgress = true;

    try {
      const data = await parseCampaignData();
      if (!data?.campaigns?.length) return;

      // 🌍 Make this data available to the progress bar
window.__OPTIMAIO_CAMPAIGNS__ = data;

      const bxgyCampaigns = data.campaigns.filter(
        c => c.campaignType === "bxgy" && c.status === "active"
      );
      if (!bxgyCampaigns.length) return;

      const cart = await getCart();
      const giftLines = cart.items.filter(i => i.properties?.isBXGYGift === "true");
      const usedGiftVariantIds = new Set();
      const ops = [];

      for (const bxgy of bxgyCampaigns) {
        const goal = bxgy.goals?.[0];
        if (!goal) continue;

        const buyQty = parseInt(goal.buyQty || 1, 10);
        const getQty = parseInt(goal.getQty || 1, 10);
        const bxgyMode = goal.bxgyMode || "cart";
        const getVariantIds = (goal.getProducts || []).map(p =>
          Number(p.id.split("/").pop())
        );
        const buyVariantIds = (goal.buyProducts || []).map(p =>
          Number(p.id.split("/").pop())
        );

//         async function getCollectionProductIds(handle) {
//   if (window.__bxgyCollectionCache[handle]) {
//     return window.__bxgyCollectionCache[handle];
//   }

//   let allIds = [];
//   let page = 1;

//   while (true) {
//     const res = await fetch(`/collections/${handle}/products.json?limit=250&page=${page}`);
//     const json = await res.json();

//     if (!json.products || json.products.length === 0) break;

//     json.products.forEach(p => allIds.push(p.id));

//     if (json.products.length < 250) break;
//     page++;
//   }

//   window.__bxgyCollectionCache[handle] = allIds;
//   return allIds;
// }


async function getCollectionProductIds(handle) {
  let allIds = [];
  let page = 1;

  while (true) {
    const res = await fetch(`/collections/${handle}/products.json?limit=250&page=${page}&t=${Date.now()}`, {
      cache: "no-store"
    });

    const json = await res.json();

    if (!json.products || json.products.length === 0) break;

    json.products.forEach(p => allIds.push(p.id));

    if (json.products.length < 250) break;
    page++;
  }

  return allIds;
}

        let conditionMet = false;

switch (bxgyMode) {

  /* ------------------------------------
    1️⃣ PRODUCT MODE
  ------------------------------------ */
  case "product": {
    const buyProductQty = cart.items
      .filter(i => !i.properties?.isBXGYGift && buyVariantIds.includes(i.variant_id))
      .reduce((a, i) => a + i.quantity, 0);

    console.log(`[🟠 product] Qty=${buyProductQty} / Need=${buyQty}`);
    conditionMet = buyProductQty >= buyQty;
    break;
  }

  /* ------------------------------------
    2️⃣ COLLECTION MODE  (quantity based)
  ------------------------------------ */
  case "collection": {
    let collectionProductIds = [];

    for (const col of goal.buyCollections) {
      const ids = await getCollectionProductIds(col.handle);
      collectionProductIds.push(...ids);
    }

    const buyCollectionQty = cart.items
      .filter(i => !i.properties?.isBXGYGift && collectionProductIds.includes(i.product_id))
      .reduce((a, i) => a + i.quantity, 0);

    console.log(`[🟢 collection] Qty=${buyCollectionQty} / Need=${buyQty}`);
    conditionMet = buyCollectionQty >= buyQty;
    break;
  }

  /* ------------------------------------
    3️⃣ SPEND ANY COLLECTION MODE
  ------------------------------------ */
  case "spend_any_collection": {
    let collectionProductIds = [];

    for (const col of goal.buyCollections) {
      const ids = await getCollectionProductIds(col.handle);
      collectionProductIds.push(...ids);
    }

    const spendAmount = cart.items
      .filter(i => !i.properties?.isBXGYGift && collectionProductIds.includes(i.product_id))
      .reduce((total, i) => total + (i.price * i.quantity), 0);

    console.log(`[💰 spend_any_collection] Spend=${spendAmount/100} / Need=${goal.spendAmount}`);
    conditionMet = (spendAmount / 100) >= (goal.spendAmount || 0);
    break;
  }

  /* ------------------------------------
    4️⃣ ALL MODE (any products)
  ------------------------------------ */
  case "all": {
    const allQty = cart.items
      .filter(i => !i.properties?.isBXGYGift)
      .reduce((a, i) => a + i.quantity, 0);

    console.log(`[🔵 all] Qty=${allQty} / Need=${buyQty}`);
    conditionMet = allQty >= buyQty;
    break;
  }

  default:
    console.warn("⚠️ Unknown bxgyMode:", bxgyMode);
}


        if (conditionMet && Array.isArray(goal.getProducts)) {
          for (const product of goal.getProducts) {
            const vid = Number(product.id.split("/").pop());
            usedGiftVariantIds.add(vid);

            // ✅ Store expected gift info globally (for UI refresh)
            window.__expectedFreeGifts = window.__expectedFreeGifts || {};
            window.__expectedFreeGifts[product.id] = {
              title: product.productTitle,
              image: product.image?.url,
            };

            // Trigger a re-render in the drawer
            document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));

            // Add or update gift silently
            const existingGift = giftLines.find(i => i.variant_id === vid);
            if (existingGift) {
              if (existingGift.quantity !== getQty)
                ops.push(cartChange("change", { id: existingGift.key, quantity: getQty }));
            } else {
              ops.push(addToCart(vid, getQty));
            }
          }
        }
      }

      for (const g of giftLines) {
        if (!usedGiftVariantIds.has(g.variant_id)) {
          ops.push(removeByKey(g.key));
        }
      }

      await Promise.allSettled(ops);
      document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
    } catch (err) {
      console.warn("BXGY check failed", err);
    } finally {
      window.__isBXGYInProgress = false;
    }
  }

  // ----------------------------
  // ⚡ CART EVENT HOOKS
  // ----------------------------
  const triggerBxgyCheck = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => ensureBxgyGift(), 200);
  };

  // 🧩 Hook: fetch calls (.js & non-.js)
  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    const res = await _fetch(...args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    if (/\/cart\/(add|change|update|clear)(\.js)?/.test(url)) {
      if (/\/cart\/add/.test(url)) ensureBxgyGift();
      else triggerBxgyCheck();
    }
    return res;
  };

  // 🧩 Hook: XHRs
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener("load", () => {
      if (typeof url === "string" && /\/cart\/(add|change|update|clear)(\.js)?/.test(url)) {
        if (/\/cart\/add/.test(url)) ensureBxgyGift();
        else triggerBxgyCheck();
      }
    });
    return _open.call(this, method, url, ...rest);
  };

  // 🧩 Hook: classic form submits
  document.addEventListener("submit", e => {
    const form = e.target;
    if (form.action && form.action.includes("/cart/add")) {
      setTimeout(() => ensureBxgyGift(), 400);
    }
  });

  // ----------------------------
  // 🧩 INITIAL LOAD
  // ----------------------------
  window.addEventListener("DOMContentLoaded", () => getCart());
  setTimeout(() => ensureBxgyGift(), 800);
})();
