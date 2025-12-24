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

function getDefaultBxgyGoal() {
  return {
    id: `BXGY_${Date.now()}`,
    bxgyMode: "product",     // 👈 default
    buyQty: 1,               // 👈 default
    buyProducts: [],         // 👈 empty on creation
    buyCollections: [],
    getQty: 1,               // 👈 default
    getProducts: [],         // 👈 empty on creation
    discountType: "free_product",
    discountValue: 0,        // Or 10 if you want — tell me
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

/* ------------------ BXGY Discount Setup ------------------ */
const DISCOUNT_FUNCTION_ID = process.env.BXGY_FUNCTION_ID; // 👈 your Buy X Get Y function
const DISCOUNT_TITLE = "Optimaio Buy X Get Y Discount";

/* ------------------ Ensure BXGY Discount Exists ------------------ */
async function ensureBxgyDiscountExists(admin) {
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
    console.log("✅ BXGY discount already exists:", existing.id);
    return existing.discount;
  }

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
      discountClasses: ["PRODUCT"],
      startsAt: new Date().toISOString(),
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
      "⚠️ BXGY discount creation errors:",
      createData.data.discountAutomaticAppCreate.userErrors
    );
  } else {
    console.log(
      "✅ BXGY Discount created:",
      createData.data.discountAutomaticAppCreate.automaticAppDiscount
    );
  }

  return createData.data.discountAutomaticAppCreate.automaticAppDiscount;
}

/* ------------------ Helper: Generate BXGY Campaign ------------------ */
function generateId() {
  return `bxgy_${Date.now()}_${Math.floor(Math.random() * 100000)}`; // 👈 changed prefix
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

/* ------------------ Main Route Action ------------------ */
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // ✅ Step 1: Make sure BXGY automatic discount exists
  await ensureBxgyDiscountExists(admin);

  // Step 2: Get shopId
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  // Step 3: Fetch existing campaigns metafield
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

  // Step 4: Create new BXGY campaign
  const nextNumber = getNextBxgyNumber(campaigns);
  const newCampaign = {
      id: generateId(),
  campaignName: `Buy X Get Y ${nextNumber}`,
  status: "draft",                     // your example uses active
  trackType: "cart",
  campaignType: "bxgy",
  goals: [getDefaultBxgyGoal()],        // 👈 adds default goal
  activeDates: getDefaultActiveDates(), // 👈 adds default dates
  content: {},
  tzOffsetMinutes: new Date().getTimezoneOffset() * -1, // matches your example
  priority: campaigns.length + 1,  
  };
  campaigns.push(newCampaign);

  // Step 5: Save updated metafield
  await setMetafield(admin, shopId, "campaigns", { campaigns });

  return json({ ok: true, campaign: newCampaign });
};
