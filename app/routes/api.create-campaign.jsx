import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

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
const DISCOUNT_FUNCTION_ID = process.env.TIERED_DISCOUNT_FUNCTION_ID; // same as tiers.jsx
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
                appKey
                functionId
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

  // 2️⃣ Create new discount (only if not found)
  const createMutation = `
    mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        automaticAppDiscount {
          discountId
          title
          status
          startsAt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    automaticAppDiscount: {
      title: DISCOUNT_TITLE,
      functionId: DISCOUNT_FUNCTION_ID,
      discountClasses: ["ORDER", "PRODUCT", "SHIPPING"],
      startsAt: new Date().toISOString(), // required
      combinesWith: {
        orderDiscounts: true,
        productDiscounts: true,
        shippingDiscounts: true,
      },
    },
  };

  const createRes = await admin.graphql(createMutation, { variables });
  const createData = await createRes.json();

  if (createData.data?.discountAutomaticAppCreate?.userErrors?.length) {
    console.error(
      "⚠️ Automatic discount creation errors:",
      createData.data.discountAutomaticAppCreate.userErrors
    );
  } else {
    console.log(
      "✅ Discount created:",
      createData.data.discountAutomaticAppCreate.automaticAppDiscount
    );
  }

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

  // ✅ Step 1: Make sure automatic discount exists before campaign creation
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

  // Step 4: Create new campaign object
  const nextNumber = getNextCampaignNumber(campaigns);
  const newCampaign = {
    id: generateId(),
    campaignName: `Cart goals ${nextNumber}`,
    status: "draft",
    campaignType: "tiered",
  };
  campaigns.push(newCampaign);

  // Step 5: Save updated metafield
  await setMetafield(admin, shopId, "campaigns", { campaigns });

  return json({ ok: true, campaign: newCampaign });
};
