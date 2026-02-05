import {
  Banner,
  Card,
  Box,
  Text,
  Select,
  TextField,
  BlockStack,
} from "@shopify/polaris";
import PreviewCard from "../PreviewCard";

export default function CampaignGoal({
  status,
  setStatus,
  statusOptions,
  name,
  setName,
  nameError,
  isBxgy,
  goals,
  defaultCurrency,
  selected,
  content,
}) {
  return (
    <BlockStack gap="400">
      {/* Status + Name card */}
      {status !== "active" ? (
        <Banner title="This campaign is paused" tone="warning">
          <div style={{ padding: "1rem" }}>
            <Select
              label="Status"
              options={statusOptions}
              onChange={setStatus}
              value={status}
            />

            <div style={{ marginTop: "1rem" }}>
              <TextField
                label="Campaign name"
                value={name}
                onChange={setName}
                error={nameError}
              />
            </div>
          </div>
        </Banner>
      ) : (
        <Card>
          <div style={{ padding: "1rem" }}>
            <Select
              label="Status"
              options={statusOptions}
              onChange={setStatus}
              value={status}
            />

            <div style={{ marginTop: "1rem" }}>
              <TextField
                label="Campaign name"
                value={name}
                onChange={setName}
                error={nameError}
              />
            </div>
          </div>
        </Card>
      )}

      {/* BXGY Summary */}
      {isBxgy && (
        <Card>
          <Box padding="400" borderBottomWidth="1" borderColor="border-subdued">
            <Text variant="headingSm" as="h3" fontWeight="bold">
              Buy X Get Y Summary
            </Text>
          </Box>

          <Box padding="400">
            {(() => {
              const g = goals[0] || {};
              return (
                <Text>
                  Buy <strong>{g.buyQty || 1}</strong> item(s) → Get{" "}
                  <strong>{g.getQty || 1}</strong> item(s)
                  <br />
                  Discount:{" "}
                  <strong>
                    {g.discountValue || 100}
                    {g.discountType === "fixed"
                      ? ` ${defaultCurrency} off`
                      : "% off"}
                  </strong>
                </Text>
              );
            })()}
          </Box>
        </Card>
      )}

      {/* Tiered Preview */}
      {!isBxgy && (
        <PreviewCard
          goals={goals}
          selected={selected}
          defaultCurrency={defaultCurrency}
          content={content}
        />
      )}
    </BlockStack>
  );
}
