// app/api/cart-settings.jsx (or /save.jsx)
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/* ------------------ Helper: Save metafield ------------------ */
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

  return await admin.graphql(mutation, { variables });
}

/* ------------------ SAVE CART SETTINGS ROUTE ------------------ */
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // FIX: read JSON instead of FormData
  const body = await request.json();

  const settings = {
    theme: body.selectedTheme || "theme1",
    bannerStyle: body.bannerStyle || {},
    colors: body.colors || {},
    customCSS: body.customCSS || "",
    customJS: body.customJS || "",
    zIndex: body.zIndex || "auto",
  };

  // Fetch shop ID
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  // Save to metafield
  await setMetafield(admin, shopId, "cart_settings", settings);

  return json({ ok: true, saved: settings });
};
