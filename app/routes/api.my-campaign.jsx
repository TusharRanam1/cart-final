import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

/**
 * API endpoint to fetch campaign metafield
 */
export const loader = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Fetch campaign metafield request received", {
        event: "campaign.metafield.fetch.received",
      });
      const { session } = await authenticate.admin(request);
      const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

      const url = new URL(request.url);
      const namespace = url.searchParams.get("namespace") || "custom";
      const key = url.searchParams.get("key") || "discount_data";

      log.info("Fetching campaign metafield", {
        event: "campaign.metafield.fetch.start",
        shop: session.shop,
        namespace,
        key,
      });

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
        `https://${session.shop}/admin/api/${API_VERSION}/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": session.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, variables }),
        },
      );

      const data = await response.json();

      if (data.errors) {
        log.error("Campaign metafield GraphQL error", {
          event: "campaign.metafield.fetch.graphql_error",
          shop: session.shop,
          namespace,
          key,
          errors: data.errors,
        });
        return json(
          { success: false, error: "GraphQL error" },
          { status: 400 },
        );
      }

      const metafield = data?.data?.shop?.metafield;

      if (!metafield) {
        log.warn("Campaign metafield not found", {
          event: "campaign.metafield.not_found",
          shop: session.shop,
          namespace,
          key,
        });
        return json(
          { success: false, message: "Metafield not found" },
          { status: 404 },
        );
      }

      let parsedValue;
      try {
        parsedValue = JSON.parse(metafield.value);
      } catch (err) {
        log.warn("Failed to parse campaign metafield JSON", {
          event: "campaign.metafield.parse_failed",
          shop: session.shop,
          namespace,
          key,
          rawValue: metafield.value,
        });
        parsedValue = { campaigns: [] };
      }

      log.info("Campaign metafield fetched successfully", {
        event: "campaign.metafield.fetch.success",
        shop: session.shop,
        namespace,
        key,
      });

      return json({
        success: true,
        namespace: metafield.namespace,
        key: metafield.key,
        type: metafield.type,
        value: parsedValue, // ✅ always parsed object
      });
    } catch (err) {
      log.error("Campaign metafield loader failed", {
        event: "campaign.metafield.fetch.exception",
        error: err,
      });
      return json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  });
};
