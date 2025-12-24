import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

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
  return await res.json();
}

/* ------------------ API ACTION ------------------ */
export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    const body = await request.json();

    console.log("Save timer api working");
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

    // Save metafield
    await setMetafield(admin, shopId, "cart_timer_settings", timerSettings);

    return json({ ok: true, saved: timerSettings });

  } catch (err) {
    return json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
};
