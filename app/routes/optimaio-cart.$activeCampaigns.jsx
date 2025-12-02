// app/routes/optimaio-cart.jsx
import { authenticate } from "../shopify.server";
import { createClient } from "redis";
 
// -------------------------------
// Redis (NO TOP-LEVEL AWAIT)
// -------------------------------
const redis = createClient({
   username: 'default',
    password: 'WeBH2vGxisQX0AL91o96tE3sM5srmISI',
    socket: {
        host: 'redis-10630.crce199.us-west-2-2.ec2.cloud.redislabs.com',
        port: 10630
    },
});
 
redis.on("error", (err) => console.error("Redis Error:", err));
 
let redisReady = null;
 
function connectRedis() {
  if (!redisReady) {
    console.log("🔄 [Debug] Connecting to Redis...");
    const t0 = performance.now();
 
    redisReady = redis.connect().then(() => {
      console.log(`🟢 [Debug] Redis connected in ${Math.round(performance.now() - t0)} ms`);
    }).catch((err) => {
      redisReady = null;
      console.error("❌ [Debug] Redis connection failed:", err);
      throw err;
    });
  }
  return redisReady;
}
 
async function getRedis() {
  await connectRedis();
  return redis;
}
 
// -------------------------------
// Safe JSON parser
// -------------------------------
function safeJsonParse(str, fallback = {}) {
  if (!str || typeof str !== "string") return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
 
export const loader = async ({ request }) => {
  const T_START = performance.now();
  console.log("🚀 [Loader Debug] optimaio-cart loader START");
 
  try {
    // Authenticate
    const auth = await authenticate.public.appProxy(request);
    const { admin } = auth;
    let { shop } = auth;
 
    // Fallback shop
    const url = new URL(request.url);
    const shopFromQuery = url.searchParams.get("shop");
    if (!shop && shopFromQuery) shop = shopFromQuery;
 
    if (!shop) {
      console.error("❌ [Debug] SHOP IS STILL UNDEFINED.");
      return new Response(JSON.stringify({ error: "Missing shop" }), { status: 400 });
    }
 
    if (!admin) {
      console.error("❌ [Debug] No Admin session");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
 
    const redisKey = `campaigns:${shop}`;
    console.log(`📌 [Debug] Redis key: ${redisKey}`);
 
    // -------------------------------
    // Redis GET
    // -------------------------------
    const T_REDIS_GET_START = performance.now();
    const client = await getRedis();
 
    let fromRedis = null;
    try {
      fromRedis = await client.get(redisKey);
    } catch (err) {
      console.error("❌ [Debug] Redis GET error:", err);
    }
 
    const T_REDIS_GET_END = performance.now();
    console.log(`🟦 [Debug] Redis GET time: ${Math.round(T_REDIS_GET_END - T_REDIS_GET_START)} ms`);
 
    if (fromRedis) {
      console.log("🟢 [Debug] Redis HIT");
      const redisObj = safeJsonParse(fromRedis, { data: {} });
      const result = redisObj.data || {};
 
      console.log(`⏱️ [Debug] Total loader time (Redis Hit): ${Math.round(performance.now() - T_START)} ms`);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }
 
    console.log("🔴 [Debug] Redis MISS – falling back to Shopify metafield");
 
    // -------------------------------
    // Shopify GraphQL Fetch
    // -------------------------------
    const T_SHOPIFY_START = performance.now();
 
    const gql = await admin.graphql(`
      query {
        shop {
          metafield(namespace: "optimaio_cart", key: "campaigns") {
            value
          }
        }
      }
    `);
 
    const shopifyJson = await gql.json();
    const metafieldValue = shopifyJson?.data?.shop?.metafield?.value;
 
    const T_SHOPIFY_END = performance.now();
    console.log(`🟧 [Debug] Shopify GraphQL time: ${Math.round(T_SHOPIFY_END - T_SHOPIFY_START)} ms`);
 
    let parsed = safeJsonParse(metafieldValue, {});
 
    // -------------------------------
    // Redis SET
    // -------------------------------
    const T_REDIS_SET_START = performance.now();
    try {
      await client.set(
        redisKey,
        JSON.stringify({
          data: parsed,
          updatedAt: new Date().toISOString(),
        })
      );
      console.log("🟢 [Debug] Redis SET success");
    } catch (err) {
      console.error("❌ [Debug] Redis SET error:", err);
    }
    const T_REDIS_SET_END = performance.now();
    console.log(`🟪 [Debug] Redis SET time: ${Math.round(T_REDIS_SET_END - T_REDIS_SET_START)} ms`);
 
    console.log(`⏱️ [Debug] Total loader time (Shopify Fallback): ${Math.round(performance.now() - T_START)} ms`);
 
    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
 
  } catch (err) {
    console.error("🚨 [Loader Debug] Loader failed:", err);
 
    return new Response(
      JSON.stringify({ error: "Server error", details: err.message }),
      { status: 500 }
    );
  }
};