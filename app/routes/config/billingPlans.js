/* ----------------------------------
   Billing Plans – Single Source of Truth
---------------------------------- */

// Set renew days alwasys be set as 30 days
// This billing days used in renewExpriredPlan.cron.js
export const BILLING_DAYS = 30;

// Trial period in days
// Usage in app.pricing.jsx
export const TRIAL_DAYS = 15;

// initial  susbcription config (used in subscription creation subscription.server.js)
export const SUBSCRIPTION_CONFIG = {
  isTestMode: true,
  cappedAmount: 100000,
  currencyCode: "USD",
  intervalDays: "EVERY_30_DAYS",
};

/**
 * Supported plan keys
 * @typedef {"TRIAL" | "STARTER" | "GROW" | "PREMIUM" | "ENTERPRISE"} PlanKey
 */

export const BILLING_PLANS = {
  TRIAL: {
    key: "TRIAL",
    id: "trial",
    title: "Free",
    basePrice: 0,
    yearlyPrice: 0,
    orderThreshold: 0,
  },

  STARTER: {
    key: "STARTER",
    id: "starter",
    title: "Starter",
    basePrice: 14,
    yearlyPrice: 150,
    orderThreshold: 0,
  },

  GROW: {
    key: "GROW",
    id: "grow",
    title: "Grow",
    basePrice: 29,
    yearlyPrice: 290,
    orderThreshold: 1000,
  },

  PREMIUM: {
    key: "PREMIUM",
    id: "premium",
    title: "Premium",
    basePrice: 59,
    yearlyPrice: 590,
    orderThreshold: 3000,
  },

  ENTERPRISE: {
    key: "ENTERPRISE",
    id: "enterprise",
    title: "Enterprise",
    basePrice: 89,
    yearlyPrice: 890,
    orderThreshold: 7000,
  },
};


// initial base amount at webhook creation (used in webhooks.app.create_subscription.jsx)
export function getBaseUsageAmount() {
  return BILLING_PLANS.STARTER.basePrice;
}

export const BASE_PLAN = "STARTER";

/* ----------------------------------
   Plan ranking (used for upgrades)
---------------------------------- */

export const PLAN_RANK = {
  TRIAL: -1,
  STARTER: 0,
  GROW: 1,
  PREMIUM: 2,
  ENTERPRISE: 3,
};

/* ----------------------------------
   Helpers (NO LOGIC CHANGE)
---------------------------------- */

/**
 * Resolve plan based on order count
 * @param {number} orderCount
 * @returns {PlanKey}
 */
export function resolvePlanByOrders(orderCount) {
  if (orderCount > BILLING_PLANS.ENTERPRISE.orderThreshold) {
    return "ENTERPRISE";
  }

  if (orderCount > BILLING_PLANS.PREMIUM.orderThreshold) {
    return "PREMIUM";
  }

  if (orderCount > BILLING_PLANS.GROW.orderThreshold) {
    return "GROW";
  }

  return "STARTER";
}

/**
 * Get base price for a plan
 * @param {PlanKey} plan
 * @returns {number}
 */
export function getPlanPrice(plan) {
  return BILLING_PLANS[plan]?.basePrice ?? 0;
}
