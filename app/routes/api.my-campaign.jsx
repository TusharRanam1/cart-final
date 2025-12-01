import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * API endpoint to fetch campaign metafield
 */
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const namespace = url.searchParams.get("namespace") || "custom";
  const key = url.searchParams.get("key") || "discount_data";

  const query = `
    query getDiscountMetafield($namespace: String!, $key: String!) {
      shop {
        metafield(namespace: $namespace, key: $key) {
          id
          namespace
          key
          type
          value
        }
      }
    }
  `;

  const variables = { namespace, key };

  const response = await fetch(
    `https://${session.shop}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const data = await response.json();

  if (data.errors) {
    return json({ success: false, errors: data.errors }, { status: 400 });
  }

  const metafield = data?.data?.shop?.metafield;

  if (!metafield) {
    return json(
      { success: false, message: "Metafield not found" },
      { status: 404 }
    );
  }

  let parsedValue;
  try {
    parsedValue = JSON.parse(metafield.value);
  } catch {
    parsedValue = { campaigns: [] };
  }

  return json({
    success: true,
    namespace: metafield.namespace,
    key: metafield.key,
    type: metafield.type,
    value: parsedValue, // ✅ always parsed object
  });
};
