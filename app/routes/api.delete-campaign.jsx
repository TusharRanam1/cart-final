import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

export const action = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Delete campaign request received", {
        event: "campaign.delete.received",
      });

      const { session } = await authenticate.admin(request);
      const shop = session.shop;

      const body = await request.json();
      const { namespace, key, id } = body;

      if (!id) {
        log.warn("Campaign delete missing id", {
          event: "campaign.delete.missing_id",
          shop,
        });

        return json(
          { success: false, message: "Missing campaign id" },
          { status: 400 },
        );
      }

      /* 1️⃣ Fetch shop + metafield */
      const query = `
        query getShopAndMetafield($namespace: String!, $key: String!) {
          shop {
            id
            metafield(namespace: $namespace, key: $key) {
              type
              value
            }
          }
        }
      `;

      const response = await fetch(
        `https://${shop}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": session.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            variables: { namespace, key },
          }),
        },
      );

      const data = await response.json();
      const shopId = data?.data?.shop?.id;
      const metafield = data?.data?.shop?.metafield;

      if (!shopId) {
        log.error("Shop ID not found during campaign delete", {
          event: "campaign.delete.shop_missing",
          shop,
        });

        return json(
          { success: false, message: "Shop ID not found" },
          { status: 404 },
        );
      }

      if (!metafield) {
        log.warn("Campaign metafield not found", {
          event: "campaign.delete.metafield_missing",
          shop,
          namespace,
          key,
        });

        return json(
          { success: false, message: "Metafield not found" },
          { status: 404 },
        );
      }

      let campaigns = [];
      try {
        campaigns = JSON.parse(metafield.value).campaigns || [];
      } catch (err) {
        log.error("Invalid campaign metafield JSON", {
          event: "campaign.delete.parse_failed",
          shop,
          rawValue: metafield.value,
        });

        return json(
          { success: false, message: "Invalid metafield format" },
          { status: 500 },
        );
      }

      /* 2️⃣ Remove campaign by ID */
      const updatedCampaigns = campaigns.filter((c) => c.id !== id);

      if (updatedCampaigns.length === campaigns.length) {
        log.warn("Campaign not found for deletion", {
          event: "campaign.delete.not_found",
          shop,
          campaignId: id,
        });

        return json(
          { success: false, message: "Campaign not found" },
          { status: 404 },
        );
      }

      log.info("Campaign removed locally, updating metafield", {
        event: "campaign.delete.update_start",
        shop,
        campaignId: id,
        remaining: updatedCampaigns.length,
      });

      /* 3️⃣ Save updated metafield */
      const mutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              namespace
              key
              type
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const updateResponse = await fetch(
        `https://${shop}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": session.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              metafields: [
                {
                  namespace,
                  key,
                  ownerId: shopId,
                  type: "json",
                  value: JSON.stringify({ campaigns: updatedCampaigns }),
                },
              ],
            },
          }),
        },
      );

      const updateData = await updateResponse.json();
      const result = updateData?.data?.metafieldsSet;

      if (updateData.errors || result?.userErrors?.length) {
        log.error("Campaign metafield update failed", {
          event: "campaign.delete.update_failed",
          shop,
          errors: updateData.errors || result.userErrors,
        });

        return json(
          { success: false, message: "Failed to update campaign" },
          { status: 400 },
        );
      }

      log.info("Campaign deleted successfully", {
        event: "campaign.delete.success",
        shop,
        campaignId: id,
        remaining: updatedCampaigns.length,
      });

      return json({
        success: true,
        campaigns: updatedCampaigns,
      });
    } catch (err) {
      log.error("Campaign delete API failed", {
        event: "campaign.delete.exception",
        error: err,
      });

      return json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  });
};
