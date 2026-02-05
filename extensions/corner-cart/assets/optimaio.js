// /* GLOBAL Optimaio Campaign Loader — shared by BXGY + FreeGift */
// window.__OPTIMAIO_CAMPAIGN_CACHE__ = {
//   data: null,
//   time: 0,
//   TTL: 60000 // 1 min
// };

// window.loadOptimaioCampaigns = async function(force = false) {
//   const cache = window.__OPTIMAIO_CAMPAIGN_CACHE__;
//   const now = Date.now();

//   if (!force && cache.data && now - cache.time < cache.TTL) {
//     return cache.data;
//   }

//   try {
//     const res = await fetch("/apps/optimaio-cart", { cache: "no-store" });
//     const json = await res.json();

//     /* ✅ ADD THIS LINE HERE */
//     window.__OPTIMAIO_CAMPAIGNS__ = json;

//     cache.data = json;
//     cache.time = now;
//     return json;
//   } catch (err) {
//     console.warn("⚠️ Failed to fetch campaigns", err);
//     return cache.data || null;
//   }
// };



/* ----------------------------------
   GLOBAL CART PAGE FLAG
---------------------------------- */
window.__OPTIMAIO_IS_CART_PAGE__ =
  location.pathname === "/cart" ||
  document.body.classList.contains("template-cart");



/* -------------------------------------------------------------
   GLOBAL OPTIMAIO CART CONTROLLER (NO CACHE — ALWAYS FRESH)
   Ensures:
   - Only ONE active fetch at a time
   - Updates for ALL cart events (add/change/update/clear)
   - Broadcasts cart to drawer, BXGY, free-gift, progress bar
------------------------------------------------------------- */
window.OptimaioCartController = (() => {
 
  let currentFetch = null;   // prevents duplicate simultaneous requests
 
  /* ------------------------------
     ALWAYS fetch fresh cart
     (but reuse same promise if multiple requests happen together)
  ------------------------------ */
  async function getCart() {
    if (currentFetch) return currentFetch;
 
    currentFetch = fetch("/cart.js", { cache: "no-store" })
      .then(res => res.json())
      .finally(() => { currentFetch = null; });
 
    return currentFetch;
  }
 
  /* ------------------------------
     Force fresh cart + broadcast to all scripts
  ------------------------------ */
  async function refresh() {
    const cart = await getCart();
    document.dispatchEvent(
      new CustomEvent("optimaio:cart:updated", { detail: cart })
    );
    return cart;
  }
 
  /* ------------------------------
     Triggered after ANY cart modification
  ------------------------------ */
  function scheduleRefresh() {
    refresh(); // no delay — always fresh
  }
 
  return {
    getCart,          // always fresh
    refresh,          // broadcast
    scheduleRefresh   // auto-called on edit
  };
})();
 

function formatShopMoney(amountInCents) {
  const format = window.__SHOP_MONEY_FORMAT__ || "{{amount}}";
  const amount = (amountInCents / 100).toFixed(2);

  return format.replace("{{amount}}", amount)
               .replace("{{ amount }}", amount);
}


/* --------------------------------------------------
   OPTIMAIO – GLOBAL CART LOADING STATE
-------------------------------------------------- */
window.__OPTIMAIO_CART_LOADING__ = 0;

function showOptimaioLoading() {
  const el = document.getElementById("optimaio-cart-loading");
  if (!el) return;
  el.classList.remove("hidden");
}

function hideOptimaioLoading() {
  const el = document.getElementById("optimaio-cart-loading");
  if (!el) return;
  el.classList.add("hidden");
}

function startCartLoading() {
  window.__OPTIMAIO_CART_LOADING__++;
  showOptimaioLoading();
}

function stopCartLoading() {
  window.__OPTIMAIO_CART_LOADING__--;
  if (window.__OPTIMAIO_CART_LOADING__ <= 0) {
    window.__OPTIMAIO_CART_LOADING__ = 0;
    hideOptimaioLoading();
  }
}

 
/* -------------------------------------------------------------
   INTERCEPT ALL SHOPIFY CART ACTIONS
   Covers:
   - /cart/add.js
   - /cart/change.js
   - /cart/update.js
   - /cart/clear.js
   (100% of cart change events)
------------------------------------------------------------- */
/* -------------------------------------------------------------
   INTERCEPT ALL SHOPIFY CART ACTIONS (WITH LOADING)
------------------------------------------------------------- */
(function () {
  const nativeFetch = window.fetch;

  window.fetch = async (...args) => {
    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0]?.url || "";

    const isCartAction =
      /\/cart\/(add|change|update|clear)/.test(url);

    if (isCartAction) {
      startCartLoading();
    }

    try {
      const result = await nativeFetch(...args);

      if (isCartAction) {
        window.OptimaioCartController.scheduleRefresh();
      }

      return result;
    } finally {
      if (isCartAction) {
        stopCartLoading();
      }
    }
  };
})(); 



 
/* =====================================================
   OPTIMAIO PUBLIC SDK (BASIC)
   Allows merchants to hook into events
===================================================== */

/* =====================================================
   OPTIMAIO PUBLIC SDK
   on / do / get
===================================================== */

(function () {
  if (window.optimaio) return;

  let checkoutOverrideFn = null; // 🔒 SINGLE owner

  window.optimaio = {
    /* -------------------------
       EVENTS
    -------------------------- */
    on(event, callback) {
      document.addEventListener(`optimaio:${event}`, (e) => {
        try {
          callback(e.detail || {});
        } catch (err) {
          console.warn("Optimaio user script error:", err);
        }
      });
    },

    /* -------------------------
       ACTIONS
    -------------------------- */
    do(action) {
      switch (action) {
        case "openCart":
          window.__OPTIMAIO_OPEN_DRAWER__?.();
          break;

        case "closeCart":
          window.__OPTIMAIO_CLOSE_DRAWER__?.();
          break;

        case "refreshCart":
          window.OptimaioCartController?.refresh();
          break;

        default:
          console.warn(`Optimaio.do(): Unknown action "${action}"`);
      }
    },

    /* -------------------------
       READERS
    -------------------------- */
    get(key) {
      switch (key) {
        case "cartInfo":
          return window.__OPTIMAIO_LAST_CART__ || null;

        case "isOpen":
          return !!window.__OPTIMAIO_DRAWER_OPEN__;

        default:
          return null;
      }
    },

    /* -------------------------
       CHECKOUT OVERRIDE (🔥)
    -------------------------- */
    overrideCheckout(fn) {
      if (typeof fn !== "function") {
        console.warn("optimaio.overrideCheckout expects a function");
        return;
      }

      checkoutOverrideFn = fn;
      console.log("✅ Optimaio checkout override registered");
    },

    /* 🔒 INTERNAL (do not document) */
    __runCheckoutOverride(cart, discounts) {
      if (checkoutOverrideFn) {
        checkoutOverrideFn(cart, discounts);
        return true;
      }
      return false;
    }
  };
})();


 
// --------------------------------------------------------------
// PART 1 / 3 — Initialization + Helpers + Currency Extraction
// --------------------------------------------------------------
 
(function () {
  if (window.OptimaioCartDrawerInit) return;
  window.OptimaioCartDrawerInit = true;
 
  /* --------------------------------------------------
     UNIVERSAL HELPERS
  -------------------------------------------------- */
 
  window.optimaioClearEffects = function () {
    const CLS = ["overflow-hidden", "js-drawer-open", "menu-open", "lock-scroll", "no-scroll"];
    CLS.forEach(cls => {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    });
 
    const OVERLAYS = [
      '#CartDrawer-Overlay', '.cart-drawer__overlay', '.drawer__overlay',
      '.menu-drawer__overlay', '.modal__overlay', '.modal-overlay',
      '.cart-notification__overlay', 'cart-notification', 'cart-drawer',
      '.side-drawer__overlay', '.AjaxCart', '.ajaxcart', '.CartPopup'
    ];
 
    OVERLAYS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.classList.remove('active', 'open', 'is-active', 'visible', 'animate');
        el.removeAttribute('open');
        el.style.opacity = '';
        el.style.visibility = '';
        el.style.pointerEvents = '';
        el.style.display = 'none';
      });
    });
  };
 
//   function extractToken(format) {
//   const match = format.match(/{{\s*([^}]+?)\s*}}/);
//   return match ? match[1] : null;
// }
 
// function shopifyFallbackMoneyFormat(amountInCents) {
//   const format = window.__SHOP_MONEY_FORMAT__ || "{{amount}}";
//   const amount = (amountInCents / 100).toLocaleString(undefined, {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2
//   });
//   return format.replace("{{amount}}", amount)
//                .replace("{{amount_with_comma_separator}}", amount);
// }
 
// function formatShopMoney(amountInCents) {
//   const data = window.__OPTIMAIO_CURRENCIES__;
//   const amount = amountInCents / 100;
//   const showDecimals = data?.showDecimals === "yes";
//   const currentCurrency =
//     Shopify?.currency?.active || data?.defaultCurrency || "INR";
 
//   const match = data?.currencies?.find(c => c.code === currentCurrency);
//   if (!match) return shopifyFallbackMoneyFormat(amountInCents);
 
//   let format = match.format || "{{amount}}";
//   const token = extractToken(format);
 
//   const dict = {
//     amount: amount.toLocaleString(undefined, {
//       minimumFractionDigits: showDecimals ? 2 : 0,
//       maximumFractionDigits: showDecimals ? 2 : 0
//     }),
//     amount_no_decimals: amount.toLocaleString(undefined, {
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0
//     }),
//     amount_with_comma_separator: amount.toLocaleString("de-DE", {
//       minimumFractionDigits: showDecimals ? 2 : 0,
//       maximumFractionDigits: showDecimals ? 2 : 0
//     }),
//     amount_no_decimals_with_comma_separator: amount.toLocaleString("de-DE", {
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0
//     })
//   };
 
//   return format.replace(`{{${token}}}`, dict[token] || amount.toLocaleString());
// }
 
  /* --------------------------------------------------
     MAIN CART DRAWER INITIALIZATION
  -------------------------------------------------- */
 
  document.addEventListener("DOMContentLoaded", initDrawer);
  document.addEventListener("shopify:section:load", initDrawer);
 
  function initDrawer() {
    const cornerCart = document.getElementById("optimaio-corner-cart");
    const drawer = document.getElementById("optimaio-cart-drawer");

    

    if (!cornerCart || !drawer) return;
 
    const itemsContainer = drawer.querySelector(".optimaio-cart-drawer__items");
    const emptyState = drawer.querySelector(".optimaio-cart-drawer__empty");
    const closeBtn = drawer.querySelector(".optimaio-cart-drawer__close");
    const totalEl = drawer.querySelector(".optimaio-total-amount");
    const discountEl = drawer.querySelector(".optimaio-discount-amount");
 
    /* ------------------------------
       TAB HANDLING
    ------------------------------ */
 
    function setTab(tab) {
      drawer.setAttribute("data-active-tab", tab);
      drawer.querySelectorAll(".optimaio-tab-btn").forEach(b =>
        b.classList.toggle("active", b.dataset.target === tab)
      );
    }
 
    const footer = drawer.querySelector(".optimaio-cart-drawer__footer");
    if (footer) {
      footer.addEventListener("click", e => {
        const btn = e.target.closest(".optimaio-tab-btn");
        if (btn) setTab(btn.dataset.target);
      });
    }
 
    setTab("cart");
 
    // --------------------------------------------------------------
// PART 2 / 3 — Rendering Engine + Buttons + Placeholders
// --------------------------------------------------------------
 
    /* ------------------------------
       CART RENDERING SYSTEM
    ------------------------------ */
    function renderCart(cart) {
      // document.getElementById("optimaio-corner-cart-count").textContent = cart.item_count;
 
      if (cart.item_count === 0) {
        itemsContainer.innerHTML = "";
        emptyState.style.display = "flex";
        totalEl.textContent = `${currencySymbol}0`;
        discountEl.textContent = `${currencySymbol}0`;
        document.querySelector(".optimaio-recommendations-list").innerHTML = "";
        return;
      }
 
      emptyState.style.display = "none";
 
      const itemsHTML = cart.items
      .filter(item => !item.properties?.__optimaio_hidden_upsell__)
      .map(item => `
        <div
  class="optimaio-cart-item-card
    ${(item.properties?.isBXGYGift || item.properties?.isFreeGift) ? 'optimaio-free-gift' : ''}"
  ${item.properties?.isFreeGift ? 'data-is-free-gift="true"' : ''}
  ${item.properties?.isBXGYGift ? 'data-is-bxgy-gift="true"' : ''}
>

          <div class="optimaio-cart-item__image"><img src="${item.image}" alt="${item.product_title}"></div>
          <div class="optimaio-cart-item__info">
 
            <div class="optimaio-cart-item__top">
              <p class="optimaio-cart-item__title">${item.product_title}</p>
              <button class="optimaio-cart-item__remove" data-key="${item.key}">×</button>
            </div>
 
            ${item.variant_title && item.variant_title !== "Default Title"
              ? `<p class="optimaio-cart-item__variant">${item.variant_title}</p>`
              : ""}
 
            <div class="optimaio-cart-item__bottom">
              <div class="optimaio-cart-item__actions">
                <button class="optimaio-qty-btn" data-key="${item.key}" data-change="-1"><svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M5 12h14"/>
</svg></button>
                <span class="optimaio-cart-item__qty">${item.quantity}</span>
                <button class="optimaio-qty-btn" data-key="${item.key}" data-change="1"><svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M12 5v14"/>
<path d="M5 12h14"/>
</svg></button>
              </div>
 
              <div class="optimaio-cart-item__pricing">
                ${item.original_line_price > item.final_line_price
                  ? `<span class="optimaio-compare-at">${formatShopMoney(item.original_line_price)}</span>`
                  : ""}
                <span class="optimaio-price">${formatShopMoney(item.final_line_price)}</span>
              </div>
            </div>
 
            ${item.properties?.isBXGYGift || item.properties?.isFreeGift
              ? `<div class="optimaio-cart-item__discount optimaio-free-gift-badge"><span><svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M20 12v10H4V12"/>
<path d="M2 7h20v5H2z"/>
<path d="M12 22V7"/>
<path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C10 2 12 7 12 7z"/>
<path d="M12 7h4.5a2.5 2.5 0 1 0 0-5C14 2 12 7 12 7z"/>
</svg> FREE GIFT</span></div>`
              : item.discounts?.length
                ? `<div class="optimaio-cart-item__discount">
                    ${item.discounts.map(d => `<span>${d.title}</span>`).join('<br>')}
                   </div>`
                : ""}
          </div>
        </div>
      `).join("");
 
 
      /* -------- FREE GIFT PLACEHOLDERS ---------- */
      let placeholdersHTML = "";
      if (window.__expectedFreeGifts) {
        const realGiftIds = new Set(cart.items.filter(i => i.properties?.isBXGYGift || i.properties?.isFreeGift).map(i => i.variant_id));
 
        placeholdersHTML = Object.entries(window.__expectedFreeGifts).map(([gid, info]) => {
          const vid = Number(gid.split("/").pop());
          if (realGiftIds.has(vid)) return "";
 
          return `
            <div class="optimaio-cart-item-card optimaio-free-gift optimaio-gift-placeholder" data-vid="${vid}">
              <div class="optimaio-cart-item__image"><img src="${info.image || ''}"></div>
 
              <div class="optimaio-cart-item__info">
                <div class="optimaio-cart-item__top">
                  <p class="optimaio-cart-item__title">${info.title || 'Free Gift'}</p>
                  <button disabled class="optimaio-cart-item__remove" style="opacity:.4;cursor:not-allowed;">×</button>
                </div>
 
                <div class="optimaio-cart-item__bottom">
                  <div class="optimaio-cart-item__actions">
                    <button disabled>−</button>
                    <span class="optimaio-cart-item__qty">1</span>
                    <button disabled>+</button>
                  </div>
                  <div class="optimaio-cart-item__pricing"><span class="optimaio-price">FREE GIFT</span></div>
                </div>
 
                <div class="optimaio-cart-item__discount optimaio-free-gift-badge"><span><svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M20 12v10H4V12"/>
<path d="M2 7h20v5H2z"/>
<path d="M12 22V7"/>
<path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C10 2 12 7 12 7z"/>
<path d="M12 7h4.5a2.5 2.5 0 1 0 0-5C14 2 12 7 12 7z"/>
</svg> FREE GIFT</span></div>
              </div>
            </div>
          `;
        }).join("");
      }
 
      /* ---- Soft-update placeholders if gift becomes real ---- */
      cart.items.forEach(item => {
        if (item.properties?.isBXGYGift || item.properties?.isFreeGift) {
          const ph = itemsContainer.querySelector(
            `.optimaio-gift-placeholder[data-vid="${item.variant_id}"]`
          );
          if (ph) {
            ph.classList.remove("optimaio-gift-placeholder");
            ph.querySelector(".optimaio-price").textContent =
  formatShopMoney(item.final_line_price);
 
            ph.querySelector(".optimaio-cart-item__qty").textContent = item.quantity;
          }
        }
      });
 
      itemsContainer.innerHTML = placeholdersHTML + itemsHTML;
 
      totalEl.textContent = formatShopMoney(cart.total_price);
 
      discountEl.textContent =
  "-" + formatShopMoney(cart.original_total_price - cart.total_price);
 
  if (cart.items.length) {
    loadRecsForCart(cart.items);
  }
  
      bindItemButtons();
 
      if (cart.items.some(i => i.properties?.isBXGYGift || i.properties?.isFreeGift)) {
        window.__expectedFreeGifts = {};
      }
    }
 
   async function getCart() {
  const cart = await window.OptimaioCartController.getCart();
  renderCart(cart);
}
 
 
    window.getCartAndRender = async () => {
  const cart = await window.OptimaioCartController.getCart();
  renderCart(cart);
};
 
 
 
    /* ------------------------------
       REFRESH EVENTS
    ------------------------------ */
 
    document.addEventListener("optimaio:cart:updated", (e) => {
      window.__OPTIMAIO_LAST_CART__ = e.detail; // ✅ ADD
  renderCart(e.detail);
  bindCheckoutButton(); // ✅ ensure always bound
});
 
// ✔ FIX: only re-render with latest cart, DO NOT refetch campaigns
document.addEventListener("optimaio:cart:refresh", async () => {
  const cart = await window.OptimaioCartController.getCart();
  renderCart(cart);
  });

 
 
    /* ------------------------------
       QTY + REMOVE BUTTONS
    ------------------------------ */
    function bindItemButtons() {


      itemsContainer
  .querySelectorAll(".optimaio-cart-item__remove")
  .forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "true";

    btn.onclick = async () => {
      const key = btn.dataset.key;
      btn.disabled = true;

      await fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: key, quantity: 0 })
      })
      .then(() => window.OptimaioCartController.refresh())

        .finally(() => btn.disabled = false);
    };
  });


  /* ------------------------------
     QTY BUTTONS — ❌ SKIP GIFTS
  ------------------------------ */
  itemsContainer.querySelectorAll(".optimaio-cart-item-card").forEach(card => {

    const isGift =
      card.dataset.isFreeGift === "true" ||
      card.dataset.isBxgyGift === "true";

    if (isGift) return; // ⛔ STOP — no qty logic for gifts

    card.querySelectorAll(".optimaio-qty-btn").forEach(btn => {
      btn.onclick = async () => {
        const key = btn.dataset.key;
        const delta = parseInt(btn.dataset.change);
        const qtyEl = btn.parentElement.querySelector(".optimaio-cart-item__qty");
        const newQty = Math.max(1, parseInt(qtyEl.textContent) + delta);

        btn.disabled = true;

        await fetch("/cart/change.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: key, quantity: newQty })
        })
        .then(() => window.OptimaioCartController.refresh())
          .finally(() => btn.disabled = false);
      };
    });
  });

}


    /* ------------------------------
   CHECKOUT BUTTON INTERCEPT
------------------------------ */
function bindCheckoutButton() {
  const btn = drawer.querySelector(".optimaio-checkout-btn");
  if (!btn || btn.dataset.optimaioBound) return;

  btn.dataset.optimaioBound = "true";

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 1️⃣ Always use latest cart
    const cart =
      window.__OPTIMAIO_LAST_CART__ ||
      await window.OptimaioCartController.getCart();

    const discountCodes =
      cart?.discount_codes?.map(d => d.code) || [];

    // 2️⃣ Analytics / tracking hook
    document.dispatchEvent(
      new CustomEvent("optimaio:checkoutAttempt", {
        detail: { cart }
      })
    );

    // 3️⃣ Override takes FULL control (Corner Cart behavior)
    // 3️⃣ Override takes FULL control (Corner Cart behavior)
const overridden = (() => {
  try {
    return window.optimaio.__runCheckoutOverride(
      cart,
      discountCodes
    );
  } catch (e) {
    console.error("Optimaio checkout override error:", e);
    return false;
  }
})();

if (overridden) return;


    // 4️⃣ Default Shopify fallback
    window.location.href = "/checkout";
  });
}


    /* ------------------------------
       One Click Upsellll Javascript
    ------------------------------ */


(function () {
  if (window.__OPTIMAIO_ONECLICK_INIT__) return;
  window.__OPTIMAIO_ONECLICK_INIT__ = true;

  function resolveUpsellText(text, productTitle, amount) {
    if (!text || !text.trim()) return null;
  
    return text
      .replace(/{{\s*title\s*}}/gi, productTitle)
      .replace(/{{\s*amount\s*}}/gi, amount);
  }
  

  function extractVariantId(gid) {
    return gid?.split("/").pop();
  }

  function formatMoney(price) {
    try {
      return Shopify.formatMoney(
        Math.round(Number(price) * 100),
        window.__SHOP_MONEY_FORMAT__
      );
    } catch {
      return price;
    }
  }

  async function getCart() {
    return window.OptimaioCartController?.getCart();
  }

  async function addUpsell(variantId, hide) {
    await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: variantId,
        quantity: 1,
        properties: {
          __optimaio_upsell__: true,
          ...(hide ? { __optimaio_hidden_upsell__: true } : {})
        }
      })
    });
  }
  

  async function removeUpsell(cart, variantId) {
    const item = cart.items.find(
      i =>
        i.variant_id == variantId &&
      i.properties?.__optimaio_upsell__ === true
    );
    
    if (!item) return;

    await fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.key, quantity: 0 })
    });
  }

  async function render() {
    const upsell = window.__OPTIMAIO_CART__?.upsell?.oneClickUpsell;
    if (!upsell?.enabled) return;

    const container = document.getElementById("optimaio-oneclick-upsell");
    if (!container) return;

    const p = upsell.product;
    if (!p?.availableForSale) {
      container.innerHTML = "";
      return;
    }

    const variantId = extractVariantId(p.id);
    if (!variantId) return;

    const cart = await getCart();
    const inUpsellCart = cart?.items?.some(
      i =>
        i.variant_id == variantId &&
        i.properties?.__optimaio_upsell__ === true
    );

    const isCheckbox = upsell.ctaType === "checkbox";
    const isHidden = upsell.showInCartList === false;

    container.innerHTML = `
      <div class="optimaio-mini-upsell">
        ${upsell.showProductImage !== false ? `
          <img src="${p.image?.url || ""}" class="optimaio-mini-upsell__image">
        ` : ""}

        ${(() => {
  const resolvedText = resolveUpsellText(
    upsell.upsellText,
    p.productTitle,
    formatMoney(p.price)
  );

  return `
    <div class="optimaio-mini-upsell__info">
      ${
        resolvedText
          ? `<div class="optimaio-mini-upsell__text">${resolvedText}</div>`
          : `
              <div class="optimaio-mini-upsell__title">${p.productTitle}</div>
              <div class="optimaio-mini-upsell__price">${formatMoney(p.price)}</div>
            `
      }
    </div>
  `;
})()}


        ${
          isCheckbox
            ? `<label class="optimaio-upsell-checkbox">
                <input type="checkbox" ${inUpsellCart ? "checked" : ""}>
              </label>`
            : `<button class="optimaio-mini-upsell__btn">
                ${inUpsellCart ? "Remove" : "Add"}
              </button>`
        }
      </div>
    `;

    if (isCheckbox) {
      const cb = container.querySelector("input");
      cb.onchange = async () => {
        cb.disabled = true;

        const freshCart = await getCart();
        const exists = freshCart.items.some(
          i =>
            i.variant_id == variantId &&
            i.properties?.__optimaio_upsell__ === true
        );

        if (cb.checked && !exists) {
          await addUpsell(variantId, isHidden);
        }

        if (!cb.checked && exists) {
          await removeUpsell(freshCart, variantId);
        }

        await window.OptimaioCartController.refresh();
        cb.disabled = false;
      };
    } else {
      const btn = container.querySelector("button");
      btn.onclick = async () => {
        btn.disabled = true;

        const freshCart = await getCart();
        const exists = freshCart.items.some(
          i =>
            i.variant_id == variantId &&
            i.properties?.__optimaio_upsell__ === true
        );
        

        exists
          ? await removeUpsell(freshCart, variantId)
          : await addUpsell(variantId, isHidden);

        await window.OptimaioCartController.refresh();
        btn.disabled = false;
      };
    }
  }

  document.addEventListener("DOMContentLoaded", render);
  document.addEventListener("optimaio:open", render);
  document.addEventListener("optimaio:cart:updated", render);
})();
 
    // --------------------------------------------------------------
// PART 3 / 3 — Recommendations + ATC Interceptor + Observers
// --------------------------------------------------------------
 
    /* ------------------------------
       PRODUCT RECOMMENDATIONS
    ------------------------------ */
/* --------------------------------------------
   AUTO SCROLL RECOMMENDATIONS (every 6 seconds)
----------------------------------------------*/
/* ------------------------------------------------------
   GLOBAL STATE
------------------------------------------------------*/
let recAutoScrollInterval = null;
let userInteracting = false;
let resumeTimer = null;
let isVisible = false; // ⭐ controlled by IntersectionObserver
 
/* ------------------------------------------------------
   DETECT CURRENT CARD INDEX
------------------------------------------------------*/
function getCurrentCardIndex(container) {
  const cards = container.querySelectorAll(".optimaio-recommendation-card");
  if (!cards.length) return 0;
 
  let closestIndex = 0;
  let minDistance = Infinity;
 
  cards.forEach((card, i) => {
    const distance = Math.abs(card.offsetLeft - container.scrollLeft);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  });
 
  return closestIndex;
}
 
/* ------------------------------------------------------
   INIT AUTO SCROLL (START FROM GIVEN INDEX)
------------------------------------------------------*/
function initAutoScrollRecommendations(startIndex = 0, layout = "carousel") {
  const container = document.querySelector(".optimaio-recommendations-list");
  if (!container) return;
 

  
  // Stop old interval
  if (recAutoScrollInterval) clearInterval(recAutoScrollInterval);
 
  let cards = container.querySelectorAll(".optimaio-recommendation-card");
  if (!cards.length) return;
 
  let index = startIndex;
 
  // Scroll to saved card position
  container.scrollTo({
    left: cards[index]?.offsetLeft || 0,
    behavior: "instant"
  });
 
  /* --------------------------
     AUTO SCROLL LOOP
  --------------------------*/
  recAutoScrollInterval = setInterval(() => {
    if (!isVisible) return;     // ⭐ only scroll when visible
    if (userInteracting) return;
 
    cards = container.querySelectorAll(".optimaio-recommendation-card");
    if (!cards.length) return;
 
    index++;
    if (index >= cards.length) index = 0;
 
    container.scrollTo({
      left: cards[index].offsetLeft,
      behavior: "smooth"
    });
 
  }, 4000);
 
  /* --------------------------
     PAUSE ON USER INTERACTION
  --------------------------*/
  function pauseScroll() {
    userInteracting = true;
    if (resumeTimer) clearTimeout(resumeTimer);
 
    // Resume after 3 seconds of no interaction
    resumeTimer = setTimeout(() => {
      userInteracting = false;
    }, 3000);
  }
 
  if (!container.classList.contains("layout-card")) {
    container.addEventListener("scroll", pauseScroll);
    container.addEventListener("touchstart", pauseScroll);
    container.addEventListener("touchmove", pauseScroll);
    container.addEventListener("mousedown", pauseScroll);
  }
  
 
  /* ------------------------------------------------------
     INTERSECTION OBSERVER
     (auto-scroll only when visible)
  ------------------------------------------------------*/
  const observer = new IntersectionObserver(
    entries => {
      isVisible = entries[0].isIntersecting;
    },
    { threshold: 0.1 } // ⭐ start if 30% visible
  );
 
  observer.observe(container);
}
 
/* ------------------------------------------------------
   LOAD RECOMMENDATIONS + MAINTAIN POSITION
------------------------------------------------------*/
async function loadRecsForCart(cartItems) {
  const normalUpsell = window.__OPTIMAIO_CART__?.upsell?.normalUpsell;
  if (!normalUpsell?.enabled) return;

  const mode = normalUpsell.upsellType || "complementary";
  const limit = normalUpsell.relatedProductCount || 4;
  const layout = normalUpsell?.displayLayout || "carousel";

  const container = document.querySelector(".optimaio-recommendations-list");
  if (!container) return;

  const section = document.querySelector(".optimaio-cart-drawer__recommendations");
  if (section && !section.querySelector("p")) {
    section.insertAdjacentHTML(
      "afterbegin",
      '<p class="optimaio-reco-title">You might also like</p>'
    );
  }

  // Keep scroll position
  const currentIndex = getCurrentCardIndex(container);

  // Products already in cart (exclude these)
  const cartProductIds = new Set(cartItems.map(i => i.product_id));

  let merged = [];
  const seen = new Set();

  /* ----------------------------------
     🔀 DATA SOURCE SWITCH
  ---------------------------------- */

  if (mode === "manual") {
    // ✅ MANUAL PRODUCTS
    const variants = normalUpsell.selectedVariants || [];

    variants.forEach(v => {
      const variantId = Number(v.id.split("/").pop());
    
      if (!v.availableForSale) return;
    
      if (seen.has(variantId)) return;
    
      const alreadyInCart = cartItems.some(
        item => item.variant_id === variantId
      );
      if (alreadyInCart) return;
    
      seen.add(variantId);
    
      merged.push({
        id: variantId,
        title: v.productTitle,
        featured_image: v.image?.url || "",
        variants: [{ id: variantId, price: Number(v.price) * 100 }]
      });
    });
    

    merged = merged.slice(0, limit);

  } else {
    // ✅ SHOPIFY RECOMMENDATIONS
    const intent = mode === "related" ? "related" : "complementary";

    const responses = await Promise.all(
      cartItems.map(item =>
        fetch(
          `/recommendations/products.json?product_id=${item.product_id}&intent=${intent}&limit=${limit}`
        ).then(r => r.json())
      )
    );

    responses.forEach(r => {
      r.products.forEach(p => {
        if (cartProductIds.has(p.id)) return;
        if (seen.has(p.id)) return;

        seen.add(p.id);
        merged.push(p);
      });
    });
  }

  /* ----------------------------------
     ⛔ NOTHING FOUND
  ---------------------------------- */
  if (!merged.length) {
    container.innerHTML = "";
    if (section) section.style.display = "none";
    return;
  }

  if (section) section.style.display = "";

  /* ----------------------------------
     🎨 RENDER (UNCHANGED)
  ---------------------------------- */
  container.innerHTML = merged.map(p => `
    <div class="optimaio-recommendation-card" data-url="${p.url || (p.productHandle ? `/products/${p.productHandle}` : '')}">
      <div class="optimaio-rec-image">
        <img src="${p.featured_image}" alt="${p.title}">
      </div>

      <div class="optimaio-rec-content">
        <p class="optimaio-rec-title">${p.title}</p>
        <p class="optimaio-rec-price">
          ${formatShopMoney(p.variants[0].price)}
        </p>
      </div>

      <button class="optimaio-rec-add" data-id="${p.variants[0].id}">
        Add
      </button>
    </div>
  `).join("");
  container.className = `optimaio-recommendations-list layout-${layout}`;


  if (layout === "card" && section && !section.querySelector(".optimaio-rec-nav")) {
    section.insertAdjacentHTML("beforeend", `
      <div class="optimaio-rec-nav">
        <button class="rec-prev">‹</button>
        <button class="rec-next">›</button>
      </div>
    `);
  }

  
  if (layout === "card") {
    const prev = section.querySelector(".rec-prev");
    const next = section.querySelector(".rec-next");
    const cards = container.querySelectorAll(".optimaio-recommendation-card");
  
    let index = currentIndex;
  
    prev.onclick = () => {
      index = Math.max(0, index - 1);
      container.scrollTo({ left: cards[index].offsetLeft, behavior: "smooth" });
    };
  
    next.onclick = () => {
      index = Math.min(cards.length - 1, index + 1);
      container.scrollTo({ left: cards[index].offsetLeft, behavior: "smooth" });
    };
  }
  

  /* ----------------------------------
     🛒 ATC (UNCHANGED)
  ---------------------------------- */
  const ctaAction = normalUpsell?.ctaAction || "add_to_cart";

container.querySelectorAll(".optimaio-rec-add").forEach(btn => {
  btn.onclick = async () => {
    const variantId = btn.dataset.id;

    // 🔀 REDIRECT MODE
    if (ctaAction === "redirect_to_product") {
      const card = btn.closest(".optimaio-recommendation-card");
      const url = card?.dataset?.url;
if (url) window.location.href = url;

      return;
    }

    // 🛒 ADD TO CART MODE (default)
    btn.disabled = true;

    await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    });

    window.OptimaioCartController.refresh();
    btn.disabled = false;
  };
});


  // Restart auto-scroll (UNCHANGED)
  /* ----------------------------------
   🎛️ LAYOUT BEHAVIOR CONTROL
---------------------------------- */
if (layout === "carousel") {
  initAutoScrollRecommendations(currentIndex, layout);
} else {
  if (recAutoScrollInterval) {
    clearInterval(recAutoScrollInterval);
    recAutoScrollInterval = null;
  }
}

}


 
 
    /* ------------------------------
       OPEN / CLOSE DRAWER
    ------------------------------ */
    function openDrawer() {
      // ⛔ NEVER open drawer on cart page
      if (window.__OPTIMAIO_IS_CART_PAGE__) return;
    
      window.optimaioClearEffects();
      document.body.classList.add("optimaio-cart-open");
      window.__OPTIMAIO_DRAWER_OPEN__ = true;
      window.OptimaioCartController.refresh();
      drawer.classList.add("open");
      document.dispatchEvent(new CustomEvent("optimaio:open"));
    }
    
window.__OPTIMAIO_OPEN_DRAWER__ = openDrawer;
 
    function closeDrawer() {
      drawer.classList.remove("open");
      // 🔓 UNLOCK SCROLL
  document.body.classList.remove("optimaio-cart-open"); 
  window.__OPTIMAIO_DRAWER_OPEN__ = false; // ✅ ADD
      window.optimaioClearEffects();
      document.dispatchEvent(new CustomEvent("optimaio:close"));
    }
    window.__OPTIMAIO_CLOSE_DRAWER__ = closeDrawer;
 
    cornerCart.addEventListener("click", openDrawer);
    closeBtn.addEventListener("click", closeDrawer);
 
    window.addEventListener("keydown", e => {
      if (e.key === "Escape") closeDrawer();
    });
 
 
    /* ------------------------------
       BIND CART TRIGGERS
    ------------------------------ */
    function bindCartTriggers() {
      const selectors = [
        '#cart-icon-bubble', '.header__icon--cart', 'a[href="/cart"]',
        'button[data-action="open-cart"]', '[aria-controls*="cart"]',
        '[data-cart-toggle]', '[data-cart-trigger]',
        '[data-drawer-target="cart-drawer"]'
      ];
 
      document.querySelectorAll(selectors.join(',')).forEach(trigger => {
        if (trigger.dataset.optimaioBound) return;
 
        trigger.dataset.optimaioBound = "true";
        trigger.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openDrawer();
        });
      });
    }
 
    bindCartTriggers();
    setTimeout(bindCartTriggers, 1500);

    
/* ✅ Checkout button */
bindCheckoutButton();
 
 
    /* ------------------------------
       MUTATION OBSERVER
    ------------------------------ */
    const observer = new MutationObserver(bindCartTriggers);
    observer.observe(document.body, { childList: true, subtree: true });
 
    getCart();
  }
 
 
 
  /* ---------------------------------------------------------
       UNIVERSAL ATC INTERCEPTOR
  --------------------------------------------------------- */
 
  function getDrawer() {
    return document.getElementById("optimaio-cart-drawer");
  }
 
  function openDrawerATC() {
    // ⛔ NEVER open drawer on cart page
    if (window.__OPTIMAIO_IS_CART_PAGE__) return;
  
    const drawer = getDrawer();
    if (!drawer) return;
  
    window.optimaioClearEffects();
    document.body.classList.add("optimaio-cart-open");
    window.OptimaioCartController.refresh();
    drawer.classList.add("open");
  }
  
 
  /* ------------------------------
      1) INTERCEPT PRODUCT FORMS
  ------------------------------ */
  function interceptProductForm(form) {
    if (!form || form.dataset.optimaioBound) return;
    form.dataset.optimaioBound = "true";
 
    form.addEventListener("submit", function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
 
      const fd = new FormData(form);
 
      fetch("/cart/add.js", { method: "POST", body: fd })
        .then(() => openDrawerATC());
    }, true);
  }
 
  function bindProductForms() {
    document.querySelectorAll('form[action*="cart/add"]').forEach(interceptProductForm);
  }
 
  /* ------------------------------
      2) INTERCEPT ATC BUTTONS
  ------------------------------ */
  function interceptATCButton(btn) {
    if (!btn || btn.dataset.optimaioATC) return;
    btn.dataset.optimaioATC = "true";
 
    btn.addEventListener("click", (e) => {
      const form = btn.closest("form");
      if (!form) return;
 
      e.preventDefault();
      e.stopPropagation();
 
      const fd = new FormData(form);
 
      fetch("/cart/add.js", { method: "POST", body: fd })
        .then(() => openDrawerATC());
    }, true);
  }
 
  function bindATCButtons() {
    document.querySelectorAll(
      'button[name="add"], .product-form__submit, [data-add-to-cart], .quick-add__submit'
    ).forEach(interceptATCButton);
  }
 
  /* ------------------------------
      3) INTERCEPT CART LINKS
  ------------------------------ */
  function interceptCartLinks(el) {
    if (!el || el.dataset.optimaioCartLink) return;
    el.dataset.optimaioCartLink = "true";
 
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openDrawerATC();
    });
  }
 
  function bindCartLinks() {
    const selectors = [
      'a[href="/cart"]', '#cart-icon-bubble', '.header__icon--cart',
      '[data-action="open-cart"]', '[aria-controls*="cart"]',
      '[data-cart-toggle]', '[data-cart-trigger]',
      '[data-drawer-target="cart-drawer"]'
    ];
 
    document.querySelectorAll(selectors.join(",")).forEach(interceptCartLinks);
  }
 
  /* ------------------------------
      MUTATION OBSERVER (ATC)
  ------------------------------ */
  const obs2 = new MutationObserver(() => {
    bindATCButtons();
    bindProductForms();
    bindCartLinks();
  });
 
  obs2.observe(document.body, { childList: true, subtree: true });
 
  /* ------------------------------
      INITIALIZE ATC INTERCEPTOR
  ------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    bindATCButtons();
    bindProductForms();
    bindCartLinks();
  });
 
})();
