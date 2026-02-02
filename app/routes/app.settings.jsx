import { authenticate } from "../shopify.server";
import {
  Box,
  InlineGrid,
  Page,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import SettingsLeftCard from "./components/SettingsLeftCard";
import SettingsRightCard from "./components/SettingsRightCard";
import { useNavigate, useLoaderData } from "@remix-run/react";
import { ArrowLeftIcon } from "@shopify/polaris-icons";

import { getActiveSubscription } from "./utils/getActiveSubscription.server";
import { PRICING_PLANS } from "./config/pricingPlans";


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

/* ---------------- Loader ---------------- */
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const activeSub = await getActiveSubscription(admin);
  const activePlanId = resolvePlanIdFromSubscription(activeSub);

  const plan =
    PRICING_PLANS.find((p) => p.id === activePlanId) ||
    PRICING_PLANS.find((p) => p.id === "trial");

  return {
    activePlanId,
    planTitle: plan.title,
    isFreePlan: activePlanId === "trial",
  };
};

/* ---------------- Page ---------------- */
export default function AppSettingsPage() {
  const navigate = useNavigate();
  const { planTitle, isFreePlan } = useLoaderData();

  return (
    <Page
      padding="400"
      title={
        <InlineStack gap="500" blockAlign="center">
          <Button
            icon={ArrowLeftIcon}
            plain
            onClick={() => window.history.back()}
          />
          <Text variant="headingLg" as="h2">
            Settings
          </Text>
        </InlineStack>
      }
    >
      <Box padding="400">
        <InlineGrid columns={{ xs: 1, md: "1fr 2fr" }} gap="400">
          {/* Left Section */}
          <SettingsLeftCard
            title="Account settings"
            description="Manage your account settings."
          />

          {/* Right Section */}
          <SettingsRightCard
            title="Your current plan"
            description="Upgrade or downgrade to any plan we offer using the settings below."
          >
            <InlineStack
              align="space-between"
              blockAlign="center"
              wrap={false}
            >
              {/* LEFT — Plan info */}
              <InlineStack gap="200" align="center">
                <Text tone="subdued">Current plan:</Text>

                <Text variant="headingMd" as="h3">
                  {planTitle}
                </Text>

                {/* {!isFreePlan && (
                  <Badge tone="success">Active</Badge>
                )} */}
              </InlineStack>

              {/* RIGHT — Action */}
              <Button
                variant="primary"
                onClick={() => navigate("/app/pricing")}
              >
                {isFreePlan ? "Upgrade plan" : "Manage plan"}
              </Button>
            </InlineStack>
          </SettingsRightCard>
        </InlineGrid>
      </Box>
    </Page>
  );
}
