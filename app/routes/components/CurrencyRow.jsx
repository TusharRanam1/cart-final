import { useState, useEffect } from "react";
import {
  Page,
  LegacyCard,
  DataTable,
  Button,
  Badge,
  Popover,
  Box,
  Text,
  Card,
  ChoiceList,
} from "@shopify/polaris";
import { EditIcon, DeleteIcon, MenuIcon } from "@shopify/polaris-icons";
import InsertLiquidPopover from "./InsertLiquidPopover";


export default function CurrencyTable({
  currencies,
  onSave,
  onDelete,
  onSetDefault,
  defaultCurrency,
    showDecimals,
  setShowDecimals,
}) {
  const [editingCode, setEditingCode] = useState(null);
  const [popoverActive, setPopoverActive] = useState(null);

const [formats, setFormats] = useState(
  Object.fromEntries(currencies.map((c) => [c.code, c.format]))
);

// ✅ keep formats in sync whenever currencies change
useEffect(() => {
  setFormats(Object.fromEntries(currencies.map((c) => [c.code, c.format])));
}, [currencies]);
  
  const handleSave = (code) => {
    setEditingCode(null);
    onSave?.(code, formats[code]);
  };

  const handleCancel = (code) => {
    setEditingCode(null);
    setFormats((prev) => ({ ...prev, [code]: currencies.find((c) => c.code === code)?.format }));
  };

const handleFormatChange = (code, value) => {
  setFormats((prev) => ({
    ...prev,
    [code]: typeof value === "function" ? value(prev[code]) : value,
  }));
};


const handleLockedInputChange = (code, e) => {
  const inputEl = e.target;
  const newValue = inputEl.value;
  const cursorPos = inputEl.selectionStart;
  const regex = /\{\{.*?\}\}/;
  const current = formats[code] ?? "";
  const match = current.match(regex);

  if (!match) {
    handleFormatChange(code, newValue);
    return;
  }

  const liquidPart = match[0];
  const tagStart = current.indexOf(liquidPart);
  const tagEnd = tagStart + liquidPart.length;

  // 🚫 Prevent editing inside the {{...}} block
  if (cursorPos > tagStart && cursorPos < tagEnd) {
    e.preventDefault?.();
    inputEl.value = current;
    // keep cursor outside the tag
    inputEl.setSelectionRange(tagEnd, tagEnd);
    return;
  }

  // ✅ Ensure {{...}} still exists
  if (!newValue.includes(liquidPart)) return;

  // Extract prefix/suffix around tag
  const [beforeTag, afterTag] = current.split(liquidPart);
  const [newPrefix, newSuffix] = newValue.split(liquidPart);

  const updated = `${newPrefix ?? ""}${liquidPart}${newSuffix ?? ""}`;

  // Save cursor offset relative to start or end
  const typingBeforeTag = cursorPos <= tagStart;
  const offsetFromStart = cursorPos;
  const offsetFromEnd = current.length - cursorPos;

  handleFormatChange(code, updated);

  // 🪄 Delay cursor restore until after React re-render
  requestAnimationFrame(() => {
    const input = document.activeElement;
    if (input && input.setSelectionRange) {
      if (typingBeforeTag) {
        input.setSelectionRange(offsetFromStart, offsetFromStart);
      } else {
        const newCursorPos = updated.length - offsetFromEnd;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
    }
  });
};




  const handlePopoverToggle = (code) =>
    setPopoverActive((prev) => (prev === code ? null : code));

  const handleMakeDefault = (code) => {
    onSetDefault?.(code);
    setPopoverActive(null);
  };

  const rows = currencies.map(({ code }) => {
    const isDefault = defaultCurrency === code;
    const isEditing = editingCode === code;
    const currentFormat = formats[code];

    return [
      // Currency column
      <Text variant="bodyMd" fontWeight="semibold" key={code}>
        {code}
      </Text>,

      // Format column (editable)
      isEditing ? (
      <input
  type="text"
  value={currentFormat}
  onChange={(e) => handleLockedInputChange(code, e)}
  style={{
    width: "100%",
    border: "1px solid var(--p-color-border)",
    borderRadius: "6px",
    padding: "4px 8px",
  }}
/>


      ) : (
        currentFormat
      ),

      // Default Badge / Menu
      isDefault ? (
        <Badge tone="success">Default</Badge>
      ) : (
        <Popover
          active={popoverActive === code}
          activator={
            <Button
              icon={MenuIcon}
              onClick={() => handlePopoverToggle(code)}
              accessibilityLabel="Menu"
            />
          }
          onClose={() => setPopoverActive(null)}
          sectioned
          preferredAlignment="left"
        >
          <Box>
            <Text variant="headingSm" fontWeight="bold">
              Default currency
            </Text>
            <Text tone="subdued">
              This will be the fallback currency if no other match is found.
            </Text>
            <Box paddingBlockStart="200">
              <Button fullWidth onClick={() => handleMakeDefault(code)}>
                Make {code} default currency
              </Button>
            </Box>
          </Box>

          <Box paddingBlockStart="400">
            <Text variant="headingSm" fontWeight="bold">
              Show decimals in whole numbers
            </Text>
            <Text tone="subdued">
              Choose whether to show decimal places for whole numbers.
            </Text>
            <ChoiceList
              title=""
              choices={[
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ]}
              selected={showDecimals}
              onChange={(value) => setShowDecimals(value[0])}
              allowMultiple={false}
            />
          </Box>
        </Popover>
      ),

      // Actions (Edit / Delete)
      isEditing ? (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <InsertLiquidPopover
  onSelect={(tag) => {
    handleFormatChange(code, (prev) => {
      const regex = /\{\{.*?\}\}/;
      const newFormat = regex.test(prev)
        ? prev.replace(regex, tag)
        : `${prev} ${tag}`;

      // 🔥 Notify parent CurrencyManager to mark unsaved
      onSave?.(code, newFormat, true);
      return newFormat;
    });
  }}
/>


          <Button onClick={() => handleCancel(code)}>Cancel</Button>
          <Button variant="primary" onClick={() => handleSave(code)}>
            Save
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Button
            icon={EditIcon}
            onClick={() => setEditingCode(code)}
            accessibilityLabel="Edit"
          >
            Edit
          </Button>
          <Button
            icon={DeleteIcon}
            tone="critical"
            variant="plain"
            onClick={() => onDelete(code)}
            disabled={isDefault}
          />
        </div>
      ),
    ];
  });

  return (
    
      <Card>
        <DataTable
          columnContentTypes={["text", "text", "text", "text"]}
          headings={["Currency", "Format", "Default", "Actions"]}
          rows={rows}
          footerContent={`Showing ${rows.length} of ${rows.length} currencies`}
        />
      </Card>
 
  );
}
