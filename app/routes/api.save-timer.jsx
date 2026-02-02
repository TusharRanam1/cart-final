import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

/* ------------------ Save metafield helper ------------------ */
async function setMetafield(admin, shopId, key, valueObj) {
  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key type value }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        namespace: "optimaio_cart",
        key,
        type: "json",
        ownerId: shopId,
        value: JSON.stringify(valueObj),
      },
    ],
  };

  const res = await admin.graphql(mutation, { variables });
  const data = await res.json();

  const errors = data?.data?.metafieldsSet?.userErrors;
  if (errors?.length) {
    log.error("Timer metafield save failed", {
      event: "timer.metafield.save.failed",
      shopId,
      errors,
    });
  } else {
    log.info("Timer metafield saved", {
      event: "timer.metafield.save.success",
      shopId,
      metafieldId: data.data.metafieldsSet.metafields[0]?.id,
    });
  }

  return data;
}

/* ------------------ API ACTION ------------------ */
export const action = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Save cart timer request received", {
        event: "timer.save.received",
      });

      const { admin } = await authenticate.admin(request);

      const body = await request.json();

      log.debug("Save timer API invoked", {
        event: "timer.save.debug",
      });
      const {
        timerConfig,
        timerText,
        expiredMessage,
        afterAction,
        status,
        activeDates,
      } = body;

      // Fetch Shop ID
      const shopRes = await admin.graphql(`{ shop { id } }`);
      const shopJson = await shopRes.json();
      const shopId = shopJson.data.shop.id;

      if (!shopId) {
        log.error("Shop ID not resolved for timer save", {
          event: "timer.save.shop_missing",
        });

        return json({ ok: false, error: "Shop not found" }, { status: 500 });
      }

      // Build metafield object
      const timerSettings = {
        timerConfig,
        timerText,
        expiredMessage,
        afterAction,
        status,
        activeDates,
        updatedAt: new Date().toISOString(),
      };

      log.info("Saving cart timer settings", {
        event: "timer.save.start",
        shopId,
        status,
      });

      // Save metafield
      await setMetafield(admin, shopId, "cart_timer_settings", timerSettings);

      log.info("Cart timer saved successfully", {
        event: "timer.save.success",
        shopId,
      });

      return json({ ok: true, saved: timerSettings });
    } catch (err) {
      log.error("Save cart timer failed", {
        event: "timer.save.exception",
        error: err,
      });

      return json({ ok: false, error: err.message }, { status: 500 });
    }
  });
};
