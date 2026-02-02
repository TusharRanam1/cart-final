import cron from "node-cron";
import prisma from "../../db.server";
import { ensureRedisConnected } from "../utils/redis.server";
import { callShopAdminGraphQL } from "../utils/shopifyGraphql.server";
import crypto from "node:crypto";
import {
  resolvePlanByOrders,
  getPlanPrice,
  PLAN_RANK,
  BASE_PLAN,
} from "../config/billingPlans";
import { log } from "../logger/logger.server";
import { withRequestContext } from "../logger/requestContext.server";
import { getRequestId } from "../logger/requestId.server";

/* ---------------- Shopify Mutation ---------------- */
const CHARGE_MUTATION = `
  mutation AppUsageRecordCreate(
    $subscriptionLineItemId: ID!
    $price: MoneyInput!
    $description: String!
    $idempotencyKey: String!
  ) {
    appUsageRecordCreate(
      subscriptionLineItemId: $subscriptionLineItemId
      price: $price
      description: $description
      idempotencyKey: $idempotencyKey
    ) {
      appUsageRecord { id }
      userErrors { message }
    }
  }
`;
/* ---------------- Main Job ---------------- */
async function orderBasedBilling() {
  const redis = await ensureRedisConnected();
  log.info("Order-based billing scan started", {
    event: "billing.orders.scan.started",
  });
  try {
    const openCycles = await prisma.storeUsage.findMany({
      where: { status: "OPEN" },
    });
    for (const cycle of openCycles) {
      const {
        id: openCycleId,
        storeId,
        cycleStart,
        cycleEnd,
        appliedTier,
        subscriptionId,
        subscriptionLineItemId,
      } = cycle;
      /* ---------- DISTRIBUTED LOCK ---------- */
      const lockKey = `order_billing_lock:${storeId}`;
      const lockValue = crypto.randomUUID();
      const lock = await redis.set(lockKey, lockValue, { NX: true, EX: 300 });
      if (!lock) {
        log.info("Order billing lock already held, skipping store", {
          event: "billing.orders.lock.skipped",
          storeId,
        });
        continue;
      }
      try {
        /* ---------- ORDER COUNT ---------- */
        const rawCount = await redis.get(`order_count:${storeId}`);
        const orderCount = Number(rawCount || 0);
        if (orderCount === 0) {
          log.info("No orders for store, skipping upgrade", {
            event: "billing.orders.zero",
            storeId,
          });
          continue;
        }
        const eligibleTier = resolvePlanByOrders(orderCount);
        const currentTier = appliedTier || BASE_PLAN;
        /* 🔐 SAFETY GUARD — PUT IT HERE */
        if (
          typeof PLAN_RANK[eligibleTier] !== "number" ||
          typeof PLAN_RANK[currentTier] !== "number"
        ) {
          log.warn("Unknown billing tier detected", {
            event: "billing.orders.invalid_tier",
            storeId,
            eligibleTier,
            currentTier,
          });
          continue;
        }
        if (eligibleTier === BASE_PLAN) {
          log.info(`Store remains on ${BASE_PLAN} tier`, {
            event: `billing.orders.no_upgrade.base`,
            storeId,
            orderCount,
          });
          continue;
        }
        if (PLAN_RANK[eligibleTier] <= PLAN_RANK[currentTier]) {
          log.info("Store already on equal or higher tier", {
            event: "billing.orders.no_upgrade.higher",
            storeId,
            currentTier,
            eligibleTier,
          });
          continue;
        }
        const previousTotal = getPlanPrice(currentTier);
        const newTotal = getPlanPrice(eligibleTier);
        let chargeAmount = newTotal - previousTotal;
        /* ---------- APPLY DISCOUNT ---------- */
        const discount = await prisma.storeDiscount.findFirst({
          where: {
            storeId,
            isActive: true,
            cycleStart: { lte: cycleEnd },
            cycleEnd: { gte: cycleStart },
          },
        });
        if (discount) {
          if (discount.discountType === "FLAT") {
            chargeAmount -= discount.discountValue;
          } else if (discount.discountType === "PERCENT") {
            chargeAmount -= Number(
              ((chargeAmount * discount.discountValue) / 100).toFixed(2),
            );
          }
        }
        if (chargeAmount <= 0) {
          log.warn("Order upgrade charge skipped (<=0)", {
            event: "billing.orders.charge.skipped",
            storeId,
            chargeAmount,
          });
          continue;
        }
        /* ---------- IDENTITY DEBUG ---------- */
        const idempotencyKey = [
          "plan-upgrade",
          storeId,
          cycleStart.toISOString(),
          cycleEnd.toISOString(),
          eligibleTier,
        ].join(":");
        /* ---------- SHOPIFY CALL ---------- */
        const offlineSession = await prisma.session.findFirst({
          where: { shop: storeId, isOnline: false },
        });
        if (!offlineSession || !subscriptionLineItemId) {
          log.warn("Missing Shopify prerequisites for billing", {
            event: "billing.orders.shopify.missing",
            storeId,
          });
          continue;
        }
        const result = await callShopAdminGraphQL({
          shopDomain: storeId,
          accessToken: offlineSession.accessToken,
          query: CHARGE_MUTATION,
          variables: {
            subscriptionLineItemId,
            price: { amount: chargeAmount, currencyCode: "USD" },
            description: `Upgrade to ${eligibleTier} plan`,
            idempotencyKey,
          },
        });
        if (result?.appUsageRecordCreate?.userErrors?.length) {
          throw new Error(result.appUsageRecordCreate.userErrors[0].message);
        }
        /* ---------- DB TRANSACTION ---------- */
        await prisma.$transaction(async (tx) => {
          await tx.storeUsage.update({
            where: { id: openCycleId },
            data: { status: "CLOSED" },
          });
          await tx.storeUsage.create({
            data: {
              storeId,
              subscriptionId,
              subscriptionLineItemId,
              cycleStart,
              cycleEnd,
              usageAmount: chargeAmount,
              ordersCount: orderCount,
              status: "OPEN",
              appliedTier: eligibleTier,
            },
          });
        });
        if (discount && discount.usageType === "ONE_TIME") {
          await prisma.storeDiscount.update({
            where: { id: discount.id },
            data: { usedAt: new Date(), usageCount: discount.usageCount + 1 },
          });
        }
        /* ✅ PUT REDIS WRITE HERE */
        const ttl = Math.ceil((cycleEnd.getTime() - Date.now()) / 1000) + 3600;
        await redis.set(`applied_tier:${storeId}`, eligibleTier, { EX: ttl });
        log.info("Order-based plan upgraded successfully", {
          event: "billing.orders.upgraded",
          storeId,
          eligibleTier,
          orderCount,
          chargeAmount,
        });
      } finally {
        const current = await redis.get(lockKey);
        if (current === lockValue) await redis.del(lockKey);
      }
    }
  } catch (err) {
    log.error("Order-based billing failed", {
      event: "billing.orders.failed",
      error: err.message,
      stack: err.stack,
    });
  }
  log.info("Order-based billing scan completed", {
    event: "billing.orders.scan.completed",
  });
}
/* ---------------- Cron ---------------- */
cron.schedule("*/60 * * * *", async () => {
  const requestId = getRequestId();
  await withRequestContext({ requestId }, async () => {
    log.info("Order-based billing cron triggered", {
      event: "billing.orders.cron.triggered",
    });
    await orderBasedBilling();
  });
});
export async function runUpgradePlan() {
  const requestId = getRequestId();
  await withRequestContext({ requestId }, async () => {
    log.info("Manual order-based billing triggered", {
      event: "billing.orders.manual.triggered",
    });
    await orderBasedBilling();
  });
}
