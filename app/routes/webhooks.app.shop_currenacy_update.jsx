import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

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
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    const { topic, admin, shop } = await authenticate.webhook(request);

    log.info("Webhook received", {
      event: "campaigns.webhook.received",
      topic,
      shop,
    });

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
        log.warn("Invalid campaigns metafield JSON", {
          event: "campaigns.metafield.invalid_json",
          shop,
          error: err.message,
        });
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
      log.info("No campaign changes detected", {
        event: "campaigns.no_change",
        shop,
      });
      return new Response("no-change");
    }

    // 5️⃣ Save new data to Upstash Redis
    await redisSet(redisKey, {
      data: newCampaigns,
      updatedAt: new Date().toISOString(),
    });

    log.info("Campaigns updated in Redis", {
      event: "campaigns.redis.updated",
      shop,
      campaignsCount: Array.isArray(newCampaigns) ? newCampaigns.length : 0,
    });
    return new Response();
  });
};
