// components/TimerMessageField.jsx
import { Box, TextField, BlockStack } from "@shopify/polaris";
import HelpHeader from "./HelpHeader";

export default function TimerMessageField({
  title = "Message",
  helpText = "",
  value,
  onChange,
}) {
  return (
    <Box paddingBlockStart="100">
      <BlockStack gap="100">
        <HelpHeader title={title} helpText={helpText} />
        <TextField
          value={value}
          onChange={onChange}
          autoComplete="off"
          multiline={2}
        />
      </BlockStack>
    </Box>
  );
}
