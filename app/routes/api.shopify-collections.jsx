import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

export const loader = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Fetch collections request received", {
        event: "collections.fetch.received",
      });

      const { admin, session } = await authenticate.admin(request);
      const shop = session.shop;

      log.info("Fetching collections from Shopify", {
        event: "collections.fetch.start",
        shop: shop,
      });

      const gql = `
      query {
        collections(first: 50) {
          edges {
            node {
              id
              title
              handle
              image {
                url
                altText
              }
            }
          }
        }
      }
    `;

      const response = await admin.graphql(gql);
      const data = await response.json();

      if (!data?.data?.collections?.edges) {
        log.error("Collections GraphQL response invalid", {
          event: "collections.fetch.graphql_error",
          shop,
          errors: data.errors,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: "GraphQL error",
            details: data.errors,
          }),
          { headers: { "Content-Type": "application/json" }, status: 500 },
        );
      }

      const collections = data.data.collections.edges.map(({ node }) => ({
        id: node.id,
        title: node.title,
        handle: node.handle,
        image: node.image
          ? {
              url: node.image.url,
              alt: node.image.altText || node.title,
            }
          : {
              url: "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-collection.png",
              alt: "No image available",
            },
      }));

      log.info("Collections fetched successfully", {
        event: "collections.fetch.success",
        shop,
        count: collections.length,
      });

      return new Response(JSON.stringify({ success: true, collections }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      log.error("Collections loader failed", {
        event: "collections.fetch.exception",
        error: err,
      });

      return new Response(
        JSON.stringify({ success: false, error: String(err) }),
        { headers: { "Content-Type": "application/json" }, status: 500 },
      );
    }
  });
};
