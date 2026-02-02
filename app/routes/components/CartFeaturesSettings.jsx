import { Box, Button, InlineStack, BlockStack, Text } from "@shopify/polaris";
import HelpHeader from "./HelpHeader";

/* ---------------- Toggle Pill ---------------- */
function TogglePill({ value, onChange, labels = ["Yes", "No"] }) {
  return (
    <Box
      background="bg-surface-secondary"
      borderRadius="200"
      padding="100"
      inlineSize="fit-content"
    >
      <InlineStack gap="100">
        <Button
          size="slim"
          variant={value ? "primary" : "tertiary"}
          onClick={() => onChange(true)}
        >
          {labels[0]}
        </Button>
        <Button
          size="slim"
          variant={!value ? "primary" : "tertiary"}
          onClick={() => onChange(false)}
        >
          {labels[1]}
        </Button>
      </InlineStack>
    </Box>
  );
}

/* ---------------- Main Component ---------------- */
export default function CartFeaturesSettings({ value, onChange }) {
  const {
    offerAnimation = "confetti", // "confetti" | "none"
    discountCodeInput = true,
    orderNotes = true,
  } = value || {};

  const update = (patch) => {
    onChange({
      ...value,
      ...patch,
    });
  };

  return (
    <BlockStack gap="400">
      {/* Offer animation */}
      <Box>
        <HelpHeader
          title="Offer animation"
          helpText="Choose an animation to celebrate when customers add items to their cart."
        />
        <InlineStack gap="100" paddingBlockStart="200">
          <Box
            background="bg-surface-secondary"
            borderRadius="200"
            padding="100"
            inlineSize="fit-content"
          >
            <InlineStack gap="100">
              <Button
                size="slim"
                variant={offerAnimation === "confetti" ? "primary" : "tertiary"}
                onClick={() => update({ offerAnimation: "confetti" })}
              >
                Confetti
              </Button>
              <Button
                size="slim"
                variant={offerAnimation === "none" ? "primary" : "tertiary"}
                onClick={() => update({ offerAnimation: "none" })}
              >
                None
              </Button>
            </InlineStack>
          </Box>
        </InlineStack>
      </Box>

      {/* Discount code input */}
      <Box>
        <HelpHeader
          title="Discount code input"
          helpText="Allow customers to enter discount codes directly in the cart."
        />

        <InlineStack paddingBlockStart="200">
          <TogglePill
            value={discountCodeInput}
            onChange={(v) => update({ discountCodeInput: v })}
          />
        </InlineStack>
      </Box>

      {/* Order notes */}
      <Box>
        <HelpHeader
          title="Order notes"
          helpText="Allow customers to add notes to their order. You can view this note along with the order details in the Shopify dasboard."
        />

        <InlineStack paddingBlockStart="200">
          <TogglePill
            value={orderNotes}
            onChange={(v) => update({ orderNotes: v })}
          />
        </InlineStack>
      </Box>
    </BlockStack>
  );
}
