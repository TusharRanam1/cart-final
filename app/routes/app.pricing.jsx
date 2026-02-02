import {
  Page,
  Card,
  Box,
  BlockStack,
  InlineGrid,
  InlineStack,
  Text,
  Button,
  Icon,
  Divider,
  Badge,
  Banner,
} from "@shopify/polaris";
import { CheckCircleIcon, ArrowLeftIcon } from "@shopify/polaris-icons";
import { useState, useEffect } from "react";
import { PRICING_PLANS } from "./config/pricingPlans";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  createAppSubscription,
  cancelAppSubscription,
} from "./utils/subscription.server";
import { getActiveSubscription } from "./utils/getActiveSubscription.server";
import { Toast, Frame } from "@shopify/polaris";
import prisma from "../db.server";
import { TRIAL_DAYS } from "./config/billingPlans";

    const VALID_PLAN_IDS = PRICING_PLANS.map(p => p.id);

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const activeSub = await getActiveSubscription(admin);

   const activePlanId = resolvePlanIdFromSubscription(activeSub);

     
if (!VALID_PLAN_IDS.includes(activePlanId)) {
  console.warn("⚠️ Unknown active plan:", activePlanId);
}
  return json({
    hasActiveSubscription: Boolean(activeSub),
    activePlanId,
  });
};


function resolvePlanIdFromSubscription(activeSub) {
  if (!activeSub) return "trial"; // Free plan

const usageLineItem = activeSub?.lineItems?.find(
  (li) => li?.plan?.pricingDetails?.__typename === "AppUsagePricing"
);

  const descriptions =
    usageLineItem?.usageRecords?.edges.map(e =>
      e.node.description.toLowerCase()
    ) || [];

  if (descriptions.some(d => d.includes("enterprise"))) return "enterprise";
  if (descriptions.some(d => d.includes("premium"))) return "premium";
  if (descriptions.some(d => d.includes("grow"))) return "grow";
  if (descriptions.some(d => d.includes("starter"))) return "starter";

  // fallback (paid but unknown)
  return "starter";
}

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // 🔥 CANCEL FLOW
  if (intent === "cancel") {
    const activeSub = await getActiveSubscription(admin);

    if (!activeSub) {
      return json({ error: "No active subscription" }, { status: 400 });
    }

    await cancelAppSubscription({
      admin,
      subscriptionId: activeSub.id,
    });

    return json({ cancelled: true });
  }

  // 🔥 SUBSCRIBE FLOW
  if (intent === "subscribe") {
    const url = new URL(request.url);
    // const shop = url.searchParams.get("shop"); // e.g. basic-optimaio-cart.myshopify.com
    // const host = url.searchParams.get("host");

    const shop = session.shop; // ✅ ALWAYS present
    const host = session.host; // ✅ ALWAYS present

    // ✅ Extract store handle dynamically
    const storeHandle = shop.replace(".myshopify.com", "");

    // ✅ Dynamic return URL (works for all stores)
    // const returnUrl = `https://admin.shopify.com/store/${storeHandle}/apps/zupli/app/confirm?shop=${shop}&host=${host}`;
    const returnUrl = `https://admin.shopify.com/store/${storeHandle}/apps/zupli/app`;

    /* 🔥 CHECK TRIAL STATUS */
    const storeInfo = await prisma.storeInfo.findUnique({
      where: { storeId: shop },
      select: { trialUsed: true, trialEndsAt: true },
    });

    let trialDays = null;

    const now = new Date();

    if (!storeInfo) {
      // Absolute first install (no row yet)
      trialDays = TRIAL_DAYS;
    } else if (storeInfo.trialUsed === false && !storeInfo.trialEndsAt) {
      // First-time user, store row exists but trial never started
      trialDays = TRIAL_DAYS;
    } else if (storeInfo.trialEndsAt && now < storeInfo.trialEndsAt) {
      // Resume remaining trial
      const diffMs = storeInfo.trialEndsAt.getTime() - now.getTime();
      trialDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    // Pass trialDays to Shopify
    const confirmationUrl = await createAppSubscription({
      admin,
      returnUrl,
      trialDays, // null or remaining days
    });

    return json({ confirmationUrl });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

/* ---------------- Plans Config ---------------- */
const PLANS = PRICING_PLANS;
/* ---------------- Feature Row ---------------- */
function FeatureItem({ label }) {
  return (
    <InlineStack gap="200" align="start" wrap={false}>
      <Box minWidth="20px" flexShrink={0}>
        <Icon source={CheckCircleIcon} tone="success" />
      </Box>
      <Box>
        <Text as="span">{label}</Text>
      </Box>
    </InlineStack>
  );
}
/* ---------------- Pricing Card ---------------- */
function PricingCard({ plan, billingCycle, activePlanId }) {
  const isActive = plan.id === activePlanId;
  const price =
    billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const yearlySavings = plan.monthlyPrice * 12 - plan.yearlyPrice;
  const offPercent =
    plan.monthlyPrice > 0
      ? Math.round((yearlySavings / (plan.monthlyPrice * 12)) * 100)
      : 0;



  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}

        <BlockStack gap="100">
          <InlineStack gap="200" align="start" wrap={false}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline", // 🔥 key for correct alignment
                gap: "2px",
              }}
            >
              <Icon source={plan.icon} />
              <Text as="span" variant="headingXl" fontWeight="bold">
                {plan.title}
              </Text>
            </div>
          </InlineStack>
          <Text tone="subdued">{plan.subtitle}</Text>
        </BlockStack>

        {/* Price */}
        <BlockStack gap="100">
          <InlineStack gap="200" align="Left">
            <Text as="h2" variant="headingLg">
              ${price}{" "}
              <Text as="span" tone="subdued" variant="bodyMd">
                {billingCycle === "yearly" ? "/Year" : "/Month"}
              </Text>
            </Text>
            {isActive && <Badge tone="success">Active</Badge>}
          </InlineStack>

          {/* 🔥 OFF PRICE (GREEN, BELOW PRICE) */}
          {billingCycle === "yearly" && yearlySavings > 0 && (
            <InlineStack gap="200" align="start">
              <Badge tone="success">{offPercent}% OFF</Badge>
              <Text tone="success" variant="bodySm">
                Save ${yearlySavings} yearly
              </Text>
            </InlineStack>
          )}
        </BlockStack>

        {/* Divider */}
        <Box>
          <Divider />
        </Box>
        {/* Features */}
        <BlockStack gap="200">
          {plan.features.map((feature) => (
            <FeatureItem key={feature} label={feature} />
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
/* ---------------- Pricing Page ---------------- */
export default function Pricing() {
  const fetcher = useFetcher();
  const { hasActiveSubscription, activePlanId } = useLoaderData();

  const [billingCycle, setBillingCycle] = useState("monthly");
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const toggleToast = () => setToastActive(false);

  useEffect(() => {
    if (fetcher.data?.confirmationUrl) {
      window.open(fetcher.data.confirmationUrl, "_top");
    }

    if (fetcher.data?.cancelled) {
      setToastMessage("✅ Subscription cancelled successfully");
      setToastActive(true);
    }
  }, [fetcher.data]);

  const handleSubscribe = () => {
    fetcher.submit({ intent: "subscribe" }, { method: "post" });
  };

  const handleCancel = () => {
    fetcher.submit({ intent: "cancel" }, { method: "post" });
  };

  const isFreePlan = activePlanId === "trial";
const planLabel =
  PRICING_PLANS.find((p) => p.id === activePlanId)?.title || "your";

<Banner
  tone={isFreePlan ? "info" : "success"}
  title={
    isFreePlan
      ? "Upgrade your plan to remove limits and unlock advanced tools."
      : `You’re currently enjoying all features of the ${planLabel} plan.`
  }
>
  <Text as="p">
    {isFreePlan
      ? "Explore advanced campaigns, upsells, and automation built for growing stores."
      : "You can upgrade, downgrade, or manage your subscription anytime."}
  </Text>
</Banner>


  return (
    <Frame>
      <Page
        title={
          <InlineStack gap="500" blockAlign="center">
            <Button
              icon={ArrowLeftIcon}
              plain
              onClick={() => window.history.back()}
            />
            <Text variant="headingLg" as="h2">
              Pricing
            </Text>
          </InlineStack>
        }
      >
<Banner
  tone={isFreePlan ? "info" : "success"}
  title={
    isFreePlan
      ? "Upgrade your plan to remove limits and unlock advanced tools."
      : `You’re currently enjoying all features of the ${planLabel} plan.`
  }
>
          <Box paddingBlockEnd="600">
          
            <BlockStack gap="600">
              {/* Header */}
              <InlineGrid columns="auto 1fr" gap="400" alignItems="center">
                <Box width="64px" height="64px">
                  <img
                    src="/optimaio-pricing.svg"
                    alt="Optimaio pricing"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </Box>
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Select a plan
                  </Text>
                  <Text tone="subdued">
                    Our pricing is flexible for merchants while ensuring
                    world-class service without compromise.
                  </Text>
                </BlockStack>
              </InlineGrid>

              <InlineStack align="center" gap="300">
                <Button
                  variant="primary"
                  onClick={handleSubscribe}
                  disabled={hasActiveSubscription}
                >
                  {hasActiveSubscription ? "Subscribed" : "Subscribe"}
                </Button>

                <Button
                  variant="primary"
                  onClick={handleCancel}
                  disabled={!hasActiveSubscription}
                >
                  Switch to Free Plan
                </Button>
              </InlineStack>

              {/* Toggle (NO layout change) Monthly and Annually */}
              {/* <InlineStack align="center">
                <ButtonGroup segmented>
                  <Button
                    pressed={billingCycle === "monthly"}
                    onClick={() => setBillingCycle("monthly")}
                  >
                    Monthly
                  </Button>
                  <Button
                    pressed={billingCycle === "yearly"}
                    onClick={() => setBillingCycle("yearly")}
                  >
                    Annually
                  </Button>
                </ButtonGroup>
              </InlineStack> */}

              {/* Pricing Cards (GRID UNCHANGED) */}
              <Box maxWidth="900px" paddingInline="400" marginInline="auto">
                <InlineGrid
                  alignItems="stretch"
                  columns={{
                    xs: "1fr 1fr",
                    md: "1fr 1fr",
                    lg: "1fr 1fr",
                    xl: "1fr 1fr ",
                  }}
                  gap="400"
                >
                  {PLANS.map((plan) => (
                    <PricingCard
                      key={plan.id}
                      plan={plan}
                      billingCycle={billingCycle}
                      activePlanId={activePlanId}
                    />
                  ))}
                </InlineGrid>
              </Box>
            </BlockStack>
          
        </Box>
</Banner>

      </Page>
      {toastActive && <Toast content={toastMessage} onDismiss={toggleToast} />}
    </Frame>
  );
}
