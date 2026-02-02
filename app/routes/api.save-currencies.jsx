import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

/* ---------- Helper: Save metafield ---------- */
async function setMetafield(admin, shopId, valueObj) {
  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          type
          value
          updatedAt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        namespace: "optimaio_cart",
        key: "currencies",
        type: "json",
        ownerId: shopId,
        value: JSON.stringify(valueObj),
      },
    ],
  };

  const res = await admin.graphql(mutation, { variables });
  return res.json();
}

/* ---------- Main Action ---------- */
export const action = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Save currencies request received", {
        event: "currencies.save.received",
      });

      const { admin } = await authenticate.admin(request);

      // Fetch Shop ID
      const shopRes = await admin.graphql(`{ shop { id } }`);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (!shopId) {
        log.error("Shop ID not resolved for currencies save", {
          event: "currencies.save.shop_missing",
        });

        return json({ ok: false, error: "Shop not found" }, { status: 500 });
      }

      // Parse request JSON
      const body = await request.json();
      const { currencies, defaultCurrency, showDecimals } = body;

      const valueObj = {
        currencies,
        defaultCurrency,
        showDecimals,
        updatedAt: new Date().toISOString(),
      };

      log.info("Saving currencies metafield", {
        event: "currencies.save.start",
        shopId,
        currencyCount: Array.isArray(currencies) ? currencies.length : 0,
        defaultCurrency,
      });

      const result = await setMetafield(admin, shopId, valueObj);

      const userErrors = result?.data?.metafieldsSet?.userErrors;
      if (userErrors?.length) {
        log.error("Currencies metafield save failed", {
          event: "currencies.save.failed",
          shopId,
          errors: userErrors,
        });

        return json({ ok: false, errors: userErrors }, { status: 400 });
      }

      const metafield = result?.data?.metafieldsSet?.metafields?.[0];

      log.info("Currencies metafield saved successfully", {
        event: "currencies.save.success",
        shopId,
        metafieldId: metafield?.id,
      });

      return json({
        ok: true,
        metafield,
      });
    } catch (err) {
      log.error("Currencies save API failed", {
        event: "currencies.save.exception",
        error: err,
      });

      return json(
        { ok: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  });
};
