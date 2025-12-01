import { useState } from "react";
import {
  Box,
  Button,
  Popover,
  ActionList,
  Tooltip,
  Text,
} from "@shopify/polaris";

export default function InsertLiquidPopover({ onSelect }) {
  const [active, setActive] = useState(false);

  const toggleActive = () => setActive((prev) => !prev);

  const handleSelect = (value) => {
    onSelect?.(value); // ✅ send value back to parent
    setActive(false);
  };

  const liquidTags = [
    { content: "{{amount}}", description: "Example: 1,999.99" },
    { content: "{{amount_no_decimals}}", description: "Example: 2,000" },
    {
      content: "{{amount_with_comma_separator}}",
      description: "Example: 1.999,99",
    },
    {
      content: "{{amount_no_decimals_with_comma_separator}}",
      description: "Example: 2.000",
    },
  ];

  const activator = (
    <Tooltip content="Insert liquid tags" preferredPosition="above">
      <Box
        background="bg-surface"
        border="1"
        borderColor="border"
        borderRadius="300"
        padding="100"
      >
        <Button onClick={toggleActive}>
          <Text>{"{}"}</Text>
        </Button>
      </Box>
    </Tooltip>
  );

  return (
    <Popover
      active={active}
      activator={activator}
      onClose={() => setActive(false)}
      autofocusTarget="first-node"
      preferredAlignment="left"
    >
      <ActionList
        actionRole="menuitem"
        items={liquidTags.map((tag) => ({
          content: tag.content,
          helpText: tag.description,
          onAction: () => handleSelect(tag.content),
        }))}
      />
    </Popover>
  );
}
