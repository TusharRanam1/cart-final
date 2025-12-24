import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    // 1️⃣ Get shop ID
    const shopRes = await admin.graphql(`
      {
        shop {
          id
        }
      }
    `);

    const shopJson = await shopRes.json();
    const shopId = shopJson.data.shop.id;

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

    const rawValue =
      metafieldJson?.data?.shop?.metafield?.value;

    if (!rawValue) {
      return json({ ok: true, data: null });
    }

    // 3️⃣ Parse JSON safely
    const parsedValue = JSON.parse(rawValue);

    return json({
      ok: true,
      data: parsedValue,
    });
  } catch (error) {
    console.error("🔥 GET TIMER ERROR:", error);

    return json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
};
