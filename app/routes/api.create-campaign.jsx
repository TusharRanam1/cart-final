import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

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

/* ------------------ Helper: Save metafield ------------------ */
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

  return await admin.graphql(mutation, { variables });
}

/* ------------------ Helper: Ensure Automatic Discount Exists ------------------ */
const DISCOUNT_FUNCTION_ID = process.env.TIERED_DISCOUNT_FUNCTION_ID; 
const DISCOUNT_TITLE = "Optimaio Automatic Tier Discount";

async function ensureAutomaticDiscountExists(admin) {
  // 1️⃣ Check if discount already exists
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
      node?.discount?.appDiscountType?.functionId === DISCOUNT_FUNCTION_ID
  );

  if (existing) {
    console.log("✅ Automatic discount already exists:", existing.id);
    return existing.discount;
  }

  // 2️⃣ Create discount using 2026-01 mutation format
  const createMutation = `
    mutation discountAutomaticAppCreate(
      $automaticAppDiscount: DiscountAutomaticAppInput!
    ) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        userErrors {
          field
          message
        }
        automaticAppDiscount {
          discountId
          title
          startsAt
          endsAt
          status
          appDiscountType {
            functionId
            appKey
          }
          discountClasses
          combinesWith {
            orderDiscounts
            productDiscounts
            shippingDiscounts
          }
        }
      }
    }
  `;

  const variables = {
    automaticAppDiscount: {
      title: DISCOUNT_TITLE,
      functionId: DISCOUNT_FUNCTION_ID, // RAW UUID
      startsAt: new Date().toISOString(),
      discountClasses: ["ORDER", "PRODUCT", "SHIPPING"], // REQUIRED in API 2026-01
      combinesWith: {
        orderDiscounts: true,
        productDiscounts: true,
        shippingDiscounts: true,
      }
      // ⚠ You said: "keep discount settings as is"
      // → Not adding metafields/config here
    },
  };

  const createRes = await admin.graphql(createMutation, { variables });
  const createData = await createRes.json();

  if (createData.data?.discountAutomaticAppCreate?.userErrors?.length) {
    console.error(
      "⚠️ Automatic discount creation errors:",
      createData.data.discountAutomaticAppCreate.userErrors
    );
    return null;
  }

  console.log(
    "✅ Discount created:",
    createData.data.discountAutomaticAppCreate.automaticAppDiscount
  );

  return createData.data.discountAutomaticAppCreate.automaticAppDiscount;
}

/* ------------------ Helper Functions ------------------ */
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

/* ------------------ Main Route Action ------------------ */
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Step 1: ensure discount exists
  await ensureAutomaticDiscountExists(admin);

  // Step 2: Get shopId
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  // Step 3: Get existing campaigns
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
  const existingMetafield = existingData.data.shop.metafield;

  let campaigns = [];
  if (existingMetafield?.value) {
    try {
      campaigns = JSON.parse(existingMetafield.value).campaigns || [];
    } catch {
      campaigns = [];
    }
  }

  // Step 4: Create new campaign
  const nextNumber = getNextCampaignNumber(campaigns);
  const newCampaign = {
    id: generateId(),
    campaignName: `Cart goals ${nextNumber}`,
    status: "draft",
    campaignType: "tiered",
    activeDates: getDefaultActiveDates(),
  };

  campaigns.push(newCampaign);

  // Step 5: Save metafield
  await setMetafield(admin, shopId, "campaigns", { campaigns });

  return json({ ok: true, campaign: newCampaign });
};
