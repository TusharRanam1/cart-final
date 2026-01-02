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
  const body = await request.json();

  // 1️⃣ Fetch shop ID
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  // 2️⃣ Fetch existing cart_settings metafield
  const existingRes = await admin.graphql(`
    query {
      shop {
        metafield(namespace: "optimaio_cart", key: "cart_settings") {
          value
        }
      }
    }
  `);

  const existingJson = await existingRes.json();

  let existingSettings = {};
  if (existingJson?.data?.shop?.metafield?.value) {
    try {
      existingSettings = JSON.parse(
        existingJson.data.shop.metafield.value
      );
    } catch (e) {}
  }

  // 3️⃣ Merge settings (IMPORTANT)
// 3️⃣ Merge settings
let mergedSettings = {
  ...existingSettings,
  theme: body.selectedTheme ?? existingSettings.theme,
  customCSS: body.customCSS ?? existingSettings.customCSS,
  customJS: body.customJS ?? existingSettings.customJS,
  zIndex: body.zIndex ?? existingSettings.zIndex,
};

// 🔥 If theme changed → DELETE bannerStyle & colors
if (body.themeChanged) {
  delete mergedSettings.bannerStyle;
  delete mergedSettings.colors;
} else {
  // Normal behavior (no theme change)
  mergedSettings.bannerStyle =
    body.bannerStyle ?? existingSettings.bannerStyle;

  mergedSettings.colors = {
    ...existingSettings.colors,
    ...body.colors,
  };
}


  // 4️⃣ Save merged JSON back
  await setMetafield(admin, shopId, "cart_settings", mergedSettings);

  return json({ ok: true, saved: mergedSettings });
};