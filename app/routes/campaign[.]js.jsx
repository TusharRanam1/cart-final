// app/routes/campaign.json.jsx
import { createClient } from "redis";

// REDIS CLIENT
const redis = createClient({
 username: "default",
  password: "WeBH2vGxisQX0AL91o96tE3sM5srmISI",
  socket: {
    host: "redis-10630.crce199.us-west-2-2.ec2.cloud.redislabs.com",
    port: 10630,
  },
});

redis.on("error", (err) => console.error("❌ Redis Error:", err));

let redisReady = null;
function connectRedis() {
  if (!redisReady) {
    const t0 = performance.now();
    console.log("🔄 Connecting to Redis...");

    redisReady = redis.connect().then(() => {
      console.log(`🟢 Redis connected in ${Math.round(performance.now() - t0)} ms`);
    }).catch((err) => {
      redisReady = null;
      console.error("❌ Redis connection failed:", err);
      throw err;
    });
  }
  return redisReady;
}

async function getRedis() {
  await connectRedis();
  return redis;
}

// =======================================================
// PUBLIC JSON LOADER WITH FULL DEBUGGING + SPEED METRICS
// =======================================================

export async function loader({ request }) {
  const T0 = performance.now(); // TOTAL START
  console.log("\n=====================================");
  console.log("🚀 [campaign.json] Loader START");
  console.log("📌 URL:", request.url);

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    console.warn("⚠️ Missing ?shop parameter");
    return new Response(JSON.stringify({ error: "Missing ?shop" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("🏪 Shop:", shop);

  const redisKey = `campaigns:${shop}`;
  console.log("🔑 Redis Key:", redisKey);

  // -----------------------------------------
  // Redis GET timing
  // -----------------------------------------

  let raw = null;
  let parsed = null;

  try {
    const client = await getRedis();

    const T_GET = performance.now();
    console.log("🔵 Redis GET...");

    raw = await client.get(redisKey);

    console.log(`🔵 Redis GET completed in ${Math.round(performance.now() - T_GET)} ms`);
    console.log("🔵 Raw Redis Value:", raw?.slice(0, 200) || "null");

  } catch (err) {
    console.error("❌ Redis GET failed:", err);
  }

  // -----------------------------------------
  // JSON Parse timing
  // -----------------------------------------

  const T_PARSE = performance.now();

  try {
    parsed = raw ? JSON.parse(raw) : null;
    console.log(`🟣 JSON parse time: ${Math.round(performance.now() - T_PARSE)} ms`);
  } catch (err) {
    console.error("❌ JSON Parse error:", err);
    parsed = null;
  }

  const campaigns = parsed?.data || [];
  console.log("📦 Parsed Campaign Count:", campaigns.length);

  // -----------------------------------------
  // TOTAL TIME
  // -----------------------------------------

  const totalTime = Math.round(performance.now() - T0);
  console.log(`⏱️ TOTAL loader time: ${totalTime} ms`);
  console.log("🏁 [campaign.json] Loader END");
  console.log("=====================================\n");

  // -----------------------------------------
  // RETURN JSON
  // -----------------------------------------

  return new Response(JSON.stringify({
  campaigns,
  _debug: { shop, redisKey, responseTimeMs: totalTime },
}), {
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  },
});

}
