import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/* ================= ACTION ================= */
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();

    const { normalUpsell = {}, oneClickUpsell = {} } = body;

    /* ================= GET SHOP ID ================= */
    const shopRes = await admin.graphql(`
      query {
        shop {
          id
        }
      }
    `);

    const shopData = await shopRes.json();
    const shopId = shopData?.data?.shop?.id;

    if (!shopId) {
      throw new Error("Shop ID not found");
    }

    /* ================= METAFIELD VALUE ================= */
    const metafieldValue = {
      normalUpsell: {
        enabled: normalUpsell.enabled ?? false,
        upsellType: normalUpsell.upsellType ?? "recommended",
        displayLayout: normalUpsell.displayLayout ?? "carousel",
        ctaAction: normalUpsell.ctaAction ?? "add_to_cart",
        relatedProductCount: normalUpsell.relatedProductCount ?? 4,
        selectedVariants: Array.isArray(normalUpsell.selectedVariants)
          ? normalUpsell.selectedVariants
          : [],

        // ✅ ADD THESE
        upsellTitle:
          typeof normalUpsell.upsellTitle === "string"
            ? normalUpsell.upsellTitle
            : "You might like also",

        buttonText:
          typeof normalUpsell.buttonText === "string"
            ? normalUpsell.buttonText
            : "Add",
      },

      oneClickUpsell: {
        enabled: oneClickUpsell.enabled ?? false,
        ctaType: oneClickUpsell.ctaType ?? "checkbox",
        product: oneClickUpsell.product ?? null,
        upsellText: oneClickUpsell.upsellText ?? "",
        showProductImage: !!oneClickUpsell.showProductImage,
        showInCartList: !!oneClickUpsell.showInCartList,

        // ✅ ADD
        upsellTitle:
          typeof oneClickUpsell.upsellTitle === "string"
            ? oneClickUpsell.upsellTitle
            : "Frequently bought together",

        buttonText:
          typeof oneClickUpsell.buttonText === "string"
            ? oneClickUpsell.buttonText
            : "Add to cart",
      },
    };

    /* ================= GRAPHQL MUTATION ================= */
    const mutation = `
      mutation SetUpsellSettings($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      metafields: [
        {
          ownerId: shopId,
          namespace: "optimaio_cart",
          key: "upsell_settings",
          type: "json",
          value: JSON.stringify(metafieldValue),
        },
      ],
    };

    const response = await admin.graphql(mutation, { variables });
    const result = await response.json();

    const errors = result?.data?.metafieldsSet?.userErrors;
    if (errors?.length) {
      return json({ error: errors[0].message }, { status: 400 });
    }

    return json({ success: true });
  } catch (error) {
    console.error("Upsell metafield error:", error);
    return json({ error: "Failed to save upsell settings" }, { status: 500 });
  }
};
