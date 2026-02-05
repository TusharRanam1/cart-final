import {
  BlockStack,
  Text,
  TextField,
  Divider,
  InlineStack,
  Button,
  Collapsible,
  Card,
} from "@shopify/polaris";
import { ChevronDownIcon, ChevronUpIcon } from "@shopify/polaris-icons";
import { useState } from "react";

/* ---------------- Collapsible Section ---------------- */
function CollapsibleSection({ title, children, showDivider = true }) {
  const [open, setOpen] = useState(false);

  return (
    <BlockStack gap="200">
      <InlineStack align="space-between" gap="200">
        <Text variant="headingMd">{title}</Text>
        <Button
          plain
          icon={open ? ChevronUpIcon : ChevronDownIcon}
          onClick={() => setOpen((v) => !v)}
          accessibilityLabel={`Toggle ${title}`}
        />
      </InlineStack>

      <Collapsible open={open}>
        <BlockStack gap="300">{children}</BlockStack>
      </Collapsible>

      {showDivider && <Divider />}
    </BlockStack>
  );
}

/* ---------------- Main Component ---------------- */
function CartTextSettings({ value, onChange }) {
  const update = (section, key, newValue) => {
    onChange((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: newValue,
      },
    }));
  };

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <CollapsibleSection title="Header">
          <BlockStack gap={100}>
            <Text variant="headingSm">Cart header text</Text>
            <TextField
              value={value.header.cartHeaderText}
              onChange={(v) => update("header", "cartHeaderText", v)}
            />
          </BlockStack>
        </CollapsibleSection>

        {/* Footer */}
        <CollapsibleSection title="Footer">
          <BlockStack gap={100}>
            <Text variant="headingSm">Cart button text</Text>
            <TextField
              value={value.footer.cartButtonText}
              onChange={(v) => update("footer", "cartButtonText", v)}
            />
          </BlockStack>

          <BlockStack gap={100}>
            <Text variant="headingSm">Offers button text</Text>
            <TextField
              value={value.footer.offersButtonText}
              onChange={(v) => update("footer", "offersButtonText", v)}
            />
          </BlockStack>
        </CollapsibleSection>

        {/* Side cart */}
        <CollapsibleSection title="Side cart">
          <BlockStack gap={100}>
            <Text variant="headingSm">Discount text</Text>
            <TextField
              value={value.side.discountText}
              onChange={(v) => update("side", "discountText", v)}
            />
          </BlockStack>

          <BlockStack gap={100}>
            <Text variant="headingSm">Total text</Text>
            <TextField
              value={value.side.totalText}
              onChange={(v) => update("side", "totalText", v)}
            />
          </BlockStack>

          <BlockStack gap={100}>
            <Text variant="headingSm">Add note button text</Text>
            <TextField
              value={value.side.addNoteButtonText}
              onChange={(v) => update("side", "addNoteButtonText", v)}
            />
          </BlockStack>

          <BlockStack gap={100}>
            <Text variant="headingSm">Discount code button text</Text>
            <TextField
              value={value.side.discountCodeButtonText}
              onChange={(v) => update("side", "discountCodeButtonText", v)}
            />
          </BlockStack>

          <BlockStack gap={100}>
            <Text variant="headingSm">Checkout button text</Text>
            <TextField
              value={value.side.checkoutButtonText}
              onChange={(v) => update("side", "checkoutButtonText", v)}
            />
          </BlockStack>
        </CollapsibleSection>

        {/* Offers (NO divider after this) */}
        <CollapsibleSection title="Offers" showDivider={false}>
          <BlockStack gap={100}>
            <Text variant="headingSm">Locked badge text</Text>
            <TextField
              value={value.offers.badgeLockedText}
              onChange={(v) => update("offers", "badgeLockedText", v)}
            />
          </BlockStack>

          <BlockStack gap={100}>
            <Text variant="headingSm">Unlocked badge text</Text>
            <TextField
              value={value.offers.badgeUnlockedText}
              onChange={(v) => update("offers", "badgeUnlockedText", v)}
            />
          </BlockStack>

          <BlockStack gap={100}>
            <Text variant="headingSm">Offers header text</Text>
            <TextField
              value={value.offers.offerHeaderText}
              onChange={(v) => update("offers", "offerHeaderText", v)}
            />
          </BlockStack>
        </CollapsibleSection>
      </BlockStack>
    </Card>
  );
}

export default CartTextSettings;
