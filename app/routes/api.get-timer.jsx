import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

export const loader = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Fetch cart timer request received", {
        event: "timer.fetch.received",
      });

      const { admin, session } = await authenticate.admin(request);
      const shop = session.shop;

      log.info("Fetching cart timer metafield", {
        event: "timer.fetch.start",
        shop,
      });

      // 1️⃣ Get shop ID
      const shopRes = await admin.graphql(`
        {
          shop {
            id
          }
        }
      `);

      const shopJson = await shopRes.json();
      const shopId = shopJson?.data?.shop?.id;

      if (!shopId) {
        log.error("Shop ID not resolved for timer fetch", {
          event: "timer.fetch.shop_missing",
          shop,
        });

        return json({ ok: false, error: "Shop not found" }, { status: 500 });
      }

      // 2️⃣ Read metafield
      const metafieldRes = await admin.graphql(`
        {
          shop {
            metafield(
              namespace: "optimaio_cart"
              key: "cart_timer_settings"
            ) {
              id
              value
            }
          }
        }
      `);

      const metafieldJson = await metafieldRes.json();
      const rawValue = metafieldJson?.data?.shop?.metafield?.value;

      if (!rawValue) {
        log.info("Cart timer metafield not set", {
          event: "timer.fetch.empty",
          shop,
        });

        return json({ ok: true, data: null });
      }

      let parsedValue;
      try {
        parsedValue = JSON.parse(rawValue);
      } catch (err) {
        log.error("Failed to parse cart timer metafield JSON", {
          event: "timer.fetch.parse_failed",
          shop,
          rawValue,
        });

        return json(
          { ok: false, error: "Invalid timer configuration" },
          { status: 500 },
        );
      }

      log.info("Cart timer fetched successfully", {
        event: "timer.fetch.success",
        shop,
      });

      return json({
        ok: true,
        data: parsedValue,
      });
    } catch (err) {
      log.error("Cart timer loader failed", {
        event: "timer.fetch.exception",
        error: err,
      });

      return json(
        { ok: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  });
};
