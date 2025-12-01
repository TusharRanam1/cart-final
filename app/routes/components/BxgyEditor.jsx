import {
  Card,
  Text,
  Button,
  ButtonGroup,
  TextField,
  Box,
  Icon,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import ProductPickerModal from "./ProductPickerModal";
import CollectionPickerModal from "./CollectionPickerModal";

export default function BxgyEditor({
  goals,
  setGoals,
  pickerOpen,
  setPickerOpen,
  pickerType,
  setPickerType,
  currentGoal,
  setCurrentGoal,
}) {
  // Ensure we always have a base BXGY goal in state
  const bxgyGoal =
    goals[0] || {
      id: `BXGY_${Date.now()}`,
      bxgyMode: "product", // "product" | "collection" | "all"
      buyQty: 1,
      buyProducts: [],
      buyCollections: [],
      getQty: 1,
      getProducts: [],
      discountType: "free_product",
      discountValue: 100,
    };

  // If no goal is present, initialize one
  if (!goals[0]) setGoals([bxgyGoal]);

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------
  return (
    <Card sectioned>
      {/* ---------------- BXGY TYPE ---------------- */}
      <Text variant="headingSm" fontWeight="bold">
        Buy X Get Y Type
      </Text>

      <Box paddingBlockStart="400" paddingBlockEnd="400">
        <ButtonGroup segmented>
          <Button
            pressed={bxgyGoal.bxgyMode === "product"}
            onClick={() =>
              setGoals([{ ...bxgyGoal, bxgyMode: "product" }])
            }
          >
            Product-based
          </Button>
          <Button
            pressed={bxgyGoal.bxgyMode === "collection"}
            onClick={() =>
              setGoals([{ ...bxgyGoal, bxgyMode: "collection" }])
            }
          >
            Collection-based
          </Button>
          <Button
            pressed={bxgyGoal.bxgyMode === "all"}
            onClick={() =>
              setGoals([{ ...bxgyGoal, bxgyMode: "all" }])
            }
          >
            Storewide (All Products)
          </Button>
        </ButtonGroup>
      </Box>

      {/* ---------------- BUY SECTION ---------------- */}
      <Box paddingBlockStart="400">
        <Text variant="headingSm" fontWeight="bold">
          Buy Requirements (X)
        </Text>

        <Box paddingBlockStart="200" paddingBlockEnd="200">
          <TextField
            label="Buy Quantity (X)"
            type="number"
            value={bxgyGoal.buyQty}
            onChange={(val) =>
              setGoals([{ ...bxgyGoal, buyQty: Number(val) }])
            }
          />
        </Box>

        {/* Product mode */}
        {bxgyGoal.bxgyMode === "product" && (
          <>
            <Button
              primary
              onClick={() => {
                setPickerType("buy");
                setPickerOpen(true);
                setCurrentGoal(bxgyGoal.id);
              }}
            >
              Select Buy Products
            </Button>

            {(bxgyGoal.buyProducts || []).length > 0 && (
              <Box paddingBlockStart="400">
                {bxgyGoal.buyProducts.map((p) => (
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
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                        setGoals([
                          {
                            ...bxgyGoal,
                            buyProducts: bxgyGoal.buyProducts.filter(
                              (bp) => bp.id !== p.id
                            ),
                          },
                        ])
                      }
                    />
                  </div>
                ))}
              </Box>
            )}
          </>
        )}

        {/* Collection mode */}
        {bxgyGoal.bxgyMode === "collection" && (
          <>
            <Button
              primary
              onClick={() => {
                setPickerType("collection");
                setPickerOpen(true);
                setCurrentGoal(bxgyGoal.id);
              }}
            >
              Select Buy Collections
            </Button>

            {(bxgyGoal.buyCollections || []).length > 0 && (
              <Box paddingBlockStart="400">
                {bxgyGoal.buyCollections.map((c) => (
                  <div
                    key={c.id}
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
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <img
                        src={c.image?.url || c.image?.src || ""}
                        alt={c.title}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "4px",
                          objectFit: "cover",
                        }}
                      />
                      <Text>{c.title}</Text>
                    </div>
                    <Button
                      plain
                      destructive
                      icon={<Icon source={DeleteIcon} />}
                      onClick={() =>
                        setGoals([
                          {
                            ...bxgyGoal,
                            buyCollections: bxgyGoal.buyCollections.filter(
                              (col) => col.id !== c.id
                            ),
                          },
                        ])
                      }
                    />
                  </div>
                ))}
              </Box>
            )}
          </>
        )}

        {/* Storewide mode */}
        {bxgyGoal.bxgyMode === "all" && (
          <Box padding="200" tone="subdued">
            <Text>Applies to all store products — no selection needed.</Text>
          </Box>
        )}
      </Box>

      {/* ---------------- GET SECTION ---------------- */}
      <Box paddingBlockStart="600">
        <Text variant="headingSm" fontWeight="bold">
          Get Reward (Y)
        </Text>

        <Box paddingBlockStart="200" paddingBlockEnd="200">
          <TextField
            label="Get Quantity (Y)"
            type="number"
            value={bxgyGoal.getQty}
            onChange={(val) =>
              setGoals([{ ...bxgyGoal, getQty: Number(val) }])
            }
          />
        </Box>

        <Button
          primary
          onClick={() => {
            setPickerType("get");
            setPickerOpen(true);
            setCurrentGoal(bxgyGoal.id);
          }}
        >
          Select Reward Products
        </Button>

        {(bxgyGoal.getProducts || []).length > 0 && (
          <Box paddingBlockStart="400">
            {bxgyGoal.getProducts.map((p) => (
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                    setGoals([
                      {
                        ...bxgyGoal,
                        getProducts: bxgyGoal.getProducts.filter(
                          (gp) => gp.id !== p.id
                        ),
                      },
                    ])
                  }
                />
              </div>
            ))}
          </Box>
        )}
      </Box>

      {/* ---------------- DISCOUNT SECTION ---------------- */}
      <Box paddingBlockStart="600">
        <Text variant="headingSm" fontWeight="bold">
          Discount Type
        </Text>

        <Box paddingBlockStart="200" paddingBlockEnd="200">
          <ButtonGroup segmented>
            <Button
              pressed={bxgyGoal.discountType === "free_product"}
              onClick={() =>
                setGoals([{ ...bxgyGoal, discountType: "free_product", discountValue: 100 }])
              }
            >
              Free Product
            </Button>

            <Button
              pressed={bxgyGoal.discountType === "percentage"}
              onClick={() =>
                setGoals([{ ...bxgyGoal, discountType: "percentage", discountValue: 10 }])
              }
            >
              Percentage
            </Button>

            <Button
              pressed={bxgyGoal.discountType === "fixed"}
              onClick={() =>
                setGoals([{ ...bxgyGoal, discountType: "fixed", discountValue: 100 }])
              }
            >
              Fixed Amount
            </Button>
          </ButtonGroup>
        </Box>

        {bxgyGoal.discountType !== "free_product" && (
          <TextField
            label="Discount Value"
            prefix={bxgyGoal.discountType === "fixed" ? "₹" : "%"}
            type="number"
            value={bxgyGoal.discountValue || ""}
            onChange={(val) =>
              setGoals([{ ...bxgyGoal, discountValue: Number(val) }])
            }
          />
        )}

        {bxgyGoal.discountType === "free_product" && (
          <Box
            padding="400"
            background="bg-subdued"
            borderRadius="200"
            marginTop="400"
          >
            <Text tone="subdued">
              🎁 All selected reward products will be completely free for the
              customer.
            </Text>
          </Box>
        )}
      </Box>

      {/* ---------------- MODALS ---------------- */}
      {pickerType === "collection" ? (
        <CollectionPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          initialSelected={bxgyGoal.buyCollections || []}
          onSelect={(selectedCollections) =>
            setGoals([{ ...bxgyGoal, buyCollections: selectedCollections }])
          }
        />
      ) : (
        <ProductPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          initialSelected={
            bxgyGoal[
              pickerType === "buy" ? "buyProducts" : "getProducts"
            ] || []
          }
          onSelect={(selectedVariants) => {
            setGoals([
              {
                ...bxgyGoal,
                [pickerType === "buy" ? "buyProducts" : "getProducts"]:
                  selectedVariants,
              },
            ]);
          }}
        />
      )}
    </Card>
  );
}
