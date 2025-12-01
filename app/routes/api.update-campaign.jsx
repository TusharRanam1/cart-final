import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

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
  const res = await admin.graphql(mutation, { variables });
  const data = await res.json();
  if (data?.data?.metafieldsSet?.userErrors?.length) {
    console.error("❌ Metafield save error:", data.data.metafieldsSet.userErrors);
  } else {
    console.log("✅ Metafield saved:", key, data.data.metafieldsSet.metafields[0]);
  }
  return data;
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
  const { campaigns } = await request.json();

  if (!Array.isArray(campaigns)) {
    return json({ success: false, message: "Invalid campaigns array" }, { status: 400 });
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
    return json({ success: false, message: "Shop ID not found" }, { status: 500 });
  }

  // 3️⃣ Save updated campaign list to metafield
  await setMetafield(admin, shopId, "campaigns", { campaigns: orderedCampaigns });

  // 4️⃣ Get Discount Node dynamically
  const discountNodeId = await getDiscountNodeId(admin);
  if (!discountNodeId) {
    return json({
      success: false,
      message: "No DiscountAutomaticNode found for this app.",
    });
  }

  // 5️⃣ Determine active BXGY campaigns
  const activeBxgys = orderedCampaigns.filter(
    (c) => c.campaignType === "bxgy" && c.status === "active"
  );

  if (activeBxgys.length > 0) {
    const allCollections = [];
    const activeCampaignsInfo = [];

    for (const campaign of activeBxgys) {
      const goal = campaign.goals?.[0];
      if (
        (goal?.bxgyMode === "collection" || goal?.bxgyMode === "spend_any_collection") &&
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
    const topCampaign = activeBxgys.sort((a, b) => a.priority - b.priority)[0];

    const metafieldValue = {
      collectionIds: allCollections,
      activeCampaigns: activeCampaignsInfo,
      topCampaign: {
        id: topCampaign.id,
        name: topCampaign.campaignName,
        priority: topCampaign.priority,
      },
    };

    console.log("🏆 Updating bxgy_top_collection with:", metafieldValue);

    await setMetafield(
      admin,
      shopId,
      "bxgy_top_collection",
      metafieldValue,
      discountNodeId
    );
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

  return json({
    success: true,
    message: "✅ Campaigns reordered and BXGY metafield synced",
    campaigns: orderedCampaigns,
  });
};
