import { authenticate } from "../shopify.server";

// Use ENV variables (recommended)
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisSet(key, value) {
  return fetch(`${UPSTASH_URL}/set/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  }).then((r) => r.json());
}

async function redisGet(key) {
  return fetch(`${UPSTASH_URL}/get/${key}`, {
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
    },
  }).then((r) => r.json());
}

export const action = async ({ request }) => {
  const { topic, admin, shop } = await authenticate.webhook(request);

  console.log(`📥 Webhook '${topic}' for shop: ${shop}`);

  // 1️⃣ Load metafield from Shopify
  const query = `
    {
      shop {
        metafield(namespace: "optimaio_cart", key: "campaigns") {
          value
        }
      }
    }
  `;

  const res = await admin.graphql(query);
  const json = await res.json();
  const metafield = json?.data?.shop?.metafield;

  let newCampaigns = null;
  if (metafield?.value) {
    try {
      newCampaigns = JSON.parse(metafield.value);
    } catch (err) {
      console.log("❌ Invalid metafield JSON");
    }
  }

  // 2️⃣ Redis Key
  const redisKey = `campaigns:${shop}`;

  // 3️⃣ Fetch existing Redis data
  const oldValue = await redisGet(redisKey);
  const oldCampaigns = oldValue?.result ? JSON.parse(oldValue.result) : null;

  // 4️⃣ Check if same
  const isSame =
    JSON.stringify(oldCampaigns?.data) === JSON.stringify(newCampaigns);

  if (isSame) {
    console.log("⏸ No changes detected — skipping");
    return new Response("no-change");
  }

  // 5️⃣ Save new data to Upstash Redis
  await redisSet(redisKey, {
    data: newCampaigns,
    updatedAt: new Date().toISOString(),
  });

  console.log("✅ Redis updated successfully");
  return new Response("ok");
};
