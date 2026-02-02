import { log } from "../routes/logger/logger.server";

const DISCOUNT_FUNCTION_ID = process.env.TIERED_DISCOUNT_FUNCTION_ID;
const DISCOUNT_TITLE = "Optimaio Automatic Tier Discount";

export async function ensureTieredDiscountExists(admin, shop) {
  /* -------- Check if discount already exists -------- */
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
    log.info("Tiered automatic discount already exists", {
      event: "tiered.discount.exists",
      shop,
      discountNodeId: existing.id,
    });
    return existing.discount;
  }

  /* -------- Create discount -------- */
  log.info("Creating tiered automatic discount", {
    event: "tiered.discount.create.start",
    shop,
  });

  const mutation = `
    mutation discountAutomaticAppCreate(
      $automaticAppDiscount: DiscountAutomaticAppInput!
    ) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        automaticAppDiscount {
          discountId
          title
          status
          appDiscountType {
            functionId
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const createRes = await admin.graphql(mutation, {
    variables: {
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
    },
  });

  const createData = await createRes.json();
  const errors = createData?.data?.discountAutomaticAppCreate?.userErrors;

  if (errors?.length) {
    log.error("Tiered automatic discount creation failed", {
      event: "tiered.discount.create.failed",
      shop,
      errors,
    });
    return null;
  }

  log.info("Tiered automatic discount created successfully", {
    event: "tiered.discount.create.success",
    shop,
    discountId:
      createData.data.discountAutomaticAppCreate.automaticAppDiscount
        .discountId,
  });

  return createData.data.discountAutomaticAppCreate.automaticAppDiscount;
}
