import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(`
   query AppSubscriptionsWithUsage {
  currentAppInstallation {
    activeSubscriptions {
      id
      name
      status
      createdAt
      trialDays

      lineItems {
        id  # used in createUsageCharge

        plan {
          pricingDetails {
            __typename

            # Recurring pricing
            ... on AppRecurringPricing {
              price {
                amount
                currencyCode
              }
              interval
            }

            # Usage pricing
            ... on AppUsagePricing {
              cappedAmount {
                amount
                currencyCode
              }
              terms
            }
          }
        }

        # Latest 5 usage records (ordered by CREATED_AT, descending)
        usageRecords(first: 3, reverse: true) {
          edges {
            node {
              id
              description
              idempotencyKey
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
  `);

  const result = await response.json();

  return json({
    shop: session.shop,
    subscriptions:
      result?.data?.currentAppInstallation?.activeSubscriptions ?? [],
  });
};
