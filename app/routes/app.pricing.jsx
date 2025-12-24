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
} from "@shopify/polaris";
import { CheckCircleIcon, StoreIcon } from "@shopify/polaris-icons";
import { useNavigate } from "@remix-run/react";
import { PRICING_PLANS } from "./config/pricingPlans";

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
function PricingCard({ plan }) {
  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <BlockStack gap="100">
          <InlineStack gap="200" align="start" wrap={false}>
            <Box minWidth="20px" flexShrink={0}>
              <Icon source={StoreIcon} />
            </Box>
            <Text
              as={plan.id === "free" ? "h1" : "h3"}
              variant="headingXl"
            >
              {plan.title}
            </Text>
          </InlineStack>
          <Text tone="subdued">{plan.subtitle}</Text>
        </BlockStack>

        {/* Price */}
        <Text as="h2" variant="headingLg">
          ${plan.price}{" "}
          <Text as="span" tone="subdued" variant="bodyMd">
            /Month
          </Text>
        </Text>

        {/* Button BELOW price */}
        <Button
          fullWidth
          variant="primary"
          disabled={plan.disabled}
        >
          {plan.disabled ? "Current plan" : "Upgrade"}
        </Button>

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
  const navigate = useNavigate();

  return (
    <Page
      title="Pricing"
      backAction={{
        content: "Back",
        onAction: () => navigate(-1),
      }}
    >
      <Card>
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
                Our pricing is flexible for merchants while ensuring world-class
                service without compromise.
              </Text>
            </BlockStack>
          </InlineGrid>

          {/* Pricing Cards */}
          <Box maxWidth="900px" paddingInline="400" marginInline="auto">
<InlineGrid   alignItems="stretch"
  columns={{ xs: "1fr 1fr", md: "1fr 1fr" , lg: "1fr 1fr 1fr", xl: "1fr 1fr 1fr 1fr"}}
  gap="400"
>
  
              {PLANS.map((plan) => (
                <PricingCard key={plan.id} plan={plan} />
              ))}
            </InlineGrid>
          </Box>
        </BlockStack>
      </Card>
    </Page>
  );
}
