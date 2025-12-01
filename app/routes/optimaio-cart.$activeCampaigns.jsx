// app/routes/optimaio-cart.jsx
import { authenticate } from "../shopify.server";
import { createClient } from "redis";
 
const redis = createClient({
  username: "default",
  password: "TAqxfnXDpLQv9QG64FZNRsdk6Daq0xrL",
  socket: {
    host: "redis-16663.crce179.ap-south-1-1.ec2.cloud.redislabs.com",
    port: 16663,
  },
});
 
redis.on("error", (err) => console.error("Redis Error:", err));
await redis.connect();
 
// Safe JSON parser
function safeJsonParse(str, fallback = {}) {
  if (!str || typeof str !== "string") return fallback;
  try {
    const parsed = JSON.parse(str);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}
 
export const loader = async ({ request }) => {
  try {
    // Authenticate Shopify App Proxy
    const auth = await authenticate.public.appProxy(request);
    const { admin } = auth;
    let { shop } = auth;
 
    // Extract shop from URL as fallback
    const url = new URL(request.url);
    const shopFromQuery = url.searchParams.get("shop");
 
    if (!shop && shopFromQuery) {
      shop = shopFromQuery;
    }
 
    if (!shop) {
      console.error("❌ SHOP IS STILL UNDEFINED. URL:", url.href);
      return new Response(JSON.stringify({ error: "Missing shop parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
 
    console.log("✔ Final shop value:", shop);
 
    if (!admin) {
      return new Response(JSON.stringify({ error: "Unauthorized proxy" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
 
    const redisKey = `campaigns:${shop}`;
 
    console.log("📥 URL:", url.toString());
    console.log("🔍 Searching Redis for:", redisKey);
 
    // 1️⃣ Try Redis
    const fromRedis = await redis.get(redisKey);
 
    if (fromRedis) {
      console.log("📤 Returning campaigns FROM REDIS");
      const redisObj = safeJsonParse(fromRedis, { data: {} });
      const result = redisObj.data && typeof redisObj.data === "object" ? redisObj.data : {};
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }
 
    // 2️⃣ Fallback to Shopify
    console.log("⚠️ Not found in Redis → Using Shopify metafield");
 
    const gql = await admin.graphql(`
      query {
        shop {
          metafield(namespace: "optimaio_cart", key: "campaigns") {
            value
          }
        }
      }
    `);
 
    const data = await gql.json();
    let metafieldValue = data?.data?.shop?.metafield?.value;
 
    const badValues = [undefined, null, "", "undefined", "null"];
    if (badValues.includes(metafieldValue)) metafieldValue = "{}";
 
    const parsed = safeJsonParse(metafieldValue, {});
 
    await redis.set(
      redisKey,
      JSON.stringify({
        data: parsed,
        updatedAt: new Date().toISOString(),
      })
    );
 
    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
 
  } catch (err) {
    console.error("⚠️ Loader failed:", err);
    return new Response(JSON.stringify({ error: "Server error", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
 
 