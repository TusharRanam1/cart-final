import React, { useEffect, useState, useMemo } from "react";
import {
  Modal,
  IndexTable,
  Text,
  Thumbnail,
  Spinner,
  LegacyCard,
  useIndexResourceState,
  useBreakpoints,
  TextField,
  Box,
  BlockStack,
} from "@shopify/polaris";

export default function CollectionPickerModal({
  open,
  onClose,
  initialSelected = [],
  onSelect,
}) {
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(initialSelected);
  const [query, setQuery] = useState("");

  const breakpoints = useBreakpoints();

  const resourceName = {
    singular: "collection",
    plural: "collections",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(collections);

  // Fetch collections
  useEffect(() => {
    if (!open) return;

    async function fetchCollections() {
      setLoading(true);
      try {
        const res = await fetch("/api/shopify-collections");
        const data = await res.json();

        if (data.success && Array.isArray(data.collections)) {
          setCollections(data.collections);
        } else {
          setCollections([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch collections:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCollections();
  }, [open]);

  // Sync IndexTable selection with our `selected` state
  useEffect(() => {
    const selectedItems = collections.filter((c) =>
      selectedResources.includes(c.id)
    );
    setSelected(selectedItems);
  }, [selectedResources, collections]);

  // Filter collections by search query
  const filteredCollections = useMemo(() => {
    if (!query.trim()) return collections;
    return collections.filter((c) =>
      c.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [collections, query]);

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  // Table rows
  const rowMarkup = filteredCollections.map(({ id, title, image }, index) => (
    <IndexTable.Row
      id={id}
      key={id}
      position={index}
      selected={selectedResources.includes(id)}
    >
      <IndexTable.Cell>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <Thumbnail
            source={image?.url || image?.src || ""}
            alt={title}
            size="small"
          />
          <Text variant="bodyMd" fontWeight="semibold" truncate>
            {title}
          </Text>
        </div>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Collections"
      primaryAction={{
        content: "Add Selected",
        onAction: handleConfirm,
        disabled: selected.length === 0,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <Spinner accessibilityLabel="Loading collections" size="large" />
        </div>
      ) : (
        <Box paddingInline="500" paddingBlock="400">
          <BlockStack gap="300">
            {/* 🔍 Search bar */}
            <TextField
              label="Search collections"
              labelHidden
              value={query}
              onChange={setQuery}
              placeholder="Search by collection name..."
              clearButton
              onClearButtonClick={() => setQuery("")}
            />

            {/* 🧩 Table */}
            <LegacyCard>
              <IndexTable
                condensed={breakpoints.smDown}
                resourceName={resourceName}
                itemCount={filteredCollections.length}
                selectedItemsCount={
                  allResourcesSelected ? "All" : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                headings={[{ title: "Collection Name" }]}
              >
                {rowMarkup}
              </IndexTable>

              {filteredCollections.length === 0 && (
                <Box padding="400" tone="subdued">
                  <Text tone="subdued" alignment="center">
                    No collections found.
                  </Text>
                </Box>
              )}
            </LegacyCard>
          </BlockStack>
        </Box>
      )}
    </Modal>
  );
}
