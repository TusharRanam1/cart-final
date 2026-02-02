import fetch from "node-fetch";

const API_VERSION = "2025-01";

export async function callShopAdminGraphQL({
  shopDomain,
  accessToken,
  query,
  variables,
}) {
  const endpoint = `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  if (body.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);
  }

  return body.data;
}
