import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Collapsible,
  Icon,
  Box,
  Divider,
} from "@shopify/polaris";
import { MaximizeIcon, MinimizeIcon } from "@shopify/polaris-icons";
import { useState } from "react";

export default function DynamicCollapsible({
  title = "Section title",
  description = "",
  icon,
  children,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const sectionId = `${title.replace(/\s+/g, "-").toLowerCase()}-collapse`;

  return (
    <Card>
      {/* Header */}
      <Box padding="100" borderColor="border-subdued" background="bg-surface">
        <BlockStack gap="050">
          <InlineStack align="space-between" blockAlign="center">
            {/* LEFT SIDE — Icon + Title */}
            <InlineStack align="center" gap="200">
              {icon && <Icon source={icon} tone="base" />}
              <Text variant="headingMd" fontWeight="bold">
                {title}
              </Text>
            </InlineStack>

            {/* RIGHT SIDE — Expand/Collapse Button */}
            <Button
              variant="secondary"
              icon={open ? MinimizeIcon : MaximizeIcon}
              onClick={() => setOpen((prev) => !prev)}
              ariaExpanded={open}
              ariaControls={sectionId}
            >
              {open ? "Collapse" : "Expand"}
            </Button>
          </InlineStack>

          {!open && description && (
            <Text tone="subdued" variant="bodyMd">
              {description}
            </Text>
          )}

          {open && <Divider borderColor="border" borderWidth="050" />}
        </BlockStack>
      </Box>

      {/* Collapsible Content */}
      <Collapsible
        open={open}
        id={sectionId}
        transition={{ duration: "400ms", timingFunction: "ease-in-out" }}
        expandOnPrint
      >
        <Box padding="100">
          {children || (
            <Text tone="subdued">
              Add your content here (e.g. campaign goals, details, or settings).
            </Text>
          )}
        </Box>

        {/* Bottom-right collapse action */}
        <Box paddingBlockStart="200">
          <InlineStack align="end">
            <Button
              variant="plain"
              icon={MinimizeIcon}
              onClick={() => setOpen(false)}
            >
              Collapse
            </Button>
          </InlineStack>
        </Box>
      </Collapsible>
    </Card>
  );
}
