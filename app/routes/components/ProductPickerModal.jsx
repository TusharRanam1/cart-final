import {
  Modal,
  TextContainer,
  IndexTable,
  Text,
  Thumbnail,
  Spinner,
  Autocomplete,
  Icon,
  Box,
  LegacyCard,
  Banner,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { useState, useEffect, Fragment, useCallback, useMemo } from "react";

export default function ProductPickerModal({
  open,
  onClose,
  onSelect,
  initialSelected = [],
  singleSelect = false, // ✅ NEW
}) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);

  // 🧠 Fetch products
  useEffect(() => {
    if (!open) return;
    setSelectedIds(
      singleSelect && initialSelected.length > 0
        ? [initialSelected[0].id]
        : initialSelected.map((p) => p.id),
    );

    setLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const valid = Array.isArray(data.products) ? data.products : [];
        setProducts(valid);
        setFilteredProducts(valid);

        // Prepare options for Autocomplete
        const opts = valid.map((p) => ({
          value: p.id,
          label: p.title,
        }));
        setOptions(opts);
      } catch (err) {
        console.error("❌ Failed to load products:", err);
        setProducts([]);
        setFilteredProducts([]);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, initialSelected]);

  // 🧩 Handle Autocomplete input
  const updateText = useCallback(
    (value) => {
      setInputValue(value);

      if (value === "") {
        setFilteredProducts(products);
        setOptions(products.map((p) => ({ value: p.id, label: p.title })));
        return;
      }

      const filterRegex = new RegExp(value, "i");
      const filtered = products.filter(
        (p) =>
          p.title.match(filterRegex) ||
          p.variants?.some((v) => v.title.match(filterRegex)),
      );
      setFilteredProducts(filtered);

      const filteredOptions = products
        .filter((p) => p.title.match(filterRegex))
        .map((p) => ({ value: p.id, label: p.title }));
      setOptions(filteredOptions);
    },
    [products],
  );

  const updateSelection = useCallback(
    (selected) => {
      const matchedOption = options.find((opt) => opt.value === selected[0]);
      const selectedLabel = matchedOption ? matchedOption.label : "";
      setInputValue(selectedLabel);

      // Filter table by that product
      const match = products.filter((p) => p.id === selected[0]);
      setFilteredProducts(match.length ? match : products);
    },
    [options, products],
  );

  const textField = useMemo(
    () => (
      <Autocomplete.TextField
        onChange={updateText}
        value={inputValue}
        prefix={<Icon source={SearchIcon} tone="base" />}
        placeholder="Search products or variants"
        autoComplete="off"
      />
    ),
    [inputValue, updateText],
  );

  const allVariants = filteredProducts.flatMap((p) =>
    p.variants.map((v) => ({ ...v, productTitle: p.title })),
  );

  const handleSelect = () => {
    const selectedVariants = allVariants.filter((v) =>
      selectedIds.includes(v.id),
    );
    onSelect(selectedVariants);
    onClose();
  };

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select product variants"
      primaryAction={{
        content: "Select",
        onAction: handleSelect,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <TextContainer>
          {/* 🔍 Search (Polaris Autocomplete) */}
          <div style={{ marginBottom: "1rem" }}>
            <Autocomplete
              options={options}
              selected={[]}
              onSelect={updateSelection}
              textField={textField}
            />
          </div>

          {/* ✅ Global selection status */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <Text>
              {singleSelect ? (
                <Banner status="info">
                  <p>You can only select one variant.</p>
                </Banner>
              ) : (
                <Text>
                  {selectedIds.length > 0
                    ? `${selectedIds.length} selected`
                    : "No variants selected"}
                </Text>
              )}
            </Text>

            {selectedIds.length > 0 && (
              <button
                style={{
                  border: "none",
                  background: "transparent",
                  color: "red",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedIds([])}
              >
                Clear all
              </button>
            )}
          </div>

          {/* 🌀 Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <Spinner accessibilityLabel="Loading products" size="large" />
            </div>
          )}

          {/* 🚫 No products */}
          {!loading && filteredProducts.length === 0 && (
            <Text tone="subdued">No products found.</Text>
          )}

          {/* ✅ Product + variant table */}
          {!loading && filteredProducts.length > 0 && (
            <Box paddingBlock="200" paddingInline="100">
              <LegacyCard>
                <IndexTable
                  resourceName={{ singular: "variant", plural: "variants" }}
                  itemCount={allVariants.length}
                  selectedItemsCount={selectedIds.length}
                  headings={[
                    { title: "Image" },
                    { title: "Variant" },
                    { title: "Price" },
                    { title: "Availability" },
                  ]}
                >
                  {filteredProducts.map((product, groupIndex) => {
                    const variants = product.variants || [];

                    const groupSelected = variants.every((v) =>
                      selectedIds.includes(v.id),
                    );
                    const someSelected = variants.some((v) =>
                      selectedIds.includes(v.id),
                    );
                    const selectedState = groupSelected
                      ? true
                      : someSelected
                        ? "indeterminate"
                        : false;

                    return (
                      <Fragment key={product.id}>
                        {/* 🟠 Parent Product Row */}
                        <IndexTable.Row
                          id={`product-${groupIndex}`}
                          position={groupIndex * 100}
                          selected={selectedState}
                          onClick={() => {
                            const ids = variants.map((v) => v.id);
                            if (groupSelected) {
                              if (singleSelect) return;
                              setSelectedIds((prev) =>
                                prev.filter((id) => !ids.includes(id)),
                              );
                            } else {
                              setSelectedIds((prev) => {
                                if (singleSelect) {
                                  return ids.length > 0 ? [ids[0]] : [];
                                }

                                return [...new Set([...prev, ...ids])];
                              });
                            }
                          }}
                        >
                          <IndexTable.Cell colSpan={4}>
                            <Text fontWeight="semibold">{product.title}</Text>
                          </IndexTable.Cell>
                        </IndexTable.Row>

                        {/* 🧩 Child Variant Rows */}
                        {variants.map((variant, idx) => {
                          const isDisabled = !variant.availableForSale;
                          return (
                            <IndexTable.Row
                              rowType="child"
                              id={variant.id}
                              key={variant.id}
                              position={groupIndex * 100 + idx + 1}
                              selected={selectedIds.includes(variant.id)}
                              disabled={isDisabled}
                              onClick={() => {
                                if (isDisabled) return;
                                setSelectedIds((prev) => {
                                  if (singleSelect) {
                                    return prev[0] === variant.id
                                      ? []
                                      : [variant.id];
                                  }

                                  return prev.includes(variant.id)
                                    ? prev.filter((id) => id !== variant.id)
                                    : [...prev, variant.id];
                                });
                              }}
                            >
                              {/* 🖼️ Image */}
                              <IndexTable.Cell>
                                <Thumbnail
                                  source={
                                    variant.image?.url ||
                                    product.featuredImage?.url ||
                                    "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
                                  }
                                  alt={
                                    variant.image?.altText ||
                                    variant.title ||
                                    product.title
                                  }
                                  size="small"
                                />
                              </IndexTable.Cell>

                              {/* 🏷️ Variant Title */}
                              <IndexTable.Cell>
                                <Text>{variant.title}</Text>
                              </IndexTable.Cell>

                              {/* 💰 Price */}
                              <IndexTable.Cell>
                                <Text tone={isDisabled ? "subdued" : "default"}>
                                  ₹{variant.price}
                                </Text>
                              </IndexTable.Cell>

                              {/* ✅ Availability */}
                              <IndexTable.Cell>
                                <Text alignment="end">
                                  {isDisabled ? "❌ Out of stock" : ""}
                                </Text>
                              </IndexTable.Cell>
                            </IndexTable.Row>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </IndexTable>
              </LegacyCard>
            </Box>
          )}
        </TextContainer>
      </Modal.Section>
    </Modal>
  );
}
