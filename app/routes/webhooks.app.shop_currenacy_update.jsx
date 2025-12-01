import { authenticate } from "../shopify.server";
import { createClient } from "redis";
 
// -------------------------------
//  Redis Client
// -------------------------------
const redis = createClient({
  username: 'default',
  password: 'TAqxfnXDpLQv9QG64FZNRsdk6Daq0xrL',
  socket: {
    host: 'redis-16663.crce179.ap-south-1-1.ec2.cloud.redislabs.com',
    port: 16663
  }
});
 
redis.on('error', err => console.log('Redis Client Error', err));
await redis.connect();
 
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
 
    // Shopify metafield value → JSON
    let newCampaigns = null;
    try {
      newCampaigns = metafield?.value ? JSON.parse(metafield.value) : null;
    } catch (err) {
      console.error("⚠️ Failed to parse campaigns metafield JSON");
    }
 
    // 2️⃣ Get existing campaigns from Redis
    const redisKey = `campaigns:${shop}`;
    const oldValue = await redis.get(redisKey);
   
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
 
    await redis.set(redisKey, JSON.stringify({
      data: newCampaigns,
      updatedAt: new Date().toISOString(),
    }));
 
    console.log(`✅ Campaigns updated in Redis for ${shop}`);
 
  } catch (err) {
    console.error("🚨 Error updating campaigns:", err);
  }
 
  return new Response("ok");
};
 
 