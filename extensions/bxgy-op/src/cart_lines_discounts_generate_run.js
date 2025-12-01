import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
} from "../generated/api";
 
/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */
 
/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart.lines.length) throw new Error("No cart lines found");
 
  const hasOrderDiscountClass = input.discount.discountClasses.includes(DiscountClass.Order);
  const hasProductDiscountClass = input.discount.discountClasses.includes(DiscountClass.Product);
 
  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
    return { operations: [] };
  }
 
  const operations = [];
  const productDiscountCandidates = [];
  const orderDiscountCandidates = [];
 
  /* =========================================================
     🟣 Parse metafield campaigns
     ========================================================= */
  let campaignData = {};
  try {
    campaignData = JSON.parse(input.shop?.metafield?.value || "{}");
  } catch (err) {
    console.error("Error parsing campaign metafield JSON:", err);
  }
 
  const campaigns = (campaignData.campaigns || []).filter(
    (c) => c.status === "active" && c.campaignType === "bxgy"
  );
 
  /* =========================================================
     🟢 BXGY LOGIC
     ========================================================= */
  if (campaigns.length && hasProductDiscountClass) {
    campaigns.forEach((campaign) => {
      const { campaignName, goals } = campaign;
      if (!goals?.length) return;
 
      goals.forEach((goal) => {
        const buyQty = parseFloat(goal.buyQty || 0);
        const buyProductIds = goal.buyProducts?.map((p) => p.id) || [];
        const getProductIds = goal.getProducts?.map((p) => p.id) || [];
 
        const totalBuyQtyInCart = input.cart.lines.reduce((sum, line) => {
          return buyProductIds.includes(line.merchandise?.id)
            ? sum + (line.quantity ?? 1)
            : sum;
        }, 0);
 
        // ✅ If condition met → mark get products free
        if (totalBuyQtyInCart >= buyQty && getProductIds.length) {
          input.cart.lines.forEach((line) => {
            if (getProductIds.includes(line.merchandise?.id)) {
              productDiscountCandidates.push({
                message: `Free Gift – ${campaignName}`,
                targets: [{ cartLine: { id: line.id } }],
                value: { percentage: { value: 100 } },
              });
            }
          });
        }
      });
    });
  }
 
  /* =========================================================
     🟢 Example product discount (only for fallback / demo)
     ========================================================= */
  if (hasProductDiscountClass && input.cart.lines.length > 0) {
    const maxCartLine = input.cart.lines.reduce((maxLine, line) =>
      line.cost.amountPerQuantity.amount > maxLine.cost.amountPerQuantity.amount
        ? line
        : maxLine
    , input.cart.lines[0]);
 
    // Example: fallback discount — remove if not needed
    // productDiscountCandidates.push({
    //   message: "20% OFF PRODUCT",
    //   targets: [{ cartLine: { id: maxCartLine.id } }],
    //   value: { percentage: { value: 20 } },
    // });
  }
 
  /* =========================================================
     🟢 Example order discount (optional)
     ========================================================= */
  if (hasOrderDiscountClass) {
    orderDiscountCandidates.push({
      message: "10% OFF ORDER",
      targets: [{ orderSubtotal: { excludedCartLineIds: [] } }],
      value: { percentage: { value: 10 } },
    });
  }
 
  /* =========================================================
     ✅ Push only ONE operation per type
     ========================================================= */
  if (orderDiscountCandidates.length) {
    operations.push({
      orderDiscountsAdd: {
        candidates: orderDiscountCandidates,
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  }
 
  if (productDiscountCandidates.length) {
    operations.push({
      productDiscountsAdd: {
        candidates: productDiscountCandidates,
        selectionStrategy: ProductDiscountSelectionStrategy.All,
      },
    });
  }
 
  return { operations };
}