import { authenticate } from "../shopify.server";

export const loader = () =>
  Response.json({ message: "👋 Webhook endpoint: POST only." });

export const action = async ({ request }) => {
  // 🧠 Authenticate and extract webhook context
  const { topic, admin, payload, session, shop } = await authenticate.webhook(request);

  console.log(`🧭 ${topic} webhook received for ${shop}`);

  // Webhooks can trigger after uninstall
  if (!session) {
    console.warn("⚠️ No active session found. Shop may have uninstalled.");
    throw new Response();
  }

  try {
    // 🧠 Example: Query latest Markets list after any create/update/delete
    if (
      topic === "MARKETS_CREATE" ||
      topic === "MARKETS_UPDATE" ||
      topic === "MARKETS_DELETE"
    ) {
      console.log(`📦 Fetching markets for shop ${shop}...`);

      const response = await admin.graphql(`#graphql
        query GetMarkets {
          markets(first: 10) {
            nodes {
              id
              name
              status
              handle
            }
          }
        }
      `);

      const data = await response.json();

      // Log what you received
      console.log("🌍 Markets data:", JSON.stringify(data.data.markets.nodes, null, 2));

      // ✅ OPTIONAL: Store to metafield, database, or other backend
     await storeMarketsInMetafield(admin, data.data.markets.nodes);
    }
  } catch (err) {
    console.error("🚨 Error handling markets webhook:", err);
  }

  // Respond 200 OK (important to prevent retries)
  return new Response("OK", { status: 200 });
};

/* ---------------- OPTIONAL: Store all markets in metafield ---------------- */
async function storeMarketsInMetafield(admin, markets) {
  try {
    const shopRes = await admin.graphql(`{ shop { id } }`);
    const shopData = await shopRes.json();
    const shopId = shopData.data.shop.id;

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
          key: "markets_list",
          type: "json",
          ownerId: shopId,
          value: JSON.stringify(markets),
        },
      ],
    };

    const result = await admin.graphql(mutation, { variables });
    const json = await result.json();

    if (json.data.metafieldsSet.userErrors?.length) {
      console.error("⚠️ Metafield save errors:", json.data.metafieldsSet.userErrors);
    } else {
      console.log("✅ Stored markets in metafield successfully.");
    }
  } catch (err) {
    console.error("❌ Error saving markets to metafield:", err);
  }
}
