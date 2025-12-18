import { authenticate } from "../shopify.server";
import { createClient } from "redis";
 
// -------------------------------
//  Redis Client (NO TOP-LEVEL AWAIT)
// -------------------------------
const redis = createClient({
  username: "default",
  password: "WeBH2vGxisQX0AL91o96tE3sM5srmISI",
  socket: {
    host: "redis-10630.crce199.us-west-2-2.ec2.cloud.redislabs.com",
    port: 10630,
  },
});
 
redis.on("error", (err) => console.log("Redis Client Error", err));
 
let redisReady = null;
 
function connectRedis() {
  if (!redisReady) {
    redisReady = redis.connect().catch((err) => {
      redisReady = null;
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
//  Webhook Handler
// -------------------------------
export const action = async ({ request }) => {
  const { topic, admin, shop, session } = await authenticate.webhook(request);
 
  if (!session) {
    console.warn("⚠️ No active session found — possibly uninstalled shop:", shop);
    throw new Response("No session", { status: 401 });
  }
 
  console.log(`📥 Received webhook '${topic}' for shop: ${shop}`);
 
  try {
    // 1️⃣ FETCH metafield: optimaio_cart.campaigns
    const query = `
      {
        shop {
          id
          metafield(namespace: "optimaio_cart", key: "campaigns") {
            id
            namespace
            key
            type
            value
          }
        }
      }
    `;
 
    const res = await admin.graphql(query);
    const json = await res.json();
    const shopData = json?.data?.shop;
 
    if (!shopData) {
      console.error("❌ No shop data found");
      throw new Error("Shop data unavailable");
    }
 
    const metafield = shopData.metafield;
 
    let newCampaigns = null;
    try {
      newCampaigns = metafield?.value ? JSON.parse(metafield.value) : null;
    } catch (err) {
      console.error("⚠️ Failed to parse campaigns metafield JSON");
    }
 
    // 2️⃣ Read existing campaigns from Redis
    const client = await getRedis();
    const redisKey = `campaigns:${shop}`;
 
    const oldValue = await client.get(redisKey);
 
    let oldCampaigns = null;
    try {
      oldCampaigns = oldValue ? JSON.parse(oldValue) : null;
    } catch (err) {
      console.warn("⚠️ Failed to parse existing Redis campaign value");
    }
 
    // 3️⃣ CHANGE DETECTION
    const isSame = JSON.stringify(oldCampaigns) === JSON.stringify(newCampaigns);
 
    if (isSame) {
      console.log("⏸ No campaign changes detected — skipping Redis update");
      return new Response("no-change");
    }
 
    // 4️⃣ Save new campaign data to Redis
    console.log("🔄 Campaign metafield changed — updating Redis…");
 
    await client.set(
      redisKey,
      JSON.stringify({
        data: newCampaigns,
        updatedAt: new Date().toISOString(),
      })
    );
 
    console.log(`✅ Campaigns updated in Redis for ${shop}`);
  } catch (err) {
    console.error("🚨 Error updating campaigns:", err);
  }
 
  return new Response("ok");
};