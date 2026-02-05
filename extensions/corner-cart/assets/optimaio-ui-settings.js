(function runWhenReady(fn) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fn);
    } else {
        fn();
    }
})(function () {

    // Cart page detettion js


    (function () {
        /* ----------------------------------
           1️⃣ Detect cart page
        ---------------------------------- */
        const isCartPage =
            location.pathname === "/cart" ||
            document.body.classList.contains("template-cart");

        if (!isCartPage) return;

        /* ----------------------------------
           2️⃣ Mark page context
        ---------------------------------- */
        document.body.classList.add("optimaio-cart-page-context");



        /* ----------------------------------
           3️⃣ Locate drawer
        ---------------------------------- */
        const drawer = document.getElementById("optimaio-cart-drawer");
        if (!drawer) return;

        /* ----------------------------------
           4️⃣ Move drawer into <main>
        ---------------------------------- */
        const main =
            document.querySelector("main") ||
            document.getElementById("MainContent");

        if (main && !main.contains(drawer)) {
            main.prepend(drawer);
        }

        /* ----------------------------------
           5️⃣ Switch to PAGE mode
           (⚠️ DO NOT remove .open anymore)
        ---------------------------------- */
        drawer.classList.add("optimaio-cart-page");
        drawer.classList.add("open"); // ✅ REQUIRED for CSS + logic
        drawer.setAttribute("data-context", "page");

        /* ----------------------------------
           6️⃣ 🔥 FORCE FULL INIT (REAL FIX)
        ---------------------------------- */
        function forceOptimaioInit() {
            // 1️⃣ Logical open flag (internal guards)
            window.__OPTIMAIO_DRAWER_OPEN__ = true;

            // 2️⃣ Force cart render
            if (typeof window.getCartAndRender === "function") {
                window.getCartAndRender();
            }

            // 3️⃣ Force controller refresh (items, gifts, progress)
            window.OptimaioCartController?.refresh();

            // 4️⃣ Fire lifecycle event (observers, BXGY, progress bar)
            document.dispatchEvent(
                new CustomEvent("optimaio:open", {
                    detail: { context: "page", silent: true }
                })
            );
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", forceOptimaioInit);
        } else {
            forceOptimaioInit();
        }
    })();

    // Theme color banners ,button,progrees bar color js


    (function () {
        function applyOptimaioTheme() {
            const settings = window.__OPTIMAIO_CART__?.settings || {};
            const theme = settings.theme || "theme1";
            const bannerStyle = settings.bannerStyle || {};

            const roots = [
                document.getElementById("optimaio-cart-drawer"),
                document.getElementById("optimaio-corner-cart")
            ].filter(Boolean);

            if (!roots.length) return;

            /* ----------------------------
            1️⃣ Apply theme (SYNC ROOT)
         ---------------------------- */
            document.body.setAttribute("data-optimaio-theme", theme);

            roots.forEach(root => {
                root.setAttribute("data-optimaio-theme", theme);
            });


            /* ----------------------------
               2️⃣ Apply banner style
               Priority: image → gradient → solid
            ---------------------------- */
            roots.forEach(root => {
                // reset first
                if (root.id === "optimaio-corner-cart") return; // 👈 ADD THIS LINE
                root.style.background = "";
                root.style.backgroundImage = "";

                if (bannerStyle.bannerType === "image" && bannerStyle.imageUrl) {
                    root.style.backgroundImage = `url(${bannerStyle.imageUrl})`;
                    root.style.backgroundSize = "cover";
                    root.style.backgroundPosition = "center";
                    root.style.backgroundRepeat = "no-repeat";

                } else if (
                    bannerStyle.bannerType === "gradient" &&
                    bannerStyle.gradientStart &&
                    bannerStyle.gradientEnd
                ) {
                    root.style.background = `linear-gradient(135deg, ${bannerStyle.gradientStart}, ${bannerStyle.gradientEnd})`;

                } else if (
                    bannerStyle.bannerType === "solid" &&
                    bannerStyle.solidColor
                ) {
                    root.style.background = bannerStyle.solidColor;
                }
            });

            /* ----------------------------
               3️⃣ Apply color variables
            ---------------------------- */
            const colors = settings.colors || {};
            const variableMap = {
                buttonColor: "--accent",
                primaryColor: "--text-primary",
                secondaryColor: "--text-secondary"

            };

            /* ----------------------------
         Progress gradient (OPT-IN)
      ---------------------------- */
            roots.forEach(root => {
                // reset first
                root.style.removeProperty("--progress-start");
                root.style.removeProperty("--progress-end");
                root.removeAttribute("data-progress-gradient");

                // apply only if BOTH provided
                if (colors.progressStart && colors.progressEnd) {
                    root.style.setProperty("--progress-start", colors.progressStart);
                    root.style.setProperty("--progress-end", colors.progressEnd);
                    root.setAttribute("data-progress-gradient", "true");
                }
            });


            roots.forEach(root => {
                Object.entries(variableMap).forEach(([key, cssVar]) => {
                    if (colors[key]) {
                        root.style.setProperty(cssVar, colors[key]);
                    }
                });
            });

            /* ----------------------------
               4️⃣ Custom CSS (TOP priority)
            ---------------------------- */
            if (settings.customCSS?.trim()) {
                let style = document.getElementById("optimaio-custom-css");
                if (!style) {
                    style = document.createElement("style");
                    style.id = "optimaio-custom-css";
                    document.head.appendChild(style);
                }
                style.textContent = settings.customCSS;
            }
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", applyOptimaioTheme);
        } else {
            applyOptimaioTheme();
        }
    })();




    //   z-indexxx js


    (function () {
        const settings = window.__OPTIMAIO_CART__?.settings || {};
        const zIndex = settings.zIndex;

        if (!zIndex || zIndex === "auto") return;

        const z = Number(zIndex);
        if (isNaN(z)) return;

        const drawer = document.getElementById("optimaio-cart-drawer");
        const corner = document.getElementById("optimaio-corner-cart");

        if (drawer) drawer.style.setProperty("--optimaio-z-index", z);
        if (corner) corner.style.setProperty("--optimaio-z-index", z);
    })();



    //   Dynamic txtttt


    (function () {
        function applyCartTexts() {
            const texts = window.__OPTIMAIO_CART__?.settings?.cartTexts;
            if (!texts) return;

            /* =============================
               CART — HEADER
            ============================= */
            if (texts.header?.cartHeaderText) {
                const title = document.querySelector(".optimaio-cart-tile");
                if (title) title.textContent = texts.header.cartHeaderText;
            }

            /* =============================
               CART — FOOTER TABS
            ============================= */
            if (texts.footer?.cartButtonText) {
                const cartTab = document.querySelector('.optimaio-tab-btn[data-target="cart"]');
                if (cartTab) {
                    cartTab.childNodes[cartTab.childNodes.length - 1].textContent =
                        " " + texts.footer.cartButtonText;
                }
            }

            if (texts.footer?.offersButtonText) {
                const offersTab = document.querySelector('.optimaio-tab-btn[data-target="offers"]');
                if (offersTab) {
                    offersTab.childNodes[offersTab.childNodes.length - 1].textContent =
                        " " + texts.footer.offersButtonText;
                }
            }

            /* =============================
               CART — SUMMARY + BUTTONS
            ============================= */
            if (texts.side?.discountText) {
                const el = document.querySelector(".optimaio-discount-label");
                if (el) el.textContent = texts.side.discountText + ":";
            }

            if (texts.side?.totalText) {
                const el = document.querySelector(".optimaio-total-label");
                if (el) el.textContent = texts.side.totalText + ":";
            }

            if (texts.side?.addNoteButtonText) {
                document
                    .querySelectorAll('.optimaio-action-btn[data-sheet="note"]')
                    .forEach(btn => {
                        btn.lastChild.textContent = " " + texts.side.addNoteButtonText;
                    });
            }

            if (texts.side?.discountCodeButtonText) {
                document
                    .querySelectorAll('.optimaio-action-btn[data-sheet="discount"]')
                    .forEach(btn => {
                        btn.lastChild.textContent = " " + texts.side.discountCodeButtonText;
                    });
            }

            if (texts.side?.checkoutButtonText) {
                const btn = document.querySelector(".optimaio-checkout-btn");
                if (btn) btn.textContent = texts.side.checkoutButtonText;
            }

            /* =============================
               OFFERS — TITLE + BADGES
               (NEW, minimal)
            ============================= */
            const offers = texts.offers;

            if (offers?.offerHeaderText) {
                const title = document.querySelector(".optimaio-offers-title");
                if (title) title.textContent = offers.offerHeaderText;
            }

            if (offers?.badgeLockedText) {
                document
                    .querySelectorAll(".optimaio-offer-badge.locked")
                    .forEach(el => {
                        el.textContent = offers.badgeLockedText;
                    });
            }

            if (offers?.badgeUnlockedText) {
                document
                    .querySelectorAll(".optimaio-offer-badge.unlocked")
                    .forEach(el => {
                        el.textContent = offers.badgeUnlockedText;
                    });
            }
        }

        /* Initial load */
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", applyCartTexts);
        } else {
            applyCartTexts();
        }

        /* Re-apply on dynamic updates */
        document.addEventListener("optimaio:open", applyCartTexts);
        document.addEventListener("optimaio:gifts:updated", applyCartTexts);
    })();



    //   floating cart widget


    (function () {
        const settings = window.__OPTIMAIO_CART__?.settings;
        const widget = settings?.cartWidget;

        const cart = document.getElementById("optimaio-corner-cart");
        if (!cart || !widget) return;

        /* ----------------------------
           1️⃣ Show / Hide
        ---------------------------- */
        if (!widget.showFloatingWidget) {
            cart.style.display = "none";
            return;
        }

        cart.style.display = "flex";

        /* ----------------------------
           2️⃣ Position (left / right)
        ---------------------------- */
        cart.classList.remove("position-left", "position-right");

        if (widget.position === "left") {
            cart.classList.add("position-left");
        } else {
            cart.classList.add("position-right"); // default
        }

        /* ----------------------------
           3️⃣ Widget Color
        ---------------------------- */
        if (widget.widgetColor) {
            cart.style.background = widget.widgetColor;
        }

    })();






    //   Order NOtes and Discount Js



    (function () {
        const sheet = document.getElementById("optimaio-sheet");
        const title = document.getElementById("optimaio-sheet-title");

        /* =============================
       FEATURE FLAGS
    ============================= */
        const settings = window.__OPTIMAIO_CART__?.settings || {};
        const features = settings.cartFeatures || {};

        const NOTES_ENABLED = features.orderNotes !== false;
        const DISCOUNT_ENABLED = features.discountCodeInput !== false;

        /* =============================
           VISIBILITY CONTROL
        ============================= */
        if (!NOTES_ENABLED) {
            document
                .querySelectorAll('.optimaio-action-btn[data-sheet="note"]')
                .forEach(el => el.style.display = "none");

            sheet
                .querySelectorAll('.optimaio-sheet-content[data-content="note"]')
                .forEach(el => el.remove());
        }

        if (!DISCOUNT_ENABLED) {
            document
                .querySelectorAll('.optimaio-action-btn[data-sheet="discount"]')
                .forEach(el => el.style.display = "none");

            sheet
                .querySelectorAll('.optimaio-sheet-content[data-content="discount"]')
                .forEach(el => el.remove());
        }


        if (!sheet) return;

        /* -----------------------------
           OPEN SHEET
        ----------------------------- */
        document.addEventListener("click", e => {
            const actionBtn = e.target.closest(".optimaio-action-btn");
            if (!actionBtn) return;

            const type = actionBtn.dataset.sheet;

            if (type === "note" && !NOTES_ENABLED) return;
            if (type === "discount" && !DISCOUNT_ENABLED) return;


            // Set title
            title.textContent =
                type === "note"
                    ? "Add note for seller"
                    : "Apply discount code";

            // Show correct content
            sheet.querySelectorAll(".optimaio-sheet-content").forEach(c => {
                c.classList.toggle("active", c.dataset.content === type);
            });

            sheet.classList.add("open");
        });

        /* -----------------------------
           CLOSE SHEET
        ----------------------------- */
        function closeSheet() {
            sheet.classList.remove("open");
        }

        document.addEventListener("click", e => {
            if (e.target.closest(".optimaio-sheet-close")) {
                closeSheet();
            }
        });

        /* -----------------------------
           SAVE NOTE (REAL SHOPIFY)
        ----------------------------- */
        document.addEventListener("click", async e => {
            const saveBtn = e.target.closest(".optimaio-sheet-primary");
            if (!saveBtn) return;
            if (!NOTES_ENABLED) return;


            const textarea = sheet.querySelector(".optimaio-note-textarea");
            if (!textarea) return;

            saveBtn.disabled = true;

            try {
                await fetch("/cart/update.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ note: textarea.value })
                });

                // Refresh cart UI safely
                window.OptimaioCartController?.refresh();

                closeSheet(); // ✅ FIXED: closes popup

            } catch (err) {
                console.error("Failed to save note", err);
            } finally {
                saveBtn.disabled = false;
            }
        });

        /* -----------------------------
           APPLY DISCOUNT (REAL SHOPIFY)
        ----------------------------- */
        document.addEventListener("click", e => {
            const applyBtn = e.target.closest(".optimaio-discount-apply");
            if (!applyBtn) return;
            if (!DISCOUNT_ENABLED) return;


            const input = sheet.querySelector(".optimaio-discount-input");
            if (!input || !input.value.trim()) return;

            applyBtn.disabled = true;

            // Official Shopify method
            window.location.href =
                "/discount/" + encodeURIComponent(input.value.trim());
        });



    })();




    //   Aouncement Bar js



    (function () {
        const announcement =
            window.__OPTIMAIO_CART__?.settings?.announcementBar;

        if (!announcement) return;

        const messages = Array.isArray(announcement.messages)
            ? announcement.messages.filter(Boolean)
            : [];

        if (!messages.length) return;

        const autoScroll = announcement.autoScroll === true;

        const viewport = document.getElementById("optimaio-announcement-viewport");
        if (!viewport) return;

        const bar = viewport.closest(".optimaio-announcement-bar");
        const prevBtn = bar.querySelector(".optimaio-announcement-arrow.left");
        const nextBtn = bar.querySelector(".optimaio-announcement-arrow.right");

        /* ----------------------------
           1️⃣ Render messages
        ---------------------------- */
        viewport.innerHTML = "";

        messages.forEach((text, i) => {
            const el = document.createElement("div");
            el.className = "optimaio-announcement-item";
            if (i === 0) el.classList.add("active");
            el.textContent = text;
            viewport.appendChild(el);
        });

        const items = viewport.querySelectorAll(".optimaio-announcement-item");
        let index = 0;

        /* ----------------------------
           2️⃣ AUTO SCROLL MODE
        ---------------------------- */
        if (autoScroll && items.length > 1) {
            prevBtn.style.display = "none";
            nextBtn.style.display = "none";

            if (window.__OPTIMAIO_ANNOUNCEMENT_TIMER__) {
                clearInterval(window.__OPTIMAIO_ANNOUNCEMENT_TIMER__);
            }

            window.__OPTIMAIO_ANNOUNCEMENT_TIMER__ = setInterval(() => {
                items[index].classList.remove("active");
                index = (index + 1) % items.length;
                items[index].classList.add("active");
            }, 4000);

            return;
        }

        /* ----------------------------
           3️⃣ MANUAL MODE (ARROWS)
        ---------------------------- */
        if (!autoScroll && items.length > 1) {
            prevBtn.style.display = "block";
            nextBtn.style.display = "block";

            function show(i) {
                items[index].classList.remove("active");
                index = (i + items.length) % items.length;
                items[index].classList.add("active");
            }

            prevBtn.onclick = () => show(index - 1);
            nextBtn.onclick = () => show(index + 1);
        }
    })();



    //   Scarcity Timmer js


    (function () {
        const data = window.__OPTIMAIO_CART__ || {};
        const timer = data.timer;

        /* ----------------------------
       🧹 CLEAR CART HELPER
    ---------------------------- */
        async function optimaioClearCart() {
            try {
                await fetch("/cart/clear.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });

                console.log("🧹 Optimaio: Cart cleared by timer");

                // Refresh Optimaio UI
                window.OptimaioCartController?.refresh();

                // Optional lifecycle event
                document.dispatchEvent(
                    new CustomEvent("optimaio:cart:cleared", {
                        detail: { source: "timer" }
                    })
                );

            } catch (err) {
                console.error("❌ Optimaio: Failed to clear cart", err);
            }
        }


        const container = document.getElementById("optimaio-countdown");

        if (!timer || timer.status !== "active") {
            if (container) container.remove();
            return;
        }

        // ✅ ADD THIS LINE
        container.style.display = "flex";

        const label = container.querySelector("#optimaio-countdown-label");
        if (label) {
            label.textContent = timer.timerText || "Offer ends in";
        }


        const boxes = container.querySelectorAll(".optimaio-time strong");
        const timeBlocks = container.querySelectorAll(".optimaio-time");

        if (boxes.length !== 4) return;

        const STORAGE_KEY = "optimaio_timer_start";

        /* ----------------------------
           Helpers
        ---------------------------- */
        function parseDate(date, time) {
            return new Date(`${date} ${time || "12:00 AM"}`).getTime();
        }

        function pad(n) {
            return String(n).padStart(2, "0");
        }

        /* ----------------------------
       ACTIVE DATES (VISIBILITY ONLY)
    ---------------------------- */
        let isVisible = true;
        const now = Date.now();

        if (timer.activeDates?.start?.date) {
            const start = parseDate(
                timer.activeDates.start.date,
                timer.activeDates.start.time
            );
            if (now < start) {
                isVisible = false;
            }
        }

        if (timer.activeDates?.end?.date) {
            const end = parseDate(
                timer.activeDates.end.date,
                timer.activeDates.end.time
            );
            if (now > end) {
                isVisible = false;
            }
        }

        container.style.display = isVisible ? "flex" : "none";

        /* ----------------------------
           DETERMINE END TIME
        ---------------------------- */
        let endTime;

        /* 🔁 MODE: DURATION (cart-based) */
        if (timer.timerConfig.timerMode === "duration") {
            let startTime = localStorage.getItem(STORAGE_KEY);

            // ⏱ First product added → start timer
            if (!startTime) {
                startTime = Date.now();
                localStorage.setItem(STORAGE_KEY, startTime);
            }

            const d = timer.timerConfig.duration;
            endTime =
                Number(startTime) +
                (+d.hours * 3600000) +
                (+d.minutes * 60000) +
                (+d.seconds * 1000);
        }

        /* 📅 MODE: SPECIFIC (fixed end time) */
        if (
            timer.timerConfig.timerMode === "specific" &&
            timer.timerConfig.activeDates?.end?.date
        ) {
            endTime = parseDate(
                timer.timerConfig.activeDates.end.date,
                timer.timerConfig.activeDates.end.time
            );
        }

        if (!endTime) return;

        /* ----------------------------
           COUNTDOWN LOOP
        ---------------------------- */
        let interval; // 👈 declare upfront

        function updateCountdown() {
            let diff = endTime - Date.now();

            if (diff <= 0) {
                if (interval) clearInterval(interval);

                const isDuration = timer.timerConfig.timerMode === "duration";
                const shouldLoop =
                    isDuration && timer.afterAction === "refresh";

                /* 🔁 LOOP ONLY */
                if (shouldLoop) {
                    const d = timer.timerConfig.duration;
                    const newStart = Date.now();

                    localStorage.setItem(STORAGE_KEY, newStart);

                    endTime =
                        newStart +
                        (+d.hours * 3600000) +
                        (+d.minutes * 60000) +
                        (+d.seconds * 1000);

                    updateCountdown();
                    interval = setInterval(updateCountdown, 1000);
                    return;
                }

                /* 🧹 CLEAR CART */
                if (timer.afterAction === "clear_cart") {
                    optimaioClearCart();
                }

                /* ❌ FINAL EXPIRE */
                localStorage.removeItem(STORAGE_KEY);

                if (timer.expiredMessage) {
                    container.textContent = timer.expiredMessage;
                } else {
                    container.style.display = "none";
                }

                return;
            }


            const days = Math.floor(diff / 86400000);
            diff -= days * 86400000;

            const hours = Math.floor(diff / 3600000);
            diff -= hours * 3600000;

            const minutes = Math.floor(diff / 60000);
            diff -= minutes * 60000;

            const seconds = Math.floor(diff / 1000);

            // ----------------------------
// Hide days / hours when zero
// ----------------------------

// DAYS
if (days <= 0) {
    timeBlocks[0].style.display = "none";
  } else {
    timeBlocks[0].style.display = "";
  }
  
  // HOURS (hide only if days are also hidden)
  if (days <= 0 && hours <= 0) {
    timeBlocks[1].style.display = "none";
  } else {
    timeBlocks[1].style.display = "";
  }
  

            boxes[0].textContent = pad(days);
            boxes[1].textContent = pad(hours);
            boxes[2].textContent = pad(minutes);
            boxes[3].textContent = pad(seconds);
        }

        // ✅ start loop AFTER declaration
        updateCountdown();
        interval = setInterval(updateCountdown, 1000);

    })();

});
