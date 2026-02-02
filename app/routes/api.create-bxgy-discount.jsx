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

function getDefaultBxgyGoal() {
  return {
    id: `BXGY_${Date.now()}`,
    bxgyMode: "product",
    buyQty: 1,
    buyProducts: [],
    buyCollections: [],
    getQty: 1,
    getProducts: [],
    discountType: "free_product",
    discountValue: 0,
  };
}

function generateId() {
  return `bxgy_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function getNextBxgyNumber(campaigns) {
  let max = 0;
  campaigns.forEach((c) => {
    const match = c.campaignName.match(/Buy X Get Y (\d+)/);
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

  return admin.graphql(mutation, {
    variables: {
      metafields: [
        {
          namespace: "optimaio_cart",
          key,
          type: "json",
          ownerId: shopId,
          value: JSON.stringify(valueObj),
        },
      ],
    },
  });
}

/* ------------------ BXGY Discount ------------------ */
const DISCOUNT_FUNCTION_ID = process.env.BXGY_FUNCTION_ID;
const DISCOUNT_TITLE = "Optimaio Buy X Get Y Discount";

async function ensureBxgyDiscountExists(admin, shop) {
  const checkQuery = `
    query {
      discountNodes(first: 50) {
        nodes {
          id
          discount {
            ... on DiscountAutomaticApp {
              title
              appDiscountType { functionId }
            }
          }
        }
      }
    }
  `;

  const res = await admin.graphql(checkQuery);
  const data = await res.json();

  const existing = data?.data?.discountNodes?.nodes?.find(
    (n) =>
      n?.discount?.title === DISCOUNT_TITLE &&
      n?.discount?.appDiscountType?.functionId === DISCOUNT_FUNCTION_ID,
  );

  if (existing) {
    log.info("BXGY discount already exists", {
      event: "bxgy.discount.exists",
      shop,
      discountNodeId: existing.id,
    });
    return existing.discount;
  }

  log.info("Creating BXGY automatic discount", {
    event: "bxgy.discount.create.start",
    shop,
  });

  const createMutation = `
    mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        automaticAppDiscount {
          discountId
          title
          status
        }
        userErrors { field message }
      }
    }
  `;

  const createRes = await admin.graphql(createMutation, {
    variables: {
      automaticAppDiscount: {
        title: DISCOUNT_TITLE,
        functionId: DISCOUNT_FUNCTION_ID,
        discountClasses: ["PRODUCT"],
        startsAt: new Date().toISOString(),
        combinesWith: {
          orderDiscounts: true,
          productDiscounts: true,
          shippingDiscounts: true,
        },
      },
    },
  });

  const createData = await createRes.json();
  const errors = createData?.data?.discountAutomaticAppCreate?.userErrors;

  if (errors?.length) {
    log.error("BXGY discount creation failed", {
      event: "bxgy.discount.create.failed",
      shop,
      errors,
    });
    return null;
  }

  log.info("BXGY discount created", {
    event: "bxgy.discount.create.success",
    shop,
  });

  return createData.data.discountAutomaticAppCreate.automaticAppDiscount;
}

/* ------------------ Main Action ------------------ */
export const action = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Create BXGY campaign request received", {
        event: "bxgy.campaign.create.received",
      });

      const { admin, session } = await authenticate.admin(request);
      const shop = session.shop;

      await ensureBxgyDiscountExists(admin, shop);

      const shopRes = await admin.graphql(`{ shop { id } }`);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (!shopId) {
        log.error("Shop ID missing for BXGY create", {
          event: "bxgy.campaign.shop_missing",
          shop,
        });

        return json({ ok: false }, { status: 500 });
      }

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

      try {
        campaigns =
          JSON.parse(existingData?.data?.shop?.metafield?.value)?.campaigns ||
          [];
      } catch {
        log.warn("Invalid campaigns metafield JSON", {
          event: "bxgy.campaign.parse_failed",
          shop,
        });
      }

      const newCampaign = {
        id: generateId(),
        campaignName: `Buy X Get Y ${getNextBxgyNumber(campaigns)}`,
        status: "draft",
        trackType: "cart",
        campaignType: "bxgy",
        goals: [getDefaultBxgyGoal()],
        activeDates: getDefaultActiveDates(),
        content: {},
        tzOffsetMinutes: new Date().getTimezoneOffset() * -1,
        priority: campaigns.length + 1,
      };

      campaigns.push(newCampaign);

      log.info("Saving BXGY campaign", {
        event: "bxgy.campaign.save",
        shop,
        campaignId: newCampaign.id,
      });

      await setMetafield(admin, shopId, "campaigns", { campaigns });

      log.info("BXGY campaign created successfully", {
        event: "bxgy.campaign.create.success",
        shop,
        campaignId: newCampaign.id,
      });

      return json({ ok: true, campaign: newCampaign });
    } catch (err) {
      log.error("Create BXGY campaign failed", {
        event: "bxgy.campaign.create.exception",
        error: err,
      });

      return json(
        { ok: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  });
};
