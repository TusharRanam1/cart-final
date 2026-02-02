export async function getActiveSubscription(admin) {
  const query = `
    query {
      currentAppInstallation {
        activeSubscriptions {
          id
          status
          lineItems {
            plan {
              pricingDetails {
                __typename
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

  return data.data.currentAppInstallation.activeSubscriptions[0] || null;
}
