import {
  Box,
  InlineGrid,
  BlockStack,
  Card,
  Select,
  Text,
  Button,
  InlineStack,
  DataTable,
  TextField,
  Banner,
} from "@shopify/polaris";
import HelpHeader from "./HelpHeader";
import ProductPickerModal from "./ProductPickerModal";

export default function UpsellProductSettings({
  showUpsell,
  setShowUpsell,
  upsellType,
  setUpsellType,
  displayLayout,
  setDisplayLayout,
  ctaAction,
  setCtaAction,
  relatedProductCount,
  setRelatedProductCount,
  pickerOpen,
  setPickerOpen,
  selectedProducts,
  setSelectedProducts,
  rows,
  page,
  setPage,
  ITEMS_PER_PAGE,

  // ✅ NEW
  upsellTitle,
  setUpsellTitle,
  buttonText,
  setButtonText,
}) {
  return (
    <BlockStack gap="300">
      <Box>
        <HelpHeader
          title="Display Upsell Product"
          helpText="Control whether the upsell product is visible"
        />

        <InlineStack>
          <Box
            background="bg-surface-secondary"
            borderRadius="200"
            padding="100"
            width="fit-content"
          >
            <InlineStack gap="100">
              <Button
                size="slim"
                variant={showUpsell ? "primary" : "tertiary"}
                onClick={() => {
                  if (!showUpsell) setShowUpsell(true);
                }}
              >
                Show
              </Button>

              <Button
                size="slim"
                variant={!showUpsell ? "primary" : "tertiary"}
                onClick={() => {
                  if (showUpsell) setShowUpsell(false);
                }}
              >
                Hide
              </Button>
            </InlineStack>
          </Box>
        </InlineStack>
      </Box>
      {showUpsell && (
        <BlockStack gap="300">
          {/* Upsell Title */}
          <BlockStack gap="200">
            <HelpHeader
              title="Upsell title"
              helpText="Text shown above the upsell products"
            />

            <TextField
              value={upsellTitle}
              onChange={setUpsellTitle}
              placeholder="You might like also"
            />
          </BlockStack>
          {/* Button Text */}
          <BlockStack gap="200">
            <HelpHeader
              title="Button text"
              helpText="Text shown on the upsell action button"
            />

            <TextField
              value={buttonText}
              onChange={setButtonText}
              placeholder="Add"
            />
          </BlockStack>
          <Banner>
            Upsell related products based on items in cart. You will need to
            setup the product relations in{" "}
            <a
              target="_blank"
              className="Polaris-Link"
              href="https://apps.shopify.com/search-and-discovery"
              rel="noopener noreferrer"
              data-polaris-unstyled="true"
            >
              Shopify Search & Discovery
            </a>
            .
          </Banner>

          <Card padding="400">
            <InlineGrid columns={{ xs: 2, md: 2 }} gap="400">
              {/* 1️⃣ Number of related products */}
              <BlockStack gap="200">
                <HelpHeader
                  title="Number of related products"
                  helpText="Set how many related products are shown in the upsell (minimum 2)"
                />

                <TextField
                  type="number"
                  min={1}
                  value={String(relatedProductCount)}
                  onChange={(value) => {
                    const num = Number(value);
                    if (!Number.isNaN(num) && num >= 0) {
                      setRelatedProductCount(num);
                    }
                  }}
                />
              </BlockStack>

              {/* 2️⃣ CTA click behavior */}
              <BlockStack gap="200">
                <HelpHeader
                  title="CTA click behavior"
                  helpText="Choose what happens when a customer clicks the upsell button"
                />

                <Select
                  value={ctaAction}
                  onChange={(value) => setCtaAction(value)}
                  options={[
                    {
                      label: "Add product to cart",
                      value: "add_to_cart",
                    },
                    {
                      label: "Redirect to product page",
                      value: "redirect_to_product",
                    },
                  ]}
                />
              </BlockStack>

              {/* 3️⃣ Upsell layout */}
              <BlockStack gap="200">
                <HelpHeader
                  title="Upsell layout"
                  helpText="Choose how the upsell products are displayed to customers"
                />

                <Select
                  value={displayLayout}
                  onChange={(value) => setDisplayLayout(value)}
                  options={[
                    { label: "Carousel", value: "carousel" },
                    { label: "List", value: "list" },
                    { label: "Card", value: "card" },
                  ]}
                />
              </BlockStack>

              {/* 4️⃣ Upsell type */}
              <BlockStack gap="200">
                <HelpHeader
                  title="Upsell type"
                  helpText="Choose how products are selected for this upsell"
                />

                <Select
                  value={upsellType}
                  onChange={(value) => setUpsellType(value)}
                  options={[
                    { label: "Related", value: "related" },
                    { label: "Complementary", value: "complementary" },
                    { label: "Manual product", value: "manual" },
                  ]}
                />
              </BlockStack>
            </InlineGrid>

            {/* Manual Product Action */}
            {upsellType === "manual" && (
              <Box paddingBlockStart="300">
                <InlineStack gap="200" align="start" blockAlign="center">
                  <Button onClick={() => setPickerOpen(true)}>
                    {selectedProducts.length > 0
                      ? "Edit selected products"
                      : "Select products"}
                  </Button>

                  {selectedProducts.length > 0 && (
                    <Text tone="subdued">
                      {selectedProducts.length} variant(s) selected
                    </Text>
                  )}
                </InlineStack>
              </Box>
            )}

            {/* Selected Products Table */}
            {upsellType === "manual" && selectedProducts.length > 0 && (
              <Box paddingBlockStart="400">
                <Card>
                  <DataTable
                    columnContentTypes={["text", "text"]}
                    headings={["Image", "Product"]}
                    rows={rows}
                    pagination={{
                      hasPrevious: page > 0,
                      hasNext:
                        (page + 1) * ITEMS_PER_PAGE < selectedProducts.length,
                      onPrevious: () => setPage((p) => p - 1),
                      onNext: () => setPage((p) => p + 1),
                    }}
                  />
                </Card>
              </Box>
            )}

            {/* Product Picker Modal */}
            <ProductPickerModal
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              initialSelected={selectedProducts}
              onSelect={(selectedVariants) => {
                setSelectedProducts(selectedVariants);
                setPickerOpen(false);
              }}
            />
          </Card>
        </BlockStack>
      )}
    </BlockStack>
  );
}
