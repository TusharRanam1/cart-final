import cron from "node-cron";
import { ensureRedisConnected } from "../utils/redis.server";
import { processSingleStoreExpiry } from "./processSingleStore";
import { log } from "../logger/logger.server";
import { withRequestContext } from "../logger/requestContext.server";
import { getRequestId } from "../logger/requestId.server";

/**
 * Worker that processes expired billing cycles.
 *
 * Design principles:
 * - Redis ZSET acts as a priority queue (earliest expiry first)
 * - Only ONE store is processed at a time
 * - MAX_PER_RUN prevents long / runaway cron executions
 * - Billing logic itself is fully idempotent and locked
 */
async function checkStoreExpiry() {
  const redis = await ensureRedisConnected();

  const MAX_PER_RUN = 10; // Safety guard
  let processed = 0;

  log.info("Store expiry scan started", {
    event: "billing.cron.scan.started",
    maxPerRun: MAX_PER_RUN,
  });

  while (processed < MAX_PER_RUN) {
    /**
     * Always fetch the earliest expiry.
     * We intentionally re-read Redis every loop
     * because the queue changes after each renewal.
     */
    const entries = await redis.zRangeWithScores("store_expiry_queue", 0, 0);

    if (!entries.length) {
      log.info("No stores found in expiry queue", {
        event: "billing.cron.queue.empty",
      });
      break;
    }

    const { value: shop, score } = entries[0];
    const expiryMs = Number(score);

    // Defensive checks
    if (!shop || !Number.isFinite(expiryMs)) {
      log.warn("Invalid expiry queue entry encountered", {
        event: "billing.cron.invalid_entry",
        shop,
        score,
      });
      break;
    }

    // Stop when the next expiry is in the future
    if (expiryMs > Date.now()) {
      log.info("Next billing cycle has not expired yet", {
        event: "billing.cron.no_expired_store",
        nextShop: shop,
        nextExpiry: new Date(expiryMs).toISOString(),
      });
      break;
    }

    processed++;

    log.info("Processing expired store", {
      event: "billing.cron.store.processing",
      shop,
      processed,
    });

    /**
     * Process a single store.
     * This is safe because:
     * - processSingleStoreExpiry has a Redis lock
     * - Shopify billing is idempotent
     */
    await processSingleStoreExpiry(shop);
  }

  log.info("Store expiry scan completed", {
    event: "billing.cron.scan.completed",
    processed,
  });
}

/* ----------------------------------
   ⏰ Cron: run every minute
---------------------------------- */
cron.schedule("*/60 * * * *", async () => {
  const requestId = getRequestId();

  await withRequestContext({ requestId }, async () => {
    log.info("Store expiry cron triggered", {
      event: "billing.cron.triggered",
    });

    await checkStoreExpiry();
  });
});

/**
 * Manual trigger (used by webhook or admin actions)
 */
export async function runRenewExpieredPlan() {
  const requestId = getRequestId();

  await withRequestContext({ requestId }, async () => {
    log.info("Manual store expiry run triggered", {
      event: "billing.manual.triggered",
    });

    await checkStoreExpiry();
  });
}
