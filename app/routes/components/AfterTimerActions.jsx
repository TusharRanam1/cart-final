import { Box, ChoiceList, BlockStack } from "@shopify/polaris";
import HelpHeader from "./HelpHeader";

export default function AfterTimerActions({ value, onChange ,  title, helpText }) {
  return (
    <Box paddingBlockStart="300">
      <BlockStack>
        <HelpHeader title={title} helpText={helpText} />
        <ChoiceList

          choices={[
            {
              label: (
                <div>
                  <strong>Refresh timer</strong>
                  <div style={{ fontSize: "13px", color: "#616161" }}>
                    Timer restarts again after expiry.
                  </div>
                </div>
              ),
              value: "refresh",
            },
            {
              label: (
                <div>
                  <strong>Clear cart</strong>
                  <div style={{ fontSize: "13px", color: "#616161" }}>
                    Customer’s cart items are automatically removed.
                  </div>
                </div>
              ),
              value: "clear_cart",
            },
          ]}
          selected={[value]}
          onChange={(v) => onChange(v[0])}
        />
      </BlockStack>
    </Box>
  );
}
