import { authenticate } from "../shopify.server";
import { ensureRedisConnected } from "./utils/redis.server";
import { processSingleStoreExpiry } from "./jobs/processSingleStore";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

export const action = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    log.info("Webhook received", {
      event: "webhook.received",
    });

    const { topic, payload, session, shop } =
      await authenticate.webhook(request);

    // 🚨 Fast exit (important for Shopify retries)
    if (!session || topic !== "ORDERS_CREATE") {
      log.info("Webhook ignored", {
        event: "webhook.ignored",
        topic,
      });
      return new Response("ok");
    }

    const redis = await ensureRedisConnected();

    const orderId = String(payload.id);
    const storeId = shop;
    const shopDomain = shop;

    log.info("Order create webhook validated", {
      event: "webhook.orders_create.valid",
      shop: shopDomain,
      orderId,
    });
    // new code block

    const now = Date.now();

    // 🔍 Check expiry for this store
    const expiryScore = await redis.zScore("store_expiry_queue", storeId);

    if (expiryScore && Number(expiryScore) <= now) {
      log.warn("Billing cycle expired before order", {
        event: "billing.expired",
        shop: shopDomain,
        expiry: new Date(Number(expiryScore)).toISOString(),
      });

      // 🔥 Force billing rollover (safe: has lock inside)
      await processSingleStoreExpiry(storeId);

      // 🧹 Safety reset (cron already does this, but double-safe)
      await redis.set(`order_count:${storeId}`, 0);
    }

    // end new code block

    /* ----------------------------------
     1️⃣ Minimal order payload
  ---------------------------------- */
    const orderPayload = JSON.stringify({
      orderId,
      orderNumber: payload.order_number,
      storeId,
      currency: payload.currency,
      totalItems: payload.line_items.length,
      createdAt: payload.created_at,
    });

    /* ----------------------------------
     2️⃣ ATOMIC Redis transaction
  ---------------------------------- */
    const tx = redis.multi();

    // 1️⃣ Idempotency guard (24h)
    tx.set(`order_seen:${orderId}`, "1", {
      NX: true,
      EX: 60 * 60 * 24,
    });

    // 2️⃣ Increment store-level order count
    tx.incr(`order_count:${storeId}`);

    // 3️⃣ Push order into FIFO queue
    tx.rPush(`order_queue:${storeId}`, orderPayload);

    // 4️⃣ Safety TTL for queue (48h)
    tx.expire(`order_queue:${storeId}`, 60 * 60 * 48);

    const results = await tx.exec();

    /**
     * redis@4 behavior:
     * SET NX returns "OK" or null
     */

    if (results?.[0] !== "OK") {
      // Duplicate webhook (Shopify retry or double delivery)
      log.warn("Duplicate order ignored", {
        event: "order.duplicate",
        shop: shopDomain,
        orderId,
      });
      return new Response("ok");
    }

    log.info("Order queued", {
      event: "order.queued",
      shop: shopDomain,
      orderId,
    });

    return new Response();
  });
};
