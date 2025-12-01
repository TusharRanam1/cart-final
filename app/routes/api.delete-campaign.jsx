import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const body = await request.json();
  const { namespace, key, id } = body; // ✅ now we accept campaign id, not index

  if (!id) {
    return json({ success: false, message: "Missing campaign id" }, { status: 400 });
  }

  // 1. Fetch shop ID + current metafield
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
  const variables = { namespace, key };

  const response = await fetch(
    `https://${session.shop}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const data = await response.json();
  const shopId = data?.data?.shop?.id;
  const metafield = data?.data?.shop?.metafield;

  if (!shopId) {
    return json({ success: false, message: "Shop ID not found" }, { status: 404 });
  }

  if (!metafield) {
    return json({ success: false, message: "Metafield not found" }, { status: 404 });
  }

  let campaigns = [];
  try {
    campaigns = JSON.parse(metafield.value).campaigns || [];
  } catch {
    return json({ success: false, message: "Invalid metafield format" }, { status: 500 });
  }

  // 2. Remove campaign by id
  const updatedCampaigns = campaigns.filter((c) => c.id !== id);

  if (updatedCampaigns.length === campaigns.length) {
    return json({ success: false, message: "Campaign not found" }, { status: 404 });
  }

  // 3. Update metafield using `metafieldsSet`
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

  const newValue = JSON.stringify({ campaigns: updatedCampaigns });

  const updateResponse = await fetch(
    `https://${session.shop}/admin/api/2025-01/graphql.json`,
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
              ownerId: shopId, // ✅ required
              type: "json",
              value: newValue,
            },
          ],
        },
      }),
    }
  );

  const updateData = await updateResponse.json();
  const result = updateData.data?.metafieldsSet;

  if (updateData.errors || result?.userErrors?.length) {
    return json(
      { success: false, errors: updateData.errors || result.userErrors },
      { status: 400 }
    );
  }

  return json({ success: true, campaigns: updatedCampaigns });
};
