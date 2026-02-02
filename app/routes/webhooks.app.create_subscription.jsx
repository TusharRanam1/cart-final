import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { callShopAdminGraphQL } from "./utils/shopifyGraphql.server";
import { ensureRedisConnected } from "./utils/redis.server";
import { BILLING_PLANS, BILLING_DAYS, BASE_PLAN } from "./config/billingPlans";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

const BASE_USAGE_AMOUNT = BILLING_PLANS.STARTER.basePrice;
const BILLING_CYCLE_DAYS = BILLING_DAYS;

export const action = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    const { topic, payload, shop } = await authenticate.webhook(request);

    log.info("Webhook received", {
      event: "webhook.received",
      topic,
      shop,
    });

    if (topic !== "APP_SUBSCRIPTIONS_UPDATE") {
      log.info("Webhook ignored", {
        event: "webhook.ignored",
        topic,
      });
      return new Response("OK", { status: 200 });
    }

    const subscriptionId = payload?.app_subscription?.admin_graphql_api_id;

    if (!shop || !subscriptionId) {
      log.warn("Webhook missing required data", {
        event: "webhook.invalid_payload",
        shop,
        subscriptionId,
      });
      return new Response("OK", { status: 200 });
    }

    /* ----------------------------------
     0️⃣ Redis (connect once)
  ---------------------------------- */
    const redis = await ensureRedisConnected();

    /* ----------------------------------
   🔒 0️⃣.5 Acquire billing lock (CRITICAL)
---------------------------------- */
    const lockKey = `billing_lock:${shop}`;

    const lockAcquired = await redis.set(lockKey, "1", {
      NX: true,
      EX: 60,
    });

    if (!lockAcquired) {
      log.info("Billing skipped due to active lock", {
        event: "billing.lock.skipped",
        shop,
      });
      return new Response("OK", { status: 200 });
    }

    try {
      /* ----------------------------------
     1️⃣ Offline session
  ---------------------------------- */
      const offlineSession = await prisma.session.findFirst({
        where: { shop, isOnline: false },
      });

      if (!offlineSession) {
        log.error("Offline session missing", {
          event: "billing.session.missing",
          shop,
        });
        return new Response("OK", { status: 200 });
      }

      /* ----------------------------------
     2️⃣ Fetch subscription
  ---------------------------------- */
      const GET_SUBSCRIPTION = `
    query GetSubscription($id: ID!) {
      node(id: $id) {
        ... on AppSubscription {
          id
          status
          createdAt
          trialDays
          lineItems {
            id
            plan {
              pricingDetails {
                __typename
              }
            }
          }
        }
      }
    }
  `;

      const result = await callShopAdminGraphQL({
        shopDomain: shop,
        accessToken: offlineSession.accessToken,
        query: GET_SUBSCRIPTION,
        variables: { id: subscriptionId },
      });

      const subscription = result?.node;

      if (!subscription || subscription.status !== "ACTIVE") {
        log.info("Subscription not active", {
          event: "billing.subscription.inactive",
          shop,
          subscriptionId,
        });
        return new Response("OK", { status: 200 });
      }

      /* ----------------------------------
   2️⃣.5 Resolve usage pricing line item (ONCE)
---------------------------------- */
      const usageLineItem = subscription.lineItems.find(
        (li) => li.plan.pricingDetails.__typename === "AppUsagePricing",
      );

      if (!usageLineItem) {
        log.error("Usage pricing line item missing", {
          event: "billing.usage_line_item.missing",
          shop,
        });
        return new Response("OK", { status: 200 });
      }

      /*
2.6 First read data from redis
*/
      const now = new Date();
      const appliedTier = await redis.get(`applied_tier:${shop}`);
      const expiryResult = await redis.zScore("store_expiry_queue", shop);

      const redisTrialActive =
        appliedTier === "TRIAL" &&
        expiryResult !== null &&
        Number(expiryResult) > Date.now();

      // 2.7 Use Redis trial if active
      let trialEnd = redisTrialActive ? new Date(Number(expiryResult)) : null;

      /* ----------------------------------
     3️⃣ Fallback to DB (only if Redis miss)
  ---------------------------------- */
      if (!trialEnd) {
        const storeInfo = await prisma.storeInfo.findUnique({
          where: { storeId: shop },
        });

        const isFirstTimeUser =
          !storeInfo?.trialEndsAt &&
          storeInfo?.trialUsed === false &&
          subscription.trialDays > 0;

        if (isFirstTimeUser) {
          trialEnd = new Date(subscription.createdAt);
          trialEnd.setDate(trialEnd.getDate() + subscription.trialDays);

          // 🔒 Persist trial usage immediately
          await prisma.storeInfo.update({
            where: { storeId: shop },
            data: {
              trialEndsAt: trialEnd,
              trialUsed: true,
            },
          });
        } else if (storeInfo?.trialEndsAt && storeInfo.trialEndsAt > now) {
          trialEnd = storeInfo.trialEndsAt;
        }
      }

      if (trialEnd && trialEnd > now) {
        await prisma.$transaction(async (tx) => {
          // 1️⃣ Close ANY existing open trial cycles (old installs, old subs)
          await tx.storeUsage.updateMany({
            where: {
              storeId: shop,
              status: "OPEN",
              appliedTier: "TRIAL",
            },
            data: { status: "CLOSED" },
          });

          // 2️⃣ Create fresh TRIAL cycle for current subscription
          await tx.storeUsage.create({
            data: {
              storeId: shop,
              subscriptionId,
              subscriptionLineItemId: usageLineItem?.id,
              cycleStart: now, // 👈 new start (reinstall-safe)
              cycleEnd: trialEnd, // 👈 same trial end
              usageAmount: 0,
              status: "OPEN",
              appliedTier: "TRIAL",
            },
          });
        });

        // 3️⃣ Redis sync (runtime truth)
        const ttl = Math.ceil((trialEnd.getTime() - Date.now()) / 1000) + 3600;

        await redis.set(`applied_tier:${shop}`, "TRIAL", { EX: ttl });

        await redis.zAdd("store_expiry_queue", {
          score: trialEnd.getTime(),
          value: shop,
        });

        log.info("Trial cycle activated", {
          event: "billing.trial.activated",
          shop,
          trialEnd,
        });

        return new Response("OK", { status: 200 });
      }

      /* ----------------------------------
   🔒 3️⃣.5 ACTIVE CYCLE GUARD (CRITICAL)
---------------------------------- */
      const existingOpenCycle = await prisma.storeUsage.findFirst({
        where: {
          storeId: shop,
          subscriptionId,
          status: "OPEN",
          appliedTier: BASE_PLAN,
        },
      });

      if (existingOpenCycle) {
        log.info("Active billing cycle already exists", {
          event: "billing.cycle.exists",
          shop,
          subscriptionId,
        });

        return new Response("OK", { status: 200 });
      }

      /* ----------------------------------
     5️⃣ Billing window
  ---------------------------------- */
      const cycleStart = now;
      const cycleEnd = new Date(now);
      cycleEnd.setUTCDate(cycleEnd.getUTCDate() + BILLING_CYCLE_DAYS);

      /* ----------------------------------
     6️⃣ Discount logic (unchanged)
  ---------------------------------- */
      const discount = await prisma.storeDiscount.findFirst({
        where: {
          storeId: shop,
          isActive: true,
          cycleStart: { lte: cycleEnd },
          cycleEnd: { gte: cycleStart },
        },
      });

      let chargeAmount = BASE_USAGE_AMOUNT;

      if (discount) {
        if (discount.discountType === "FLAT") {
          chargeAmount -= discount.discountValue;
        }

        if (discount.discountType === "PERCENT") {
          const discountValue = Number(
            ((chargeAmount * discount.discountValue) / 100).toFixed(2),
          );
          chargeAmount -= discountValue;
        }
      }

      if (chargeAmount <= 0) {
        log.warn("Charge skipped due to discount", {
          event: "billing.charge.skipped",
          shop,
          chargeAmount,
        });
        return new Response("OK", { status: 200 });
      }

      /* ----------------------------------
     7️⃣ Create Shopify usage charge
  ---------------------------------- */
      const CREATE_USAGE_CHARGE = `
    mutation CreateUsage(
      $lineItemId: ID!
      $price: MoneyInput!
      $description: String!
      $idempotencyKey: String!
    ) {
      appUsageRecordCreate(
        subscriptionLineItemId: $lineItemId
        price: $price
        description: $description
        idempotencyKey: $idempotencyKey
      ) {
        appUsageRecord { id }
        userErrors { message }
      }
    }
  `;

      const idempotencyKey = [
        "NEW_USAGE_CHARGE",
        shop,
        subscriptionId,
        BASE_PLAN,
      ].join(":");

      const chargeResult = await callShopAdminGraphQL({
        shopDomain: shop,
        accessToken: offlineSession.accessToken,
        query: CREATE_USAGE_CHARGE,
        variables: {
          lineItemId: usageLineItem.id,
          price: {
            amount: chargeAmount,
            currencyCode: "USD",
          },
          description: "Base usage fee",
          idempotencyKey,
        },
      });

      if (chargeResult?.appUsageRecordCreate?.userErrors?.length) {
        throw new Error(
          chargeResult.appUsageRecordCreate.userErrors[0].message,
        );
      }

      /* ----------------------------------
     8️⃣ DB + Redis (ATOMIC INTENT)
  ---------------------------------- */
      await prisma.$transaction(async (tx) => {
        await tx.storeUsage.updateMany({
          where: { storeId: shop, status: "OPEN" },
          data: { status: "CLOSED" },
        });

        await tx.storeUsage.create({
          data: {
            storeId: shop,
            subscriptionId,
            subscriptionLineItemId: usageLineItem.id,
            cycleStart,
            cycleEnd,
            usageAmount: chargeAmount,
            status: "OPEN",
            appliedTier: BASE_PLAN,
          },
        });

        if (discount) {
          await tx.storeDiscount.update({
            where: { id: discount.id },
            data: {
              usageCount: { increment: 1 },
              ...(discount.usageType === "ONE_TIME"
                ? { usedAt: new Date(), isActive: false }
                : {}),
            },
          });
        }
      });

      /* ----------------------------------
     9️⃣ Redis FINAL STATE (CRITICAL)
  ---------------------------------- */
      const ttl = Math.ceil((cycleEnd.getTime() - Date.now()) / 1000) + 3600;

      await redis.set(`applied_tier:${shop}`, BASE_PLAN, { EX: ttl });

      await redis.zAdd("store_expiry_queue", {
        score: cycleEnd.getTime(),
        value: shop,
      });

      // Optional but recommended
      await redis.set(`order_count:${shop}`, 0);

      log.info("Webhook billing completed", {
        event: "billing.completed",
        shop,
        subscriptionId,
        chargeAmount,
        cycleStart,
        cycleEnd,
      });
    } catch (err) {
      log.error("Webhook billing failed", {
        event: "billing.failed",
        shop,
        error: err.message,
        stack: err.stack,
      });
    } finally {
      await redis.del(lockKey);
    }

    return new Response();
  });
};
