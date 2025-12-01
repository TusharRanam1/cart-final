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

 
/* -------------------------------------------------------------
   INTERCEPT ALL SHOPIFY CART ACTIONS
   Covers:
   - /cart/add.js
   - /cart/change.js
   - /cart/update.js
   - /cart/clear.js
   (100% of cart change events)
------------------------------------------------------------- */
(function () {
  const nativeFetch = window.fetch;
 
  window.fetch = async (...args) => {
    const result = await nativeFetch(...args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
 
    if (/\/cart\/(add|change|update|clear)/.test(url)) {
      window.OptimaioCartController.scheduleRefresh();
    }
 
    return result;
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
      document.getElementById("optimaio-corner-cart-count").textContent = cart.item_count;
 
      if (cart.item_count === 0) {
        itemsContainer.innerHTML = "";
        emptyState.style.display = "flex";
        totalEl.textContent = `${currencySymbol}0`;
        discountEl.textContent = `${currencySymbol}0`;
        document.querySelector(".optimaio-recommendations-list").innerHTML = "";
        return;
      }
 
      emptyState.style.display = "none";
 
      const itemsHTML = cart.items.map(item => `
        <div class="optimaio-cart-item-card ${item.properties?.isBXGYGift ? 'optimaio-free-gift' : ''}">
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
                <button class="optimaio-qty-btn" data-key="${item.key}" data-change="-1">−</button>
                <span class="optimaio-cart-item__qty">${item.quantity}</span>
                <button class="optimaio-qty-btn" data-key="${item.key}" data-change="1">+</button>
              </div>
 
              <div class="optimaio-cart-item__pricing">
                ${item.original_line_price > item.final_line_price
                  ? `<span class="optimaio-compare-at">${formatShopMoney(item.original_line_price)}</span>`
                  : ""}
                <span class="optimaio-price">${formatShopMoney(item.final_line_price)}</span>
              </div>
            </div>
 
            ${item.properties?.isBXGYGift
              ? `<div class="optimaio-cart-item__discount optimaio-free-gift-badge"><span>🎁 FREE GIFT</span></div>`
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
 
                <div class="optimaio-cart-item__discount optimaio-free-gift-badge"><span>🎁 FREE GIFT</span></div>
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
 
      if (cart.items.length) loadRecs(cart.items[0].product_id);
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
  renderCart(e.detail);
});
 
 
 
    /* ------------------------------
       QTY + REMOVE BUTTONS
    ------------------------------ */
    function bindItemButtons() {
      itemsContainer.querySelectorAll(".optimaio-qty-btn").forEach(btn => {
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
            .then(res => res.json().catch(() => getCart()))
            .then(cart => renderCart(cart))
            .finally(() => btn.disabled = false);
        };
      });
 
      itemsContainer.querySelectorAll(".optimaio-cart-item__remove").forEach(btn => {
        btn.onclick = async () => {
          btn.disabled = true;
 
          await fetch("/cart/change.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: btn.dataset.key, quantity: 0 })
          })
            .then(res => res.json())
            .then(cart => renderCart(cart))
            .finally(() => btn.disabled = false);
        };
      });
    }
 
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
function initAutoScrollRecommendations(startIndex = 0) {
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
 
  container.addEventListener("scroll", pauseScroll);
  container.addEventListener("touchstart", pauseScroll);
  container.addEventListener("touchmove", pauseScroll);
  container.addEventListener("mousedown", pauseScroll);
 
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
async function loadRecs(productId) {
  const container = document.querySelector(".optimaio-recommendations-list");
  if (!container) return;
 
  // Save current card before rebuild
  const currentIndex = getCurrentCardIndex(container);
 
  // Fetch new recommendations
  const res = await fetch(
    `/recommendations/products.json?product_id=${productId}&intent=complementary&limit=4`
  );
  const data = await res.json();
 
  const section = document.querySelector(".optimaio-cart-drawer__recommendations");
 
// Hide when no products
if (!data.products.length) {
  container.innerHTML = "";
  if (section) section.style.display = "none";
  return;
}
 
// Show when products exist
if (section) section.style.display = "";
 
 
  /* --------------------------
     BUILD HTML
  --------------------------*/
  container.innerHTML = data.products.map(p => `
    <div class="optimaio-recommendation-card">
      <div class="optimaio-rec-image">
        <img src="${p.featured_image}" alt="${p.title}">
      </div>
 
      <div class="optimaio-rec-content">
        <p class="optimaio-rec-title">${p.title}</p>
        <p class="optimaio-rec-price">${formatShopMoney(p.variants[0].price)}</p>
      </div>
 
      <button class="optimaio-rec-add" data-id="${p.variants[0].id}">
        Add
      </button>
    </div>
  `).join("");
 
  /* --------------------------
     ADD-TO-CART BUTTONS
  --------------------------*/
  container.querySelectorAll(".optimaio-rec-add").forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
 
      await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: btn.dataset.id, quantity: 1 })
      })
      .then(() => window.OptimaioCartController.refresh())
 
      .finally(() => btn.disabled = false);
    };
  });
 
  /* --------------------------
     RESTART AUTO SCROLL
     FROM SAME CARD
  --------------------------*/
  initAutoScrollRecommendations(currentIndex);
}
 
 
    /* ------------------------------
       OPEN / CLOSE DRAWER
    ------------------------------ */
    function openDrawer() {
  window.optimaioClearEffects();
  window.OptimaioCartController.refresh();
  drawer.classList.add("open");
}
 
 
    function closeDrawer() {
      drawer.classList.remove("open");
      window.optimaioClearEffects();
    }
 
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
    const drawer = getDrawer();
    if (!drawer) return;
 
    window.optimaioClearEffects();
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