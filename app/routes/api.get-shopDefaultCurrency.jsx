import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const query = `
    query shopCurrency {
      shop {
        currencyCode
      }
    }
  `;

  try {
    const response = await admin.graphql(query);
    const data = await response.json();

    const currencyCode = data?.data?.shop?.currencyCode || "AMT";

    return new Response(
      JSON.stringify({ ok: true, currencyCode }),
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error fetching shop currency:", error);
    return new Response(
      JSON.stringify({ ok: false, currencyCode: "USD" }),
      { status: 500 }
    );
  }
};
