export const loader = () => null;

export default function CornerCartPreview() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />

        {/* Shopify Base Reset + Typography + Layout */}
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/shopifycloud/web/assets/v1/global.css"
        />

        {/* Patch missing Shopify global variables */}
        <style>{`
          :root {
            --color-background: #ffffff;
            --color-foreground: #111111;
            --color-accent: #000000;
            --color-border: #e5e5e5;

            --font-body-family: Inter, sans-serif;
            --radius-base: 10px;
            --shadow-base: 0 3px 12px rgba(0,0,0,0.1);

            --spacing-xs: 4px;
            --spacing-sm: 8px;
            --spacing-md: 16px;
            --spacing-lg: 24px;
          }

          *, *::before, *::after {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Inter, sans-serif;
            background: #fafafa;
          }
        `}</style>

        {/* Your Optimaio core CSS */}
        <link
          rel="stylesheet"
          href="https://mysql-aims-board-airline.trycloudflare.com/optimaio-core.css"
        />

        {/* Your Optimaio theme CSS */}
        <link
          rel="stylesheet"
          href="https://mysql-aims-board-airline.trycloudflare.com/optimaio-theme-minimal.css"
        />

        {/* Fix for corner cart icon in preview */}
        <style>{`
          #optimaio-corner-cart {
            font-family: Inter, sans-serif;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            border-radius: 40px;
            font-size: 14px;
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--btn-bg);
            color: var(--btn-color);
            cursor: pointer;
            z-index: 99999;
          }
        `}</style>

        {/* PREVIEW MODE FIX: mock Shopify APIs + force-open drawer */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__OPTIMAIO_ADMIN_PREVIEW__ = true;

              const originalFetch = window.fetch;
              window.fetch = (...args) => {
                if (args[0] === "/cart.js") {
                  return Promise.resolve(
                    new Response(JSON.stringify({
                      items: [
                        {
                          title: "Preview Product",
                          quantity: 1,
                          final_line_price: 25900,
                          original_line_price: 25900,
                          image:
                            "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png",
                          product_title: "Preview Product",
                          variant_title: "",
                          key: "preview-key"
                        }
                      ],
                      total_price: 25900,
                      original_total_price: 25900,
                      item_count: 1
                    }), { headers: { "Content-Type": "application/json" } })
                  );
                }

                if (args[0].includes("/recommendations/products.json")) {
                  return Promise.resolve(
                    new Response(JSON.stringify({ products: [] }), {
                      headers: { "Content-Type": "application/json" }
                    })
                  );
                }

                return originalFetch(...args);
              };

              document.addEventListener("DOMContentLoaded", () => {
                setTimeout(() => {
                  document.dispatchEvent(new Event("optimaio:cart:refresh"));
                  const drawer = document.getElementById("optimaio-cart-drawer");
                  if (drawer) drawer.classList.add("open");
                }, 400);
              });
            `,
          }}
        />
      </head>

      <body>
        {/* MOCK SHOPIFY GLOBAL VARS */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__optimaioMoneyFormat = "₹{{amount}}";
              window.__CUSTOMER_ID__ = "preview-customer";
              window.__CUSTOMER_EMAIL__ = "preview@example.com";
              window.__SHOP_DOMAIN__ = "preview-shop.myshopify.com";
            `,
          }}
        />

        {/* Corner Floating Cart Icon */}
        <div id="optimaio-corner-cart">
          🛒 <span id="optimaio-corner-cart-count">1</span>
        </div>

        {/* MAIN CART DRAWER HTML */}
        <div
          id="optimaio-cart-drawer"
          class="optimaio-cart-drawer"
          data-active-tab="cart"
        >
          <div class="optimaio-cart-drawer__header">
            <h2>My Cart</h2>
            <button type="button" class="optimaio-cart-drawer__close">×</button>
          </div>

          <div class="optimaio-cart-drawer__middle">
            <div
              class="optimaio-cart-tab optimaio-cart-tab--cart"
              data-tab="cart"
            >
              <div id="optimaio-progress-container"></div>

              <div class="optimaio-cart-drawer__items">
                <p>Preview item goes here…</p>
              </div>

              <div class="optimaio-cart-drawer__recommendations">
                <h3>You might also like</h3>
                <div class="optimaio-recommendations-list"></div>
              </div>
            </div>

            <div
              class="optimaio-cart-tab optimaio-cart-tab--offers"
              data-tab="offers"
            >
              <div id="optimaio-offers-section" class="optimaio-offers-section">
                <h3>Exclusive Offers 🎉</h3>
                <ul id="optimaio-offers-list">
                  <li>Loading offers…</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="optimaio-cart-drawer__summary-checkout">
            <div class="optimaio-cart-drawer__summary">
              <div class="optimaio-discount-row">
                <span class="optimaio-discount-label">Discount:</span>
                <span class="optimaio-discount-amount">₹0</span>
              </div>

              <div class="optimaio-total-row">
                <span class="optimaio-total-label">Total:</span>
                <span class="optimaio-total-amount">₹650</span>
              </div>
            </div>

            <button class="optimaio-checkout-btn">Proceed to Checkout</button>
          </div>

          <div class="optimaio-cart-drawer__footer">
            <button class="optimaio-tab-btn active" data-target="cart">
              🛒 Cart
            </button>
            <button class="optimaio-tab-btn" data-target="offers">
              🎁 Offers
            </button>
          </div>
        </div>

        {/* REAL OPTIMAIO JS */}
        <script
          src="https://mysql-aims-board-airline.trycloudflare.com/optimaio.js"
          defer
        ></script>
        <script
          src="https://mysql-aims-board-airline.trycloudflare.com/free-gift.js"
          defer
        ></script>
        <script
          src="https://mysql-aims-board-airline.trycloudflare.com/bxgy.js"
          defer
        ></script>
      </body>
    </html>
  );
}
