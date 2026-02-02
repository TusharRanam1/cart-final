import { Popover, Button, Box, BlockStack, Text } from "@shopify/polaris";

export default function VariablePopover({ open, setOpen, onInsert }) {
  const insert = (variable) => {
    onInsert(variable);
    setOpen(false);
  };

  return (
    <Popover
      active={open}
      activator={
        <Button
          size="micro"
          variant="secondary"
          onClick={() => setOpen((o) => !o)}
        >
          {"{}"}
        </Button>
      }
      onClose={() => setOpen(false)}
    >
      <Popover.Section>
        <BlockStack gap="300" inlineAlign="start">
          <Box
            as="button"
            width="100%"
            onClick={() => insert(" {{goal}}")}
            style={{ textAlign: "left" }}
          >
            <Text alignment="start">{`{{goal}}`}</Text>
            <Text tone="subdued" alignment="start">
              will be replaced with amount required to reach the goal
            </Text>
          </Box>

          <Box
            as="button"
            width="100%"
            onClick={() => insert("{{discount}}")}
            style={{ textAlign: "left" }}
          >
            <Text alignment="start">{`{{discount}}`}</Text>
            <Text tone="subdued" alignment="start">
              Will be replaced with the discount amount
            </Text>
          </Box>

          <Box
            as="button"
            width="100%"
            onClick={() => insert("{{current_status}}")}
            style={{ textAlign: "left" }}
          >
            <Text alignment="start">{`{{current_status}}`}</Text>
            <Text tone="subdued" alignment="start">
              will be replaced with the current cart value
            </Text>
          </Box>
        </BlockStack>
      </Popover.Section>
    </Popover>
  );
}
