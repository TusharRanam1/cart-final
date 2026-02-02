import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

/* ------------------ Helper: Save metafield ------------------ */
async function setMetafield(admin, shopId, key, valueObj, ownerId = shopId) {
  log.debug("setMetafield called", {
    event: "metafield.set.called",
    key,
    ownerId,
  });

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
        ownerId,
        value: JSON.stringify(valueObj),
      },
    ],
  };

  const res = await admin.graphql(mutation, { variables });
  const data = await res.json();

  const errors = data?.data?.metafieldsSet?.userErrors;
  if (errors?.length) {
    log.error("Metafield save failed", {
      event: "metafield.save.failed",
      key,
      ownerId,
      errors,
    });
  } else {
    log.info("Metafield saved successfully", {
      event: "metafield.save.success",
      key,
      ownerId,
      metafieldId: data?.data?.metafieldsSet?.metafields?.[0]?.id,
    });
  }

  return data;
}

/* ------------------ Helper: Find Discount Node ------------------ */
async function getDiscountNodeId(admin) {
  const query = `
    query {
      discountNodes(first: 20) {
        edges {
          node {
            id
            discount {
              ... on DiscountAutomaticApp {
                title
                appDiscountType { functionId }
              }
              ... on DiscountCodeApp {
                title
                appDiscountType { functionId }
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

    const targetFunctionId = process.env.BXGY_FUNCTION_ID?.toLowerCase();

    const found =
      nodes.find(
        (e) =>
          e.node.discount?.appDiscountType?.functionId?.toLowerCase() ===
          targetFunctionId,
      ) ||
      nodes.find((e) =>
        (e.node.discount?.title || "").toLowerCase().includes("buy x get y"),
      );

    if (found) {
      log.info("BXGY discount node resolved", {
        event: "bxgy.discount.node.found",
        discountNodeId: found.node.id,
      });
      return found.node.id;
    }

    log.warn("BXGY discount node not found", {
      event: "bxgy.discount.node.missing",
    });
    return null;
  } catch (err) {
    log.error("Failed to fetch discount nodes", {
      event: "discount.node.fetch.error",
      error: err,
    });
    return null;
  }
}

/* ------------------ Main Action ------------------ */
export const action = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Campaign save request received", {
        event: "campaign.save.received",
      });

      const { admin } = await authenticate.admin(request);

      /* 1️⃣ Get shopId */
      const shopRes = await admin.graphql(`{ shop { id } }`);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (!shopId) {
        log.error("Shop ID not resolved", {
          event: "campaign.save.shop_missing",
        });
        return json({ ok: false, error: "Shop not found" }, { status: 500 });
      }

      /* 2️⃣ Load existing campaigns */
      const existingRes = await admin.graphql(`
        query {
          shop {
            metafield(namespace: "optimaio_cart", key: "campaigns") {
              value
            }
          }
        }
      `);

      const existingData = await existingRes.json();
      let campaigns = [];

      if (existingData?.data?.shop?.metafield?.value) {
        try {
          campaigns =
            JSON.parse(existingData.data.shop.metafield.value).campaigns || [];
        } catch (err) {
          log.warn("Failed to parse campaigns metafield", {
            event: "campaign.parse.failed",
            error: err,
          });
        }
      }

      /* 3️⃣ Incoming campaign */
      const newCampaign = await request.json();

      log.debug("Incoming campaign payload", {
        event: "campaign.incoming",
        campaignId: newCampaign.id,
      });

      /* 4️⃣ Upsert campaign */
      const idx = campaigns.findIndex((c) => c.id === newCampaign.id);
      if (idx > -1) {
        campaigns[idx] = newCampaign;
      } else {
        newCampaign.priority ??= campaigns.length + 1;
        campaigns.push(newCampaign);
      }

      /* 5️⃣ Normalize priorities */
      const normalizedCampaigns = campaigns.map((c, i) => ({
        ...c,
        priority: typeof c.priority === "number" ? c.priority : i + 1,
      }));

      await setMetafield(admin, shopId, "campaigns", {
        campaigns: normalizedCampaigns,
      });

      /* 6️⃣ BXGY sync */
      const discountNodeId = await getDiscountNodeId(admin);
      if (!discountNodeId) {
        return json({
          ok: true,
          warning: "Discount node not found",
          campaigns: normalizedCampaigns,
        });
      }

      const activeBxgys = normalizedCampaigns.filter(
        (c) => c.campaignType === "bxgy" && c.status === "active",
      );

      if (activeBxgys.length > 0) {
        const allCollections = [];
        const activeCampaignsInfo = [];

        for (const c of activeBxgys) {
          const goal = c.goals?.[0];
          if (["collection", "spend_any_collection"].includes(goal?.bxgyMode)) {
            goal.buyCollections?.forEach((col) => {
              if (!allCollections.includes(col.id)) {
                allCollections.push(col.id);
              }
            });
          }

          activeCampaignsInfo.push({
            id: c.id,
            name: c.campaignName,
            priority: c.priority,
          });
        }

        const topCampaign = [...activeBxgys].sort(
          (a, b) => a.priority - b.priority,
        )[0];

        await setMetafield(
          admin,
          shopId,
          "bxgy_top_collection",
          {
            collectionIds: allCollections,
            activeCampaigns: activeCampaignsInfo,
            topCampaign: {
              id: topCampaign.id,
              name: topCampaign.campaignName,
              priority: topCampaign.priority,
            },
          },
          discountNodeId,
        );
      } else {
        await setMetafield(
          admin,
          shopId,
          "bxgy_top_collection",
          {
            collectionIds: [],
            activeCampaigns: [],
            topCampaign: null,
          },
          discountNodeId,
        );
      }

      log.info("Campaign saved successfully", {
        event: "campaign.save.success",
        campaignId: newCampaign.id,
      });

      return json({
        ok: true,
        campaign: newCampaign,
        campaigns: normalizedCampaigns,
      });
    } catch (err) {
      log.error("Campaign save failed", {
        event: "campaign.save.exception",
        error: err,
      });

      return json(
        { ok: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  });
};
