import {
  Card,
  Text,
  Button,
  ButtonGroup,
  Tooltip,
  InlineStack,
  TextField,
  Box,
  BlockStack,
  Collapsible,
  Thumbnail,
  DataTable,
  Divider,
} from "@shopify/polaris";
import { Icon } from "@shopify/polaris";
import {
  DeleteIcon,
  PlusIcon,
  EditIcon,
  CheckIcon,
  MinusIcon,
} from "@shopify/polaris-icons";
import { useState, useCallback } from "react";

export default function TieredGoalCard({
  goal,
  setGoals,
  tieredErrors,
  setCurrentGoal,
  setPickerType,
  setPickerOpen,
  defaultCurrency,
}) {
  const [open, setOpen] = useState(true);

  const handleToggle = useCallback(() => setOpen((open) => !open), []);

  return (
    <Card>
      {/* Header Row */}
      <InlineStack align="space-between" blockAlign="center">
        {/* goal type and id  */}
        <BlockStack gap="50">
          <Text>
            <strong>
              {goal.type === "free_product" && "Free product"}
              {goal.type === "order_discount" && "Order discount"}
              {goal.type === "free_shipping" && "Free shipping"}
            </strong>
          </Text>

          <Text tone="subdued">ID: {goal.id}</Text>
        </BlockStack>

        <InlineStack gap="200" align="center">
          <Tooltip content="Delete">
            <Button
              tone="critical"
              onClick={() =>
                setGoals((prev) => prev.filter((g) => g.id !== goal.id))
              }
              icon={<Icon source={DeleteIcon} tone="base" />}
            />
          </Tooltip>
          <Button
            onClick={handleToggle}
            ariaExpanded={open}
            ariaControls="basic-collapsible"
            icon={<Icon source={open ? EditIcon : CheckIcon} tone="base" />}
          >
            {open ? "Done" : "Edit"}
          </Button>
        </InlineStack>
      </InlineStack>

      <Collapsible
        open={open}
        id="basic-collapsible"
        transition={{ duration: "500ms", timingFunction: "ease-in-out" }}
        expandOnPrint
      >
        {open && (
          <Box paddingBlock="300">
            <Divider borderColor="border" borderWidth="050" />
          </Box>
        )}

        {/* Content Section */}

        {/* FREE PRODUCT */}
        {goal.type === "free_product" && (
          <BlockStack gap="300">
            <BlockStack gap={200}>
              <Text fontWeight="bold">
                Select products to give as free gifts
              </Text>

              {/* Add product button */}
              {!goal.products?.length > 0 ? (
                <Box maxWidth="240px" width="100%">
                  <Button
                    variant="primary"
                    size="slim"
                    onClick={() => {
                      setCurrentGoal(goal.id);
                      setPickerType("get");
                      setPickerOpen(true);
                    }}
                  >
                    Add a product
                  </Button>
                </Box>
              ) : (
                ""
              )}
              {tieredErrors[goal.id]?.products && (
                <Text tone="critical" variant="bodySm">
                  {tieredErrors[goal.id].products}
                </Text>
              )}
            </BlockStack>

            {/* PRODUCT LIST */}
            {goal.products?.length > 0 && (
              <BlockStack gap="200">
                {/* product card list */}
                <Card padding="0">
                  <DataTable
                    key={goal.id}
                    columnContentTypes={["text", "text"]} // ✅ must match columns
                    headings={[
                      goal.products.length === 1 ? (
                        <Text fontWeight="semibold">Product</Text>
                      ) : (
                        <Text fontWeight="semibold">Products</Text>
                      ),
                      "",
                    ]}
                    rows={goal.products.map((v) => [
                      // Product column
                      <InlineStack gap="200" blockAlign="center" wrap={false}>
                        <Thumbnail
                          source={v.image?.url || v.productImage?.url || ""}
                          alt={v.title}
                          size="small"
                        />

                        <Box minWidth="0">
                          <Text as="span">{v.productTitle || v.title}</Text>
                        </Box>
                      </InlineStack>,

                      // Action column
                      <Button
                        plain
                        destructive
                        icon={DeleteIcon}
                        onClick={() =>
                          setGoals((prev) =>
                            prev.map((g) =>
                              g.id === goal.id
                                ? {
                                    ...g,
                                    products: g.products.filter(
                                      (prod) => prod.id !== v.id,
                                    ),
                                  }
                                : g,
                            ),
                          )
                        }
                      />,
                    ])}
                    footerContent={
                      <Button
                        variant="tertiary"
                        size="slim"
                        fullWidth
                        icon={<Icon source={PlusIcon} />}
                        onClick={() => {
                          setCurrentGoal(goal.id);
                          setPickerType("get");
                          setPickerOpen(true);
                        }}
                      >
                        Add more to the list
                      </Button>
                    }
                  />
                </Card>

                {/* How many gifts can they choose */}
                <BlockStack gap={100}>
                  <InlineStack align="start">
                    <Tooltip content="Number of gifts a customer can pick">
                      <Text fontWeight="semibold">
                        How many gifts can they choose?
                      </Text>
                    </Tooltip>
                  </InlineStack>

                  <ButtonGroup>
                    <Button
                      size="micro"
                      onClick={() =>
                        setGoals((prev) =>
                          prev.map((g) =>
                            g.id === goal.id
                              ? {
                                  ...g,
                                  giftQty: Math.max(1, g.giftQty - 1),
                                }
                              : g,
                          ),
                        )
                      }
                      icon={MinusIcon}
                    />

                    <Button size="micro">{goal.giftQty}</Button>

                    <Button
                      size="micro"
                      onClick={() =>
                        setGoals((prev) =>
                          prev.map((g) =>
                            g.id === goal.id
                              ? { ...g, giftQty: g.giftQty + 1 }
                              : g,
                          ),
                        )
                      }
                      icon={PlusIcon}
                    />
                  </ButtonGroup>

                  {tieredErrors[goal.id]?.giftQty && (
                    <Box paddingBlockStart="200">
                      <Text tone="critical" variant="bodySm">
                        {tieredErrors[goal.id].giftQty}
                      </Text>
                    </Box>
                  )}
                </BlockStack>
              </BlockStack>
            )}
          </BlockStack>
        )}

        {/* ORDER DISCOUNT */}
        {goal.type === "order_discount" && (
          <BlockStack gap="150">
            {/* order disocunt type */}
            <Box>
              <Text>
                <strong>Type of order discount</strong>
              </Text>
              <InlineStack gap="100" paddingBlockStart="200">
                <Box
                  background="bg-surface-secondary"
                  borderRadius="200"
                  padding="100"
                  width="fit-content"
                >
                  <InlineStack gap="100">
                    <Button
                      size="slim"
                      variant={
                        goal.discountType === "percentage"
                          ? "primary"
                          : "tertiary"
                      }
                      onClick={() =>
                        setGoals((prev) =>
                          prev.map((g) =>
                            g.id === goal.id
                              ? { ...g, discountType: "percentage" }
                              : g,
                          ),
                        )
                      }
                    >
                      Percentage off
                    </Button>

                    <Button
                      size="slim"
                      variant={
                        goal.discountType === "amount" ? "primary" : "tertiary"
                      }
                      onClick={() =>
                        setGoals((prev) =>
                          prev.map((g) =>
                            g.id === goal.id
                              ? { ...g, discountType: "amount" }
                              : g,
                          ),
                        )
                      }
                    >
                      Amount off
                    </Button>
                  </InlineStack>
                </Box>
              </InlineStack>
            </Box>

            {/* Take amount or percentage */}
            <Box width="50%">
              <Text>
                <strong>Enter the value</strong>
              </Text>

              <TextField
                prefix={goal.discountType === "amount" ? defaultCurrency : "%"}
                type="number"
                value={goal.discountValue || ""}
                onChange={(val) =>
                  setGoals((prev) =>
                    prev.map((g) =>
                      g.id === goal.id ? { ...g, discountValue: val } : g,
                    ),
                  )
                }
              />
            </Box>
            {tieredErrors[goal.id]?.discountValue && (
              <Box padding="200">
                <Text tone="critical" variant="bodySm">
                  {tieredErrors[goal.id].discountValue}
                </Text>
              </Box>
            )}
          </BlockStack>
        )}

        {/* FREE SHIPPING */}
        {goal.type === "free_shipping" && (
          <Text>🚚 Free shipping will be applied automatically.</Text>
        )}
      </Collapsible>
    </Card>
  );
}
