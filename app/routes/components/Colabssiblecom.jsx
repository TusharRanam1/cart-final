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
      <Box
        padding="100"
        
        borderColor="border-subdued"
        background="bg-surface"
        borderTopStartRadius="300"
        borderTopEndRadius="300"
      >
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

<div
            style={{
              maxHeight: open ? "0px" : "100px",
              opacity: open ? 0 : 1,
              overflow: "hidden",
              transition: "all 400ms ease-in-out",
            }}
          >
           {!open && description && (
            <Text tone="subdued" variant="bodyMd">
              {description}
            </Text>
          )}
          </div>

           {open && (
              <Divider borderColor="border" />
           )}
        </BlockStack>
      </Box>

      {/* Collapsible Content */}
      <Collapsible
        open={open}
        id={sectionId}
        transition={{ duration: "400ms", timingFunction: "ease-in-out" }}
        expandOnPrint
      >
        <Box padding="400">
          {children || (
            <Text tone="subdued">
              Add your content here (e.g. campaign goals, details, or settings).
            </Text>
          )}
        </Box>
      </Collapsible>

  
    </Card>
  );
}
