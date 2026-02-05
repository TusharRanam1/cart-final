export function getInitialContentByGoal(goal) {
  switch (goal.type) {
    case "free_shipping":
      return {
        batchTitle: "Free Shipping",

        // Progress bar
        progressTextBefore:
          "Add {{goal}} more to get Free Shipping on this order",
        progressTextAfter: "Congratulations! You have unlocked Free Shipping!",

        // Below progress bar
        giftTitleBefore: "Free Shipping!",
        giftTitleAfter: "Free Shipping!",

        // Offer page
        offerTitle: "Free Shipping",
        offerSubtitle: "Add {{goal}} more to get free shipping on this order",
        offerSubtitleAfter: "Congratulations! You have unlocked free shipping!",
      };

    case "order_discount":
      return {
        batchTitle: "Offer Discount ",

        progressTextBefore:
          "Add {{goal}} more to get a {{discount}} discount on this order",
        progressTextAfter:
          "Congratulations! You have unlocked the {{discount}} discount!",

        giftTitleBefore: "{{discount}} Off",
        giftTitleAfter: "{{discount}} Off",

        offerTitle: "{{discount}} Discount",
        offerSubtitle:
          "Add {{goal}} more to get a {{discount}} discount on this order",
        offerSubtitleAfter:
          "Congratulations! You have unlocked the {{discount}} discount!",
      };

    case "free_product":
      return {
        batchTitle: "Free gift",

        progressTextBefore:
          "Add {{goal}} more to get Free Gift with this order",
        progressTextAfter: "Congratulations! You have unlocked Free Gift!",

        giftTitleBefore: "Free Gift!",
        giftTitleAfter: "Free Gift!",

        offerTitle: "Free Gift",
        offerSubtitle: "Add {{goal}} more to get Free Gift with this order",
        offerSubtitleAfter: "Congratulations! You have unlocked free Gift!",
      };

    default:
      return {};
  }
}

export function getInitialContentForBxgy() {
  return {
    batchTitle: "Buy X Get Y Offer",

    offerTitle: "Special Offer Unlocked",

    offerSubtitle:
      "Buy {{buyQty}} item(s) to get {{getQty}} item(s) at a discount",

    offerSubtitleAfter:
      "Congratulations! This Buy X Get Y offer is now active for you 🎉",
  };
}
