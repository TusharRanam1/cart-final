import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Get the saved metafield
  const query = `
    query {
      shop {
        metafield(namespace: "optimaio_cart", key: "currencies") {
          id
          namespace
          key
          type
          value
          updatedAt
        }
      }
    }
  `;

  const res = await admin.graphql(query);
  const data = await res.json();

  const metafield = data?.data?.shop?.metafield;

  if (!metafield?.value) {
    return json({
      ok: true,
      currencies: [{ code: "INR", format: "₹ {{amount}}" }],
      defaultCurrency: "INR",
      empty: true,
    });
  }

  let parsed;
  try {
    parsed = JSON.parse(metafield.value);
  } catch {
    parsed = {
      currencies: [{ code: "INR", format: "₹ {{amount}}" }],
      defaultCurrency: "INR",
    };
  }

  return json({
    ok: true,
    currencies: parsed.currencies,
    defaultCurrency: parsed.defaultCurrency,
    showDecimals: parsed.showDecimals || "no",
    updatedAt: metafield.updatedAt,
  });
};
