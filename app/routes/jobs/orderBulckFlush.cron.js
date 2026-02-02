import cron from "node-cron";
import prisma from "../../db.server";
import { ensureRedisConnected } from "../utils/redis.server";
import { log } from "../logger/logger.server";
import { withRequestContext } from "../logger/requestContext.server";
import { getRequestId } from "../logger/requestId.server";
import crypto from "node:crypto";

/**
 * Flush Redis order queues → DB (BillingOrder)
 *
 * Design:
 * - Redis lists buffer orders for performance
 * - DB is source of truth
 * - Per-store Redis lock prevents concurrent flush
 * - Idempotent via DB unique constraint + skipDuplicates
 */
async function flushOrdersToDBHourly() {
  const redis = await ensureRedisConnected();

  log.info("Order flush scan started", {
    event: "orders.flush.scan.started",
  });

  try {
    // 1️⃣ Find all store queues
    const keys = await redis.keys("order_queue:*");

    if (!keys.length) {
      log.info("No order queues found", {
        event: "orders.flush.queue.empty",
      });
      return;
    }

    for (const key of keys) {
      const storeId = key.replace("order_queue:", "");

      // 🔒 Per-store lock (prevents concurrent flush)
      const lockKey = `flush_lock:${storeId}`;
      const lockValue = crypto.randomUUID();
      const lock = await redis.set(lockKey, lockValue, {
        NX: true,
        EX: 60 * 5, // 5 minutes
      });

      if (!lock) {
        log.info("Flush lock already held, skipping store", {
          event: "orders.flush.lock.skipped",
          storeId,
        });
        continue;
      }

      try {
        // 2️⃣ Read all queued orders
        const rawOrders = await redis.lRange(key, 0, -1);

        if (!rawOrders.length) {
          log.info("No orders found in queue", {
            event: "orders.flush.queue.empty.store",
            storeId,
          });
          continue;
        }

        const orders = rawOrders.map((o) => JSON.parse(o));

        // 3️⃣ Bulk insert (DB is source of truth)
        await prisma.billingOrder.createMany({
          data: orders.map((o) => ({
            storeId: o.storeId,
            orderId: o.orderId,
            orderNumber: String(o.orderNumber),
            currency: o.currency,
            totalItems: o.totalItems,
            createdAt: new Date(o.createdAt),
          })),
          skipDuplicates: true, // 🔥 idempotent
        });

        // 4️⃣ Clear Redis queue AFTER DB success
        await redis.del(key);

        log.info("Orders flushed successfully", {
          event: "orders.flush.completed",
          storeId,
          count: orders.length,
        });
      } finally {
        // 🔓 Always release lock
        const current = await redis.get(lockKey);
        if (current === lockValue) {
          await redis.del(lockKey);
        }
      }
    }
  } catch (err) {
    log.error("Order flush failed", {
      event: "orders.flush.failed",
      error: err.message,
      stack: err.stack,
    });
  }
  log.info("Order flush scan completed", {
    event: "orders.flush.scan.completed",
  });
}

/* ----------------------------------
   Run every hour (minute 0)
---------------------------------- */
cron.schedule("*/30 * * * *", async () => {
  const requestId = getRequestId();

  await withRequestContext({ requestId }, async () => {
    log.info("Hourly order flush cron triggered", {
      event: "orders.flush.cron.triggered",
    });

    await flushOrdersToDBHourly();
  });
});

// For manual triggering
// ✅ Correct named export
export async function flushOrdersToDBHourlyManual() {
  const requestId = getRequestId();

  await withRequestContext({ requestId }, async () => {
    log.info("Manual order flush triggered", {
      event: "orders.flush.manual.triggered",
    });

    await flushOrdersToDBHourly();
  });
}
