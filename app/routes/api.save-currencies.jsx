import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

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
        namespace: "optimaio_cart", // ✅ fixed namespace
        key: "currencies",          // ✅ fixed key
        type: "json",
        ownerId: shopId,            // ✅ gid://shopify/Shop/xxxxxx
        value: JSON.stringify(valueObj),
      },
    ],
  };

  const res = await admin.graphql(mutation, { variables });
  const data = await res.json();
  return data;
}

/* ---------- Main Action ---------- */
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Get the Shop ID (required for metafields)
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  // Parse request JSON
  const body = await request.json();
  const { currencies, defaultCurrency , showDecimals} = body;

  // Build metafield value object
  const valueObj = {
    currencies,
    defaultCurrency,
      showDecimals, // ✅ SAVE THIS
    updatedAt: new Date().toISOString(),
  };

  // Save metafield
  const result = await setMetafield(admin, shopId, valueObj);

  const userErrors = result?.data?.metafieldsSet?.userErrors;
  if (userErrors?.length) {
    console.error("❌ Metafield save error:", userErrors);
    return json({ ok: false, errors: userErrors }, { status: 400 });
  }

  console.log("✅ Metafield saved successfully:", result?.data?.metafieldsSet?.metafields?.[0]);

  return json({
    ok: true,
    metafield: result?.data?.metafieldsSet?.metafields?.[0],
  });
};
