import {
  StoreIcon,
  RewardIcon,
  ChartHistogramGrowthIcon,
  OrganizationIcon,
} from "@shopify/polaris-icons";

import { BILLING_PLANS } from "./billingPlans";
import { FREE_FEATURES, PAID_FEATURES } from "./pricingFeatures";

const ICON_MAP = {
  trial: StoreIcon,
  starter: RewardIcon,
  grow: ChartHistogramGrowthIcon,
  premium: OrganizationIcon,
  enterprise: OrganizationIcon,
};

const SUBTITLE_MAP = {
  trial: "Free forever",
  starter: "0-1000 orders/month",
  grow: "1001-3000 orders/month",
  premium: "3001-7000 orders/month",
  enterprise: "7000+ orders/month",
};

export const PRICING_PLANS = Object.values(BILLING_PLANS).map((plan) => {
  const isFree = plan.id === "trial";

  return {
    id: plan.id,
    title: plan.title,
    subtitle: SUBTITLE_MAP[plan.id],
    monthlyPrice: plan.basePrice,
    yearlyPrice: plan.yearlyPrice,
    disabled: isFree,
    icon: ICON_MAP[plan.id],
    features: isFree ? FREE_FEATURES : PAID_FEATURES,
  };
});
