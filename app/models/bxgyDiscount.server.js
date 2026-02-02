import { log } from "../routes/logger/logger.server";

const DISCOUNT_FUNCTION_ID = process.env.BXGY_FUNCTION_ID;
const DISCOUNT_TITLE = "Optimaio Buy X Get Y Discount";

export async function ensureBxgyDiscountExists(admin, shop) {
  /* -------- Check if discount already exists -------- */
  const checkQuery = `
    query {
      discountNodes(first: 50) {
        nodes {
          id
          discount {
            ... on DiscountAutomaticApp {
              title
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

  /* -------- Create discount -------- */
  log.info("Creating BXGY automatic discount", {
    event: "bxgy.discount.create.start",
    shop,
  });

  const mutation = `
    mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        automaticAppDiscount {
          discountId
          title
          status
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

  log.info("BXGY discount created successfully", {
    event: "bxgy.discount.create.success",
    shop,
    discountId:
      createData.data.discountAutomaticAppCreate.automaticAppDiscount
        .discountId,
  });

  return createData.data.discountAutomaticAppCreate.automaticAppDiscount;
}
