import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

/* ------------------ Helpers ------------------ */
function getDefaultActiveDates() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");

  return {
    start: { date: `${y}-${m}-${d}` },
    end: { date: null },
    hasEndDate: false,
  };
}

function generateId() {
  return `cmp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function getNextCampaignNumber(campaigns) {
  let max = 0;
  campaigns.forEach((c) => {
    const match = c.campaignName.match(/Cart goals (\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  });
  return max + 1;
}

/* ------------------ Save metafield ------------------ */
async function setMetafield(admin, shopId, key, valueObj) {
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
        ownerId: shopId,
        value: JSON.stringify(valueObj),
      },
    ],
  };

  return admin.graphql(mutation, { variables });
}

/* ------------------ Ensure Automatic Discount ------------------ */
const DISCOUNT_FUNCTION_ID = process.env.TIERED_DISCOUNT_FUNCTION_ID;
const DISCOUNT_TITLE = "Optimaio Automatic Tier Discount";

async function ensureAutomaticDiscountExists(admin, shop) {
  const checkQuery = `
    query {
      discountNodes(first: 50) {
        nodes {
          id
          discount {
            ... on DiscountAutomaticApp {
              title
              status
              appDiscountType {
                functionId
                appKey
              }
            }
          }
        }
      }
    }
  `;

  const res = await admin.graphql(checkQuery);
  const data = await res.json();

  const existing = data?.data?.discountNodes?.nodes?.find(
    (node) =>
      node?.discount?.title === DISCOUNT_TITLE &&
      node?.discount?.appDiscountType?.functionId === DISCOUNT_FUNCTION_ID,
  );

  if (existing) {
    log.info("Automatic discount already exists", {
      event: "tiered.discount.exists",
      shop,
      discountNodeId: existing.id,
    });
    return existing.discount;
  }

  log.info("Creating automatic tier discount", {
    event: "tiered.discount.create.start",
    shop,
  });

  const createMutation = `
    mutation discountAutomaticAppCreate(
      $automaticAppDiscount: DiscountAutomaticAppInput!
    ) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        userErrors { field message }
        automaticAppDiscount {
          discountId
          title
          status
          appDiscountType { functionId appKey }
        }
      }
    }
  `;

  const variables = {
    automaticAppDiscount: {
      title: DISCOUNT_TITLE,
      functionId: DISCOUNT_FUNCTION_ID,
      startsAt: new Date().toISOString(),
      discountClasses: ["ORDER", "PRODUCT", "SHIPPING"],
      combinesWith: {
        orderDiscounts: true,
        productDiscounts: true,
        shippingDiscounts: true,
      },
    },
  };

  const createRes = await admin.graphql(createMutation, { variables });
  const createData = await createRes.json();

  const errors = createData?.data?.discountAutomaticAppCreate?.userErrors;

  if (errors?.length) {
    log.error("Automatic discount creation failed", {
      event: "tiered.discount.create.failed",
      shop,
      errors,
    });
    return null;
  }

  log.info("Automatic discount created", {
    event: "tiered.discount.create.success",
    shop,
    discount: createData.data.discountAutomaticAppCreate.automaticAppDiscount,
  });

  return createData.data.discountAutomaticAppCreate.automaticAppDiscount;
}

/* ------------------ Main Action ------------------ */
export const action = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Create tiered campaign request received", {
        event: "tiered.campaign.create.received",
      });

      const { admin, session } = await authenticate.admin(request);
      const shop = session.shop;

      await ensureAutomaticDiscountExists(admin, shop);

      // Get shop ID
      const shopRes = await admin.graphql(`{ shop { id } }`);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (!shopId) {
        log.error("Shop ID not resolved for campaign create", {
          event: "tiered.campaign.create.shop_missing",
          shop,
        });

        return json({ ok: false, error: "Shop not found" }, { status: 500 });
      }

      // Fetch existing campaigns
      const query = `
        query {
          shop {
            metafield(namespace: "optimaio_cart", key: "campaigns") {
              id
              value
            }
          }
        }
      `;

      const existingRes = await admin.graphql(query);
      const existingData = await existingRes.json();
      const existingMetafield = existingData?.data?.shop?.metafield;

      let campaigns = [];
      if (existingMetafield?.value) {
        try {
          campaigns = JSON.parse(existingMetafield.value).campaigns || [];
        } catch {
          log.warn("Invalid campaigns metafield JSON", {
            event: "tiered.campaign.parse_failed",
            shop,
          });
        }
      }

      const nextNumber = getNextCampaignNumber(campaigns);

      const newCampaign = {
        id: generateId(),
        campaignName: `Cart goals ${nextNumber}`,
        status: "draft",
        campaignType: "tiered",
        activeDates: getDefaultActiveDates(),
      };

      campaigns.push(newCampaign);

      log.info("Saving new tiered campaign", {
        event: "tiered.campaign.create.save",
        shop,
        campaignId: newCampaign.id,
      });

      await setMetafield(admin, shopId, "campaigns", { campaigns });

      log.info("Tiered campaign created successfully", {
        event: "tiered.campaign.create.success",
        shop,
        campaignId: newCampaign.id,
      });

      return json({ ok: true, campaign: newCampaign });
    } catch (err) {
      log.error("Create tiered campaign failed", {
        event: "tiered.campaign.create.exception",
        error: err,
      });

      return json(
        { ok: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  });
};
