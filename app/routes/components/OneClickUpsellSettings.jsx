import {
  Box,
  Card,
  InlineStack,
  BlockStack,
  Button,
  Text,
  Thumbnail,
  Popover,
  TextField,
} from "@shopify/polaris";
import HelpHeader from "./HelpHeader";
import ProductPickerModal from "./ProductPickerModal";

export default function OneClickUpsellSettings({
  enabled,
  setEnabled,

  ctaType,
  setCtaType,
  oneClickProducts,
  setOneClickProducts,
  oneClickPickerOpen,
  setOneClickPickerOpen,
  variablePopoverOpen,
  setVariablePopoverOpen,
  upsellText,
  setUpsellText,
  showProductImage,
  setShowProductImage,
  showInCartList,
  setShowInCartList,
}) {
  const insertVariable = (variable) => {
    setUpsellText((prev) => `${prev} ${variable}`.trim());
    setVariablePopoverOpen(false);
  };

  return (
    <>
      {/* ENABLE / DISABLE */}
      <Box paddingBlockStart="300">
        <HelpHeader
          title="Enable One-Click Upsell"
          helpText="Turn the one-click upsell on or off."
        />

        <InlineStack gap="100">
          <Box
            background="bg-surface-secondary"
            borderRadius="200"
            padding="100"
            inlineSize="fit-content"
          >
            <Button
              size="slim"
              variant={enabled ? "primary" : "tertiary"}
              onClick={() => {
                if (!enabled) setEnabled(true);
              }}
            >
              Show
            </Button>

            <Button
              size="slim"
              variant={!enabled ? "primary" : "tertiary"}
              onClick={() => {
                if (enabled) setEnabled(false);
              }}
            >
              Hide
            </Button>
          </Box>
        </InlineStack>
      </Box>

      {/* ⛔ HIDE EVERYTHING IF DISABLED */}
      {!enabled && (
        <Box paddingBlockStart="200">
          <Text tone="subdued">
            One-click upsell is disabled. Enable it to configure settings.
          </Text>
        </Box>
      )}

      {/* ✅ SHOW SETTINGS ONLY IF ENABLED */}
      {enabled && (
        <>
          {/* CTA TYPE */}
          <Box paddingBlockStart="300">
            <HelpHeader
              title="Select CTA type"
              helpText="Choose how the upsell action will be displayed in the cart."
            />

            <InlineStack>
              <Box
                background="bg-surface-secondary"
                borderRadius="200"
                padding="100"
                inlineSize="fit-content"
              >
                <InlineStack gap="100">
                  <Button
                    size="slim"
                    variant={ctaType === "button" ? "primary" : "tertiary"}
                    onClick={() => setCtaType("button")}
                  >
                    Button
                  </Button>

                  <Button
                    size="slim"
                    variant={ctaType === "checkbox" ? "primary" : "tertiary"}
                    onClick={() => setCtaType("checkbox")}
                  >
                    Checkbox
                  </Button>
                </InlineStack>
              </Box>
            </InlineStack>
          </Box>

          {/* PRODUCT SELECT */}
          <Box paddingBlockStart="300">
            <HelpHeader
              title="Select upsell product"
              helpText="Only one product can be selected for one-click upsell."
            />

            <Button onClick={() => setOneClickPickerOpen(true)}>
              {oneClickProducts.length > 0
                ? "Edit selected product"
                : "Select product"}
            </Button>
          </Box>

          {oneClickProducts.length > 0 && (
            <Box paddingBlockStart="300">
              <Card padding="200">
                <InlineStack gap="300" blockAlign="center">
                  <Thumbnail
                    source={
                      oneClickProducts[0].image?.url ||
                      "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
                    }
                    alt={oneClickProducts[0].title}
                    size="small"
                  />
                  <Text>{oneClickProducts[0].productTitle}</Text>
                </InlineStack>
              </Card>
            </Box>
          )}

          <ProductPickerModal
            open={oneClickPickerOpen}
            onClose={() => setOneClickPickerOpen(false)}
            initialSelected={oneClickProducts}
            singleSelect
            onSelect={(variants) => {
              setOneClickProducts(variants.slice(0, 1));
              setOneClickPickerOpen(false);
            }}
          />

          {/* UPSELL TEXT */}
          <Box paddingBlockStart="300">
            <InlineStack align="space-between" blockAlign="center">
              <HelpHeader title="Upsell text" />

              <Popover
                active={variablePopoverOpen}
                activator={
                  <Button
                    size="micro"
                    variant="secondary"
                    onClick={() => setVariablePopoverOpen((open) => !open)}
                  >
                    {"{}"}
                  </Button>
                }
                onClose={() => setVariablePopoverOpen(false)}
              >
                <Popover.Section>
                  <BlockStack gap="150" inlineAlignment="start">
                    <Box
                      as="button"
                      onClick={() => insertVariable("{{title}}")}
                      width="100%"
                    >
                      <BlockStack gap="50" inlineAlignment="start">
                        <Text fontWeight="semibold" alignment="start">
                          {"{{title}}"}
                        </Text>
                        <Text tone="subdued" alignment="start">
                          Will be replaced with product title
                        </Text>
                      </BlockStack>
                    </Box>

                    <Box
                      as="button"
                      onClick={() => insertVariable("{{amount}}")}
                      width="100%"
                    >
                      <BlockStack gap="50" inlineAlignment="start">
                        <Text fontWeight="semibold" alignment="start">
                          {"{{amount}}"}
                        </Text>
                        <Text tone="subdued" alignment="start">
                          Will be replaced with product price
                        </Text>
                      </BlockStack>
                    </Box>
                  </BlockStack>
                </Popover.Section>
              </Popover>
            </InlineStack>

            <Box paddingBlockStart="200">
              <TextField
                value={upsellText}
                onChange={setUpsellText}
                autoComplete="off"
              />
            </Box>
          </Box>

          {/* SHOW IMAGE */}
          <Box paddingBlockStart="300">
            <HelpHeader title="Show product image" />

            <InlineStack gap="100">
              <Box
                background="bg-surface-secondary"
                borderRadius="200"
                padding="100"
                inlineSize="fit-content"
              >
                <Button
                  size="slim"
                  variant={showProductImage ? "primary" : "tertiary"}
                  onClick={() => setShowProductImage(true)}
                >
                  Yes
                </Button>

                <Button
                  size="slim"
                  variant={!showProductImage ? "primary" : "tertiary"}
                  onClick={() => setShowProductImage(false)}
                >
                  No
                </Button>
              </Box>
            </InlineStack>
          </Box>

          {/* SHOW IN CART */}
          <Box paddingBlockStart="300">
            <HelpHeader title="Show in cart item list" />

            <InlineStack gap="100">
              <Box
                background="bg-surface-secondary"
                borderRadius="200"
                padding="100"
                inlineSize="fit-content"
              >
                <Button
                  size="slim"
                  variant={showInCartList ? "primary" : "tertiary"}
                  onClick={() => setShowInCartList(true)}
                >
                  Yes
                </Button>

                <Button
                  size="slim"
                  variant={!showInCartList ? "primary" : "tertiary"}
                  onClick={() => setShowInCartList(false)}
                >
                  No
                </Button>
              </Box>
            </InlineStack>
          </Box>
        </>
      )}
    </>
  );
}
