// app/routes/debug-store-expiry.jsx
import { json } from "@remix-run/node";
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

let connected = false;
async function ensureRedis() {
  if (!connected) {
    await redis.connect();
    connected = true;
  }
}

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  await ensureRedis();

  // ✅ CORRECT API — ALWAYS RETURNS SCORES
  const raw = await redis.zRangeWithScores("store_expiry_queue", 0, -1);

  console.log("📦 Raw entries:", raw);

  const data = raw.map(({ value, score }) => {
    const expiryMs = Number(score);

    if (!Number.isFinite(expiryMs)) {
      return {
        storeId: value,
        rawScore: score,
        expiryMs: null,
        expiryUTC: null,
        error: "Invalid expiry score in Redis",
      };
    }

    return {
      storeId: value,
      expiryMs,
      expiryUTC: new Date(expiryMs).toISOString(),
    };
  });

  return json({
    redisType: "ZSET",
    key: "store_expiry_queue",
    count: data.length,
    data,
  });
};
