// /app/utils/registerCartWebhooks.js

export async function registerCartWebhooks(admin) {
  const mutation = `
    mutation webhookSubscriptionCreate(
      $topic: WebhookSubscriptionTopic!,
      $uri: URL!
    ) {
      webhookSubscriptionCreate(
        topic: $topic
        webhookSubscription: {
          uri: $uri
          format: JSON
          includeFields: [
            "id",
            "buyerIdentity",
            "lines",
            "lines.edges",
            "lines.edges.node",
            "lines.edges.node.quantity",
            "lines.edges.node.merchandise",
            "lines.edges.node.attributes"
          ]
        }
      ) {
        webhookSubscription {
          id
          topic
          includeFields
          endpoint {
            ... on WebhookHttpEndpoint {
              uri
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  // Register CARTS_CREATE
  await admin.graphql(mutation, {
    variables: {
      topic: "CARTS_CREATE",
      uri: `${process.env.APP_URL}/webhooks/app/cart_create`,
    },
  });

  // Register CARTS_UPDATE
  await admin.graphql(mutation, {
    variables: {
      topic: "CARTS_UPDATE",
      uri: `${process.env.APP_URL}/webhooks/app/cart_update`,
    },
  });

  console.log("📦 Cart webhooks registered with includeFields successfully");
}
