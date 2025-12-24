// app/routes/optimaio-cart.jsx
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    // Public proxy call
    const { admin } = await authenticate.public.appProxy(request);

    if (!admin) {
      console.error("❌ Missing admin context – invalid app proxy signature");
      return new Response(JSON.stringify({ error: "Unauthorized app proxy" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const gql = await admin.graphql(`
      query {
        shop {
          metafield(namespace: "optimaio_cart", key: "campaigns") {
            value
          }
        }
      }
    `);

    const json = await gql.json();
    const raw = json?.data?.shop?.metafield?.value || "{}";

    let parsed = {};
    try {
      parsed = JSON.parse(raw || "{}");
    } catch (e) {
      console.error("Invalid metafield JSON", e);
      parsed = {};
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("⚠️ optimaio-cart loader failed:", err);
    return new Response(
      JSON.stringify({ error: "Server error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
