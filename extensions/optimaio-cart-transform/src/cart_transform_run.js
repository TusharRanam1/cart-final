// @ts-nocheck

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 */

/**
 * @type {CartTransformRunResult}
 */
const NO_CHANGES = { operations: [] };

/**
 * A Shopify Cart Transform Function.
 * Reads campaign metafields and optionally modifies cart lines.
 *
 * @param {RunInput} input
 * @returns {CartTransformRunResult}
 */

// @ts-nocheck
// @ts-nocheck

// extensions/cart-transform/cartTransformRun.js
export function cartTransformRun(input) {
  const TARGET_VARIANT_ID = "gid://shopify/ProductVariant/47197882613915"; // The main product
  const FREE_GIFT_VARIANT_ID = "gid://shopify/ProductVariant/47197882613915"; // Your free gift variant

  /** @type {Operation[]} */
  const operations = [];

  // Check if target product exists in cart
  const hasTarget = input.cart.lines.some(
    (line) =>
      line.merchandise.__typename === "ProductVariant" &&
      line.merchandise.id === TARGET_VARIANT_ID
  );

  // Check if gift is already in cart
  const giftLine = input.cart.lines.find(
    (line) =>
      line.merchandise.__typename === "ProductVariant" &&
      line.merchandise.id === FREE_GIFT_VARIANT_ID
  );

  // ✅ Add free gift if target present and gift missing
  if (hasTarget && !giftLine) {
    operations.push({
      lineAdd: {
        merchandiseId: FREE_GIFT_VARIANT_ID,
        quantity: 1,
        title: "🎁 Free Gift",
        price: {
          adjustment: {
            fixedPricePerUnit: { amount: "0.0" },
          },
        },
      },
    });
  }

  // 🧹 Remove free gift if target removed
  if (!hasTarget && giftLine) {
    operations.push({
      lineUpdate: {
        cartLineId: giftLine.id,
        quantity: 0, // removing the line
      },
    });
  }

  return operations.length > 0 ? { operations } : NO_CHANGES;
}


