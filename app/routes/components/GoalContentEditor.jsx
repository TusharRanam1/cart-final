import { Card, BlockStack, Text } from "@shopify/polaris";
import FormTextField from "./FormTextField";

export default function GoalContentEditor({ goal, onChange }) {
const safeContent = goal.content || {
    titleBefore: "",
    titleAfter: "",
    subtitleBefore: "",
    subtitleAfter: "",
  };

  const update = (key, val) => {
    onChange({ ...safeContent, [key]: val });
  };
  return (
    <Card sectioned>
      <BlockStack gap="400">
        <Text variant="headingSm" fontWeight="bold">
          Content for Goal ({goal.id})
        </Text>

        <FormTextField
          label="Title (Before Achievement)"
          value={safeContent.titleBefore|| ""}
          onChange={(val) => update("titleBefore", val)}
        />

        <FormTextField
          label="Title (After Achievement)"
          value={safeContent.titleAfter || ""}
          onChange={(val) => update("titleAfter", val)}
          multiline={2}
        />

        <FormTextField
          label="Subtitle (Before Achievement)"
          value={safeContent.subtitleBefore || ""}
          onChange={(val) => update("subtitleBefore", val)}
          multiline={2}
        />

        <FormTextField
          label="Subtitle (After Achievement)"
          value={gsafeContent.subtitleAfter || ""}
          onChange={(val) => update("subtitleAfter", val)}
          multiline={2}
        />

        <Text tone="subdued" variant="bodySm">
          These fields apply only to this specific milestone.
        </Text>
      </BlockStack>
    </Card>
  );
}
