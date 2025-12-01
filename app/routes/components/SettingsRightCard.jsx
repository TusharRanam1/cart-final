// app/components/SettingsCard.jsx
import { Card, Box, Text } from "@shopify/polaris";

/**
 * Reusable Settings Card
 * 
 * Props:
 * - title: string → Heading text for the card
 * - children: ReactNode → Content inside the card
 * - padding: string → Optional Polaris spacing token (default: "400")
 */
export default function SettingsCard({ title,description, children, padding = "100" }) {
  return (
    <Card>
      <Box padding={padding}>
        {title && (
          <Text variant="headingSm" fontWeight="semibold">
            {title}
          </Text>
        )}
         {description && (
        <Text variant="bodyMd" tone="subdued">
          {description}
        </Text>
      )}

        {/* Space before inner content */}
        <Box paddingBlockStart="300">{children}</Box>
      </Box>
    </Card>
  );
}
