import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

export const loader = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Fetch currencies metafield request received", {
        event: "currencies.fetch.received",
      });

      const { admin, session } = await authenticate.admin(request);
      const shop = session.shop;

      log.info("Fetching currencies metafield from Shopify", {
        event: "currencies.fetch.start",
        shop,
      });

      const query = `
        query {
          shop {
            metafield(namespace: "optimaio_cart", key: "currencies") {
              id
              namespace
              key
              type
              value
              updatedAt
            }
          }
        }
      `;

      const res = await admin.graphql(query);
      const data = await res.json();

      const metafield = data?.data?.shop?.metafield;

      if (!metafield?.value) {
        log.info("Currencies metafield not found, using defaults", {
          event: "currencies.fetch.empty",
          shop,
        });

        return json({
          ok: true,
          currencies: [{ code: "INR", format: "₹ {{amount}}" }],
          defaultCurrency: "INR",
          showDecimals: "no",
          empty: true,
        });
      }

      let parsed;
      try {
        parsed = JSON.parse(metafield.value);
      } catch (err) {
        log.error("Failed to parse currencies metafield JSON", {
          event: "currencies.fetch.parse_failed",
          shop,
          rawValue: metafield.value,
        });

        parsed = {
          currencies: [{ code: "INR", format: "₹ {{amount}}" }],
          defaultCurrency: "INR",
          showDecimals: "no",
        };
      }

      log.info("Currencies metafield fetched successfully", {
        event: "currencies.fetch.success",
        shop,
        currencyCount: parsed.currencies?.length || 0,
      });

      return json({
        ok: true,
        currencies: parsed.currencies,
        defaultCurrency: parsed.defaultCurrency,
        showDecimals: parsed.showDecimals || "no",
        updatedAt: metafield.updatedAt,
      });
    } catch (err) {
      log.error("Currencies loader failed", {
        event: "currencies.fetch.exception",
        error: err,
      });

      return json(
        { ok: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  });
};
