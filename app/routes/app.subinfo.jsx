import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const query = `
    query GetSubscriptionUsage {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          createdAt
          trialDays
          returnUrl
          lineItems {
            id
            plan {
              pricingDetails {
                __typename
                ... on AppUsagePricing {
                  cappedAmount {
                    amount
                    currencyCode
                  }
                  terms
                }
              }
            }
            usageRecords(first: 20) {
              edges {
                node {
                  id
                  description
                  createdAt
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await admin.graphql(query);
  const data = await response.json();
  // console.log("billing usages :++++", data);
  console.log("Confirm page is woreking");
  console.log(JSON.stringify(data, null, 2));

  const subscription = data.data.currentAppInstallation.activeSubscriptions[0];

  if (!subscription) {
    throw new Error("Subscription not active");
  }

  // 🔹 Extract usage records
  const usageLineItem = subscription.lineItems.find(
    (li) => li.plan.pricingDetails.__typename === "AppUsagePricing",
  );

  const usageRecords =
    usageLineItem?.usageRecords?.edges.map((e) => e.node) || [];

  // console.log("Usage records:", usageRecords);

  return json({
    subscriptionId: subscription.id,
    status: subscription.status,
    trailDays: subscription.trialDays,
    cappedAmount: usageLineItem?.plan.pricingDetails.cappedAmount || null,
    usageRecords,
  });
};
