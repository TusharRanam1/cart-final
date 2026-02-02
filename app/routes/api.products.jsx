import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

export const loader = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Fetch products request received", {
        event: "products.fetch.received",
      });
      const { admin, session } = await authenticate.admin(request);
      const shop = session.shop;

      log.info("Fetching products from Shopify", {
        event: "products.fetch.start",
        shop,
      });

      const response = await admin.graphql(`
      query {
        products(first: 20) {
          edges {
            node {
              id
              title
              handle
              featuredImage { url altText }
              images(first: 1) {
                edges { node { url altText } }
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    price
                    availableForSale
                    image { url altText }
                  }
                }
              }
            }
          }
        }
      }
    `);

      const data = await response.json();

      if (!data?.data?.products?.edges) {
        log.error("Products GraphQL response invalid", {
          event: "products.fetch.graphql_error",
          shop,
          errors: data.errors,
        });
        return Response.json({ error: "GraphQL error" }, { status: 500 });
      }

      const products = data.data.products.edges.map(({ node }) => {
        const fallbackImage =
          node.featuredImage ?? node.images?.edges?.[0]?.node ?? null;

        return {
          id: node.id,
          title: node.title,
          handle: node.handle,
          featuredImage: fallbackImage,
          variants: node.variants.edges.map(({ node: v }) => ({
            id: v.id,
            title: v.title,
            price: v.price,
            availableForSale: v.availableForSale,
            image: v.image || fallbackImage,
            productHandle: node.handle,
          })),
        };
      });

      log.info("Products fetched successfully", {
        event: "products.fetch.success",
        shop,
        count: products.length,
      });

      return new Response(JSON.stringify({ success: true, products }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      log.error("Products loader failed", {
        event: "products.fetch.exception",
        error: err,
      });
      return Response.json(
        { error: "Server error", details: String(err) },
        { status: 500 },
      );
    }
  });
};
