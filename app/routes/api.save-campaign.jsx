import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/* Helper: Save metafield */
async function setMetafield(admin, shopId, key, valueObj, ownerId = shopId) {
  console.log("🧠 setMetafield called:", { key, ownerId, valueObj });
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
  if (data?.data?.metafieldsSet?.userErrors?.length) {
    console.error("❌ Metafield save error:", data.data.metafieldsSet.userErrors);
  } else {
    console.log("✅ Metafield saved successfully:", data.data.metafieldsSet.metafields);
  }
  return data;
}

/* 🔍 Helper: Find this app’s DiscountAutomaticNode dynamically */
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
    console.log("🔍 Discount nodes found:", JSON.stringify(nodes, null, 2));

    // Match your app’s unique function ID or title
    const targetFunctionId = process.env.BXGY_FUNCTION_ID;

   const foundNode =
  nodes.find((edge) => {
    const d = edge.node.discount;
    if (!d) return false;
    const funcId = d.appDiscountType?.functionId?.toLowerCase?.() || "";
    return funcId === targetFunctionId.toLowerCase();
  }) ||
  nodes.find((edge) => {
    const d = edge.node.discount;
    const title = (d?.title || "").toLowerCase();
    return title.includes("buy x get y");
  });

    if (foundNode) {
      console.log("✅ Found Discount Node:", foundNode.node.id);
      return foundNode.node.id;
    }

    console.warn("⚠️ No Discount Node found for this app.");
    return null;
  } catch (err) {
    console.error("❌ Error fetching Discount Node:", err);
    return null;
  }
}


export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // 1️⃣ Get shopId
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  // 2️⃣ Fetch existing campaigns metafield
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
    } catch (err) {
      console.error("⚠️ Parse error:", err);
      campaigns = [];
    }
  }

  // 3️⃣ Get the new campaign from frontend
  const newCampaign = await request.json();
  console.log("🆕 Incoming campaign:", newCampaign);
  console.log("🆕 Incoming campaign date and time:", newCampaign.activeDates);

  // 4️⃣ Update or add campaign
  const idx = campaigns.findIndex((c) => c.id === newCampaign.id);
  if (idx > -1) {
    campaigns[idx] = newCampaign;
  } else {
    newCampaign.priority = newCampaign.priority ?? campaigns.length + 1;
    campaigns.push(newCampaign);
  }

  // 5️⃣ Normalize priorities
  const normalizedCampaigns = campaigns.map((c, i) => ({
    ...c,
    priority: typeof c.priority === "number" ? c.priority : i + 1,
  }));

  await setMetafield(admin, shopId, "campaigns", { campaigns: normalizedCampaigns });

  // 6️⃣ Get Discount Node dynamically (important!)
  const discountNodeId = await getDiscountNodeId(admin);
  if (!discountNodeId) {
    console.warn("⚠️ No DiscountAutomaticNode found. Skipping bxgy_top_collection update.");
    return json({ ok: true, warning: "Discount node not found", campaigns });
  }

  // 7️⃣ Gather active BXGY campaigns
  const activeBxgys = campaigns.filter(
    (c) => c.campaignType === "bxgy" && c.status === "active"
  );

  if (activeBxgys.length > 0) {
    const allCollections = [];
    const activeCampaignsInfo = [];

    for (const campaign of activeBxgys) {
      const goal = campaign.goals?.[0];
      // ✅ Include both "collection" and "spend_any_collection"
      if (
        (goal?.bxgyMode === "collection" || goal?.bxgyMode === "spend_any_collection") &&
        goal.buyCollections?.length > 0
      ) {
        for (const col of goal.buyCollections) {
          if (!allCollections.includes(col.id)) {
            allCollections.push(col.id);
          }
        }
      }

      activeCampaignsInfo.push({
        id: campaign.id,
        name: campaign.campaignName,
        priority: campaign.priority,
      });
    }

    // Find top priority active BXGY (lowest number = highest priority)
    const topCampaign = activeBxgys.sort((a, b) => a.priority - b.priority)[0];

    const valueObj = {
      collectionIds: allCollections,
      activeCampaigns: activeCampaignsInfo,
      topCampaign: {
        id: topCampaign.id,
        name: topCampaign.campaignName,
        priority: topCampaign.priority,
      },
    };

    console.log("📦 Updating metafield with all active BXGY collections:", valueObj);

    await setMetafield(admin, shopId, "bxgy_top_collection", valueObj, discountNodeId);
  } else {
    console.log("🕸 No active BXGY campaigns found — clearing metafield.");
    await setMetafield(
      admin,
      shopId,
      "bxgy_top_collection",
      { collectionIds: [], activeCampaigns: [], topCampaign: null },
      discountNodeId
    );
  }

  return json({ ok: true, campaign: newCampaign, campaigns });
};
