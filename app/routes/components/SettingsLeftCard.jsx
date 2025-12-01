// app/components/SettingsHeader.jsx
import { Box, Text } from "@shopify/polaris";

export default function SettingsHeader({
  title = "Settings",
  description = "",
  padding="200",
}) {
  return (
    <Box padding={padding}>
      <Text variant="headingMd" fontWeight="bold">
        {title}
      </Text>
      {description && (
        <Text variant="bodyMd" tone="subdued">
          {description}
        </Text>
      )}
    </Box>
  );
}
