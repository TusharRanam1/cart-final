import { SUBSCRIPTION_CONFIG } from "../config/billingPlans";

export async function createAppSubscription({ admin, returnUrl, trialDays }) {
  const mutation = `
    mutation AppSubscriptionCreate(
      $name: String!
      $returnUrl: URL!
      $trialDays: Int
      $lineItems: [AppSubscriptionLineItemInput!]!
      $test: Boolean!
    ) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        trialDays: $trialDays
        lineItems: $lineItems
        test: $test
      ) {
        confirmationUrl
        userErrors {
          message
        }
      }
    }
  `;

  const variables = {
    name: "Order-Based Pricing",
    returnUrl,
    trialDays,
    test: SUBSCRIPTION_CONFIG.isTestMode,
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: {
              amount: 0,
              currencyCode: SUBSCRIPTION_CONFIG.currencyCode,
            },
            interval: SUBSCRIPTION_CONFIG.intervalDays,
          },
        },
      },
      {
        plan: {
          appUsagePricingDetails: {
            cappedAmount: {
              amount: SUBSCRIPTION_CONFIG.cappedAmount,
              currencyCode: SUBSCRIPTION_CONFIG.currencyCode,
            },
            terms: "Monthly pricing based on order volume.",
          },
        },
      },
    ],
  };

  const response = await admin.graphql(mutation, { variables });
  const data = await response.json();

  const result = data.data.appSubscriptionCreate;

  if (result.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }

  return result.confirmationUrl;
}

/* ----------------------------------
   Cancel Active Subscription
---------------------------------- */
export async function cancelAppSubscription({ admin, subscriptionId }) {
  const mutation = `
    mutation AppSubscriptionCancel($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription {
          id
          status
        }
        userErrors {
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: { id: subscriptionId },
  });

  const data = await response.json();
  const result = data.data.appSubscriptionCancel;

  if (result.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }

  return result.appSubscription;
}
