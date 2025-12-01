/**
 * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunInput} RunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunResult} Result
 */
export function cartDeliveryOptionsDiscountsGenerateRun(input) {
  if (!input.cart?.lines?.length) return { operations: [] };

  // 🧩 Parse campaigns metafield
  const campaignsData = JSON.parse(input.shop?.metafield?.value || "{}");
  const campaigns = campaignsData.campaigns || [];

  // ✅ Filter only active campaigns
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  if (!activeCampaigns.length) return { operations: [] };

  // 🧮 Calculate total quantity in cart
  const totalQty =
    input.cart.lines?.reduce((sum, l) => sum + (l.quantity ?? 1), 0) ?? 0;

  const ops = [];

  // Loop through active campaigns
  activeCampaigns.forEach((campaign) => {
    const { trackType, goals } = campaign;
    if (!goals?.length) return;

    // ✅ For now only trackType = "quantity"
    if (trackType !== "quantity") return;

    // Find all free shipping goals whose target is met
    const eligibleShippingGoals = goals.filter(
      (g) => g.type === "free_shipping" && totalQty >= (g.target ?? 0)
    );

    // 🟢 Pick the highest target (most advanced tier)
    const bestGoal = eligibleShippingGoals.sort(
      (a, b) => b.target - a.target
    )[0];

    if (bestGoal) {
      ops.push({
        deliveryDiscountsAdd: {
          candidates: [
            {
              message: "Free Shipping",
              targets: input.cart.deliveryGroups.map((g) => ({
                deliveryGroup: { id: g.id },
              })),
              value: { percentage: { value: 100 } },
            },
          ],
          selectionStrategy: "ALL",
        },
      });
    }
  });

  // 🏁 Return operations
  return { operations: ops };
}
