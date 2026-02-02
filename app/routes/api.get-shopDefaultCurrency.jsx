import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

export const loader = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Fetch shop currency request received", {
        event: "shop.currency.fetch.received",
      });

      const { admin, session } = await authenticate.admin(request);
      const shop = session.shop;

      const query = `
        query shopCurrency {
          shop {
            currencyCode
          }
        }
      `;

      log.info("Fetching shop currency from Shopify", {
        event: "shop.currency.fetch.start",
        shop,
      });

      const response = await admin.graphql(query);
      const data = await response.json();

      const currencyCode = data?.data?.shop?.currencyCode;

      if (!currencyCode) {
        log.warn("Shop currency not returned, using fallback", {
          event: "shop.currency.fetch.fallback",
          shop,
        });
      }

      log.info("Shop currency fetched successfully", {
        event: "shop.currency.fetch.success",
        shop,
        currencyCode: currencyCode || "USD",
      });

      return json({
        ok: true,
        currencyCode: currencyCode || "USD",
      });
    } catch (error) {
      log.error("Failed to fetch shop currency", {
        event: "shop.currency.fetch.exception",
        error,
      });

      return json({ ok: false, currencyCode: "USD" }, { status: 500 });
    }
  });
};
