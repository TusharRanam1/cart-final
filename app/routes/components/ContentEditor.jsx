import { Card, BlockStack, Text } from "@shopify/polaris";
import FormTextField from "./FormTextField";

export default function ContentEditor({ value = {}, onChange, type = "tiered" }) {
  const handleChange = (key, newVal) => {
    onChange({ ...value, [key]: newVal });
  };

  return (
    <Card sectioned>
      <BlockStack gap="400">
        <Text variant="headingSm" fontWeight="bold">
          Content Details
        </Text>

         {type === "bxgy" ? (
          <>
            <FormTextField
          label="Batch Title"
          value={value.batchTitle || ""}
          onChange={(val) => handleChange("batchTitle", val)}
          placeholder="Enter offer subtitle after achievement"
        />

        {/* 🏷️ Offer section */}
        <FormTextField
          label="Offer Title"
          value={value.offerTitle || ""}
          onChange={(val) => handleChange("offerTitle", val)}
          placeholder="Enter offer title"

        />

        <FormTextField
          label="Offer Subtitle"
          value={value.offerSubtitle || ""}
          onChange={(val) => handleChange("offerSubtitle", val)}
          placeholder="Enter offer subtitle"
          multiline={2}
        />

        <FormTextField
          label="Offer Subtitle (After Achievement)"
          value={value.offerSubtitleAfter || ""}
          onChange={(val) => handleChange("offerSubtitleAfter", val)}
          placeholder="Enter offer subtitle after achievement"
          multiline={2}
        />
          </>):(

<>
        {/* 🎁 Gift section */}
        <FormTextField
          label="Gift Title (Before Achievement)"
          value={value.giftTitleBefore || ""}
          onChange={(val) => handleChange("giftTitleBefore", val)}
          placeholder="Enter gift title before achievement"
        />

        <FormTextField
          label="Gift Title (After Achievement)"
          value={value.giftTitleAfter || ""}
          onChange={(val) => handleChange("giftTitleAfter", val)}
          placeholder="Enter gift title after achievement"
          multiline={2}
        />

        {/* 📊 Progress bar text */}
        <FormTextField
          label="Progress Bar Text (Before Achievement)"
          value={value.progressTextBefore || ""}
          onChange={(val) => handleChange("progressTextBefore", val)}
          placeholder="Enter text shown before goal completion"
          multiline={2}
        />

        <FormTextField
          label="Progress Bar Text (After Achievement)"
          value={value.progressTextAfter || ""}
          onChange={(val) => handleChange("progressTextAfter", val)}
          placeholder="Enter text shown after goal completion"
          multiline={2}
        />

          <FormTextField
          label="Batch Title"
          value={value.batchTitle || ""}
          onChange={(val) => handleChange("batchTitle", val)}
          placeholder="Enter offer subtitle after achievement"
        />

        {/* 🏷️ Offer section */}
        <FormTextField
          label="Offer Title"
          value={value.offerTitle || ""}
          onChange={(val) => handleChange("offerTitle", val)}
          placeholder="Enter offer title"

        />

        <FormTextField
          label="Offer Subtitle"
          value={value.offerSubtitle || ""}
          onChange={(val) => handleChange("offerSubtitle", val)}
          placeholder="Enter offer subtitle"
          multiline={2}
        />

        <FormTextField
          label="Offer Subtitle (After Achievement)"
          value={value.offerSubtitleAfter || ""}
          onChange={(val) => handleChange("offerSubtitleAfter", val)}
          placeholder="Enter offer subtitle after achievement"
          multiline={2}
        />

        </>
          )}

        <Text tone="subdued" variant="bodySm">
          These content fields control what text appears in your storefront
          widget before and after customers reach their goals.
        </Text>
      </BlockStack>
    </Card>
  );
}
