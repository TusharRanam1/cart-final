import {
  Card,
  Text,
  Box,
  Button,
  Popover,
  ActionList,
  Layout,
  InlineStack,
  Tooltip,
  Icon,
  TextField,
  ButtonGroup,
  BlockStack,
} from "@shopify/polaris";
import { PlusIcon, DeleteIcon } from "@shopify/polaris-icons";
import ProductPickerModal from "./ProductPickerModal";

export default function TieredEditor({
  goals,
  setGoals,
  selected,
  setSelected,
  active,
  setActive,
  pickerOpen,
  setPickerOpen,
  currentGoal,
  setCurrentGoal,
  pickerType,
  setPickerType,
}) {
  // ------------------------------------------------------------------
  // Helper: Toggle Popover
  // ------------------------------------------------------------------
  const toggleActive = () => setActive((prev) => !prev);

  // ------------------------------------------------------------------
  // Add new goal handler
  // ------------------------------------------------------------------
  const handleSelect = (type) => {
    // Build random ID
    let prefix = "";
    if (type === "free_product") prefix = "GIFT";
    if (type === "order_discount") prefix = "OFF";
    if (type === "free_shipping") prefix = "SHIP";

    const num = Math.floor(10 + Math.random() * 990); // 10–999
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randLetters = (len) =>
      Array.from({ length: len }, () =>
        letters[Math.floor(Math.random() * letters.length)]
      ).join("");

    const letterCount = num.toString().length === 2 ? 4 : 3;
    const goalId = `${prefix}${num}${randLetters(letterCount)}`;

    // Base goal object
    let newGoal = { id: goalId, type };

    if (type === "free_product") {
      newGoal.giftQty = 1;
      newGoal.products = [];
    }
    if (type === "order_discount") {
      newGoal.discountType = "percentage";
      newGoal.discountValue = 10;
    }

    setGoals((prev) => [...prev, newGoal]);
    setActive(false);
  };

  // ------------------------------------------------------------------
  // Popover Activator
  // ------------------------------------------------------------------
  const activator = (
    <Button
      plain
      icon={<Icon source={PlusIcon} tone="base" />}
      onClick={toggleActive}
    >
      Add a new goal
    </Button>
  );

  // ------------------------------------------------------------------
  // Render UI
  // ------------------------------------------------------------------
  return (
    <Card sectioned>
      {/* ---------------- TRACK TYPE ---------------- */}
      <Box paddingBlockEnd="400">
        <Text variant="headingMd" tone="subdued">
          Choose what to track
        </Text>
        <Box padding="100" borderRadius="200" background="bg-subdued">
          <ButtonGroup segmented>
            <Button
              pressed={selected === "cart"}
              onClick={() => setSelected("cart")}
            >
              Total cart value
            </Button>
            <Button
              pressed={selected === "quantity"}
              onClick={() => setSelected("quantity")}
            >
              Product quantity
            </Button>
          </ButtonGroup>
        </Box>
      </Box>

      {/* ---------------- ADD GOAL BUTTON ---------------- */}
      <Box paddingBlockEnd="400">
        <Popover active={active} activator={activator} onClose={toggleActive}>
          <ActionList
            items={[
              { content: "Free product", onAction: () => handleSelect("free_product") },
              { content: "Order discount", onAction: () => handleSelect("order_discount") },
              { content: "Free shipping", onAction: () => handleSelect("free_shipping") },
            ]}
          />
        </Popover>
      </Box>

      {/* ---------------- GOALS RENDER ---------------- */}
      {goals.map((goal, index) => (
        <div key={goal.id} style={{ marginTop: "1rem" }}>
          <Layout>
            <Layout.Section>
              <InlineStack align="start">
                {/* LEFT: Target field */}
                <Layout.Section secondary>
                  <div style={{ width: "120px" }}>
                    <Text variant="bodyMd" tone="subdued">
                      {index + 1}st goal
                    </Text>
                    <TextField
                      label=""
                      type="number"
                      value={goal.target || ""}
                      prefix={selected === "cart" ? "₹" : "Qty"}
                      onChange={(val) =>
                        setGoals((prev) =>
                          prev.map((g) =>
                            g.id === goal.id ? { ...g, target: Number(val) } : g
                          )
                        )
                      }
                    />
                  </div>
                </Layout.Section>

                {/* RIGHT: Goal Config Card */}
                <Layout.Section>
                  <Card sectioned>
                    {/* Header Row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid #eee",
                        padding: "0.75rem 1rem",
                      }}
                    >
                      <BlockStack gap="100">
                        <Text variant="headingSm" fontWeight="bold">
                          {goal.type === "free_product" && "Free Product"}
                          {goal.type === "order_discount" && "Order Discount"}
                          {goal.type === "free_shipping" && "Free Shipping"}
                        </Text>
                        <Text tone="subdued">ID: {goal.id}</Text>
                      </BlockStack>

                      <ButtonGroup>
                        <Tooltip content="Delete">
                          <Button
                            tone="critical"
                            onClick={() =>
                              setGoals((prev) => prev.filter((g) => g.id !== goal.id))
                            }
                            icon={<Icon source={DeleteIcon} tone="base" />}
                          />
                        </Tooltip>
                      </ButtonGroup>
                    </div>

                    {/* Goal Content */}
                    <div style={{ padding: "1rem" }}>
                      {/* ---------------- FREE PRODUCT ---------------- */}
                      {goal.type === "free_product" && (
                        <>
                          <Text fontWeight="bold">
                            Select products to give as free gifts
                          </Text>
                          <div style={{ marginTop: "0.75rem" }}>
                            <Button
                              primary
                              onClick={() => {
                                setCurrentGoal(goal.id);
                                setPickerType("get");
                                setPickerOpen(true);
                              }}
                            >
                              Add a product
                            </Button>
                          </div>

                          {/* Gift quantity selector */}
                          <div style={{ marginTop: "1rem" }}>
                            <InlineStack gap="200" align="center">
                              <Text>How many gifts can they choose?</Text>
                            </InlineStack>
                            <Box paddingBlockStart="200">
                              <ButtonGroup>
                                <Button
                                  onClick={() =>
                                    setGoals((prev) =>
                                      prev.map((g) =>
                                        g.id === goal.id
                                          ? {
                                              ...g,
                                              giftQty: Math.max(1, g.giftQty - 1),
                                            }
                                          : g
                                      )
                                    )
                                  }
                                >
                                  −
                                </Button>
                                <Button disabled>{goal.giftQty}</Button>
                                <Button
                                  onClick={() =>
                                    setGoals((prev) =>
                                      prev.map((g) =>
                                        g.id === goal.id
                                          ? { ...g, giftQty: g.giftQty + 1 }
                                          : g
                                      )
                                    )
                                  }
                                >
                                  +
                                </Button>
                              </ButtonGroup>
                            </Box>
                          </div>

                          {/* Product list */}
                          {(goal.products || []).length > 0 && (
                            <div style={{ marginTop: "1rem" }}>
                              {goal.products.map((p) => (
                                <div
                                  key={p.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    border: "1px solid #eee",
                                    borderRadius: "6px",
                                    padding: "8px 12px",
                                    marginBottom: "0.5rem",
                                    background: "#fff",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                    }}
                                  >
                                    <img
                                      src={p.image?.url || p.productImage?.url || ""}
                                      alt={p.title}
                                      style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "4px",
                                        objectFit: "cover",
                                      }}
                                    />
                                    <Text>{p.title}</Text>
                                  </div>
                                  <Button
                                    plain
                                    destructive
                                    icon={<Icon source={DeleteIcon} />}
                                    onClick={() =>
                                      setGoals((prev) =>
                                        prev.map((g) =>
                                          g.id === goal.id
                                            ? {
                                                ...g,
                                                products: g.products.filter(
                                                  (v) => v.id !== p.id
                                                ),
                                              }
                                            : g
                                        )
                                      )
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* ---------------- ORDER DISCOUNT ---------------- */}
                      {goal.type === "order_discount" && (
                        <>
                          <Text fontWeight="bold">Order Discount Type</Text>
                          <Box paddingBlockStart="200">
                            <ButtonGroup segmented>
                              <Button
                                pressed={goal.discountType === "percentage"}
                                onClick={() =>
                                  setGoals((prev) =>
                                    prev.map((g) =>
                                      g.id === goal.id
                                        ? { ...g, discountType: "percentage" }
                                        : g
                                    )
                                  )
                                }
                              >
                                Percentage
                              </Button>
                              <Button
                                pressed={goal.discountType === "amount"}
                                onClick={() =>
                                  setGoals((prev) =>
                                    prev.map((g) =>
                                      g.id === goal.id
                                        ? { ...g, discountType: "amount" }
                                        : g
                                    )
                                  )
                                }
                              >
                                Fixed Amount
                              </Button>
                            </ButtonGroup>
                          </Box>

                          <Box paddingBlockStart="200">
                            <TextField
                              prefix={goal.discountType === "amount" ? "₹" : "%"}
                              type="number"
                              value={goal.discountValue || ""}
                              onChange={(val) =>
                                setGoals((prev) =>
                                  prev.map((g) =>
                                    g.id === goal.id
                                      ? { ...g, discountValue: Number(val) }
                                      : g
                                  )
                                )
                              }
                            />
                          </Box>
                        </>
                      )}

                      {/* ---------------- FREE SHIPPING ---------------- */}
                      {goal.type === "free_shipping" && (
                        <Text>🚚 Free shipping will be applied automatically.</Text>
                      )}
                    </div>
                  </Card>
                </Layout.Section>
              </InlineStack>
            </Layout.Section>
          </Layout>
        </div>
      ))}

      {/* ---------------- PRODUCT PICKER MODAL ---------------- */}
      <ProductPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialSelected={goals.find((g) => g.id === currentGoal)?.products || []}
        onSelect={(selectedVariants) => {
          setGoals((prev) =>
            prev.map((g) =>
              g.id === currentGoal ? { ...g, products: selectedVariants } : g
            )
          );
        }}
      />
    </Card>
  );
}
