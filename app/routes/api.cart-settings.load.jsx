import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

export const loader = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Fetch cart settings request received", {
        event: "cart.settings.fetch.received",
      });

      const { admin, session } = await authenticate.admin(request);
      const shop = session.shop;

      log.info("Fetching cart settings metafield", {
        event: "cart.settings.fetch.start",
        shop,
      });

      const query = `
        query {
          shop {
            metafield(namespace: "optimaio_cart", key: "cart_settings") {
              value
            }
          }
        }
      `;

      const res = await admin.graphql(query);
      const data = await res.json();

      let settings = {
        theme: "theme1",
        announcementBar: {
          messages: [],
          autoScroll: false,
        },

        cartTexts: {
          header: {
            cartHeaderText: "My Cart",
          },
          footer: {
            cartButtonText: "Cart",
            offersButtonText: "Offers",
          },
          side: {
            discountText: "Discount",
            totalText: "Total",
            addNoteButtonText: "Add note",
            discountCodeButtonText: "Discount",
            checkoutButtonText: "Proceed to Checkout",
          },
          offers: {
            badgeLockedText: "Locked",
            badgeUnlockedText: "Unlocked",
            offerHeaderText: "Exclusive Offers",
          },
        },

        bannerStyle: {},
        colors: {},
        customCSS: "",
        customJS: "",
        zIndex: "auto",
      };

      const rawValue = data?.data?.shop?.metafield?.value;

      if (rawValue) {
        try {
          const parsed = JSON.parse(rawValue);

          settings = {
            ...settings, // defaults
            ...parsed,
            cartTexts: {
              ...settings.cartTexts,
              ...(parsed.cartTexts || {}),
            },
          };
        } catch (err) {
          log.warn("Failed to parse cart settings metafield JSON", {
            event: "cart.settings.parse_failed",
            shop,
            rawValue,
          });
        }
      } else {
        log.info("Cart settings metafield not found, using defaults", {
          event: "cart.settings.fetch.empty",
          shop,
        });
      }

      log.info("Cart settings fetched successfully", {
        event: "cart.settings.fetch.success",
        shop,
      });

      return json({ settings });
    } catch (err) {
      log.error("Cart settings loader failed", {
        event: "cart.settings.fetch.exception",
        error: err,
      });

      return json({ error: "Internal server error" }, { status: 500 });
    }
  });
};
