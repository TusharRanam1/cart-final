import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

/* Helper: Save metafield */
async function setMetafield(admin, ownerId, key, valueObj, targetId = ownerId) {
  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key type value }
        userErrors { field message }
      }
    }
  `;
  const variables = {
    metafields: [
      {
        namespace: "optimaio_cart",
        key,
        type: "json",
        ownerId: targetId,
        value: JSON.stringify(valueObj),
      },
    ],
  };

  try {
    const res = await admin.graphql(mutation, { variables });
    const data = await res.json();

    const errors = data?.data?.metafieldsSet?.userErrors;

    if (errors?.length) {
      log.error("Metafield save failed", {
        event: "metafield.save.failed",
        key,
        ownerId: targetId,
        errors,
      });
    } else {
      log.info("Metafield saved", {
        event: "metafield.save.success",
        key,
        ownerId: targetId,
        metafieldId: data.data.metafieldsSet.metafields[0]?.id,
      });
    }
    return data;
  } catch (err) {
    log.error("Metafield mutation exception", {
      event: "metafield.save.exception",
      key,
      ownerId: targetId,
      error: err,
    });
    throw err;
  }
}

/* Helper: Find the app’s DiscountAutomaticNode ID dynamically */
async function getDiscountNodeId(admin) {
  const query = `
    query GetAllDiscounts {
      discountNodes(first: 20) {
        edges {
          node {
            id
            discount {
              __typename
              ... on DiscountAutomaticApp {
                title
                status
                appDiscountType {
                  appKey
                  functionId
                }
              }
              ... on DiscountCodeApp {
                title
                status
                appDiscountType {
                  appKey
                  functionId
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await admin.graphql(query);
    const data = await res.json();

    const nodes = data?.data?.discountNodes?.edges || [];
    log.debug("Discount nodes fetched", {
      event: "discount.nodes.fetched",
      count: nodes.length,
    });

    // Match your app’s unique function ID or title
    const targetFunctionId =
      process.env.BXGY_FUNCTION_ID?.toLowerCase() || null;

    const foundNode =
      nodes.find((edge) => {
        const funcId =
          edge.node.discount?.appDiscountType?.functionId?.toLowerCase?.() ||
          "";
        return targetFunctionId && funcId === targetFunctionId;
      }) ||
      nodes.find((edge) => {
        const d = edge.node.discount;
        const title = (d?.title || "").toLowerCase();
        return title.includes("buy x get y");
      });

    if (foundNode) {
      log.info("Discount node resolved", {
        event: "discount.node.resolved",
        discountNodeId: foundNode.node.id,
      });
      return foundNode.node.id;
    }

    log.warn("Discount node not found", {
      event: "discount.node.missing",
      functionId: targetFunctionId,
    });
    return null;
  } catch (err) {
    log.error("Discount node lookup failed", {
      event: "discount.node.error",
      error: err,
    });
    return null;
  }
}

export const action = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    log.info("Update campaigns request received", {
      event: "campaign.update.received",
    });

    const { admin } = await authenticate.admin(request);
    const { campaigns } = await request.json();

    if (!Array.isArray(campaigns)) {
      log.warn("Invalid campaigns payload", {
        event: "campaign.update.invalid_payload",
      });
      return json(
        { success: false, message: "Invalid campaigns array" },
        { status: 400 },
      );
    }

    // 1️⃣ Add explicit numeric priority
    const orderedCampaigns = campaigns.map((c, index) => ({
      ...c,
      priority: index + 1,
    }));

    // 2️⃣ Get shopId
    const shopRes = await admin.graphql(`{ shop { id } }`);
    const shopData = await shopRes.json();
    const shopId = shopData?.data?.shop?.id;

    if (!shopId) {
      log.error("Shop ID not resolved", {
        event: "campaign.update.shop_missing",
      });
      return json(
        { success: false, message: "Shop ID not found" },
        { status: 500 },
      );
    }

    log.info("Saving campaign ordering", {
      event: "campaign.update.save_campaigns",
      shopId,
      totalCampaigns: orderedCampaigns.length,
    });

    // 3️⃣ Save updated campaign list to metafield
    await setMetafield(admin, shopId, "campaigns", {
      campaigns: orderedCampaigns,
    });

    // 4️⃣ Get Discount Node dynamically
    const discountNodeId = await getDiscountNodeId(admin);
    if (!discountNodeId) {
      log.error("BXGY discount node missing — aborting sync", {
        event: "bxgy.sync.aborted",
        shopId,
      });

      return json({
        success: false,
        message: "No DiscountAutomaticNode found for this app.",
      });
    }

    // 5️⃣ Determine active BXGY campaigns
    const activeBxgys = orderedCampaigns.filter(
      (c) => c.campaignType === "bxgy" && c.status === "active",
    );

    if (activeBxgys.length > 0) {
      const allCollections = [];
      const activeCampaignsInfo = [];

      for (const campaign of activeBxgys) {
        const goal = campaign.goals?.[0];
        if (
          (goal?.bxgyMode === "collection" ||
            goal?.bxgyMode === "spend_any_collection") &&
          goal.buyCollections?.length > 0
        ) {
          for (const col of goal.buyCollections) {
            if (!allCollections.includes(col.id)) allCollections.push(col.id);
          }
        }

        activeCampaignsInfo.push({
          id: campaign.id,
          name: campaign.campaignName,
          priority: campaign.priority,
        });
      }

      // Find top-priority active BXGY (lowest number = top)
      const topCampaign = activeBxgys.sort(
        (a, b) => a.priority - b.priority,
      )[0];

      log.info("Updating BXGY top campaign", {
        event: "bxgy.update.active",
        shopId,
        topCampaignId: topCampaign.id,
      });

      const metafieldValue = {
        collectionIds: allCollections,
        activeCampaigns: activeCampaignsInfo,
        topCampaign: {
          id: topCampaign.id,
          name: topCampaign.campaignName,
          priority: topCampaign.priority,
        },
      };

      log.debug("Updating bxgy_top_collection metafield", {
        event: "bxgy.metafield.update",
        shopId,
        metafieldValue,
      });

      await setMetafield(
        admin,
        shopId,
        "bxgy_top_collection",
        metafieldValue,
        discountNodeId,
      );
    } else {
      log.info("No active BXGY campaigns", {
        event: "bxgy.update.cleared",
        shopId,
      });

      await setMetafield(
        admin,
        shopId,
        "bxgy_top_collection",
        { collectionIds: [], activeCampaigns: [], topCampaign: null },
        discountNodeId,
      );
    }

    log.info("Campaign update completed", {
      event: "campaign.update.success",
      shopId,
    });

    return json({
      success: true,
      message: "✅ Campaigns reordered and BXGY metafield synced",
      campaigns: orderedCampaigns,
    });
  });
};
