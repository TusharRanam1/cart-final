import { InlineStack, Text, Button, Icon } from "@shopify/polaris";
import { QuestionCircleIcon } from "@shopify/polaris-icons";
import { useState } from "react";

export default function HelpHeader({ title, helpText }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Title + icon */}
      <InlineStack align="left" gap="200">
        <InlineStack align="center" gap="100">
          <Text variant="headingSm" fontWeight="bold" as="span">
            {title}
          </Text>

          <Button
            variant="plain"
            onClick={() => setOpen((prev) => !prev)}
            removeUnderline
          >
            <Icon source={QuestionCircleIcon} tone="base" />
          </Button>
        </InlineStack>
      </InlineStack>

      {/* Help Text */}
      {open && (
        <Text variant="bodyMd" color="subdued" as="p" marginBottom="300">
          {helpText}
        </Text>
      )}
    </>
  );
}
