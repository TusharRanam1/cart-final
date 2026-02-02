import { TextField, InlineStack, BlockStack } from "@shopify/polaris";
import VariablePopover from "./VariablePopover";
import { useState } from "react";
import HelpHeader from "./HelpHeader";
/**
 * Reusable Polaris TextField wrapper.
 *
 * Props:
 * - label: string
 * - value: string
 * - onChange: (value) => void
 * - placeholder?: string
 * - multiline?: boolean | number
 * - type?: string
 * - prefix?: string
 * - suffix?: string
 * - helpText?: string
 * - required?: boolean
 * - autoComplete?: string
 */
export default function FormTextField({
  label,
  value,
  onChange,
  placeholder = "",
  multiline = false,
  type = "text",
  prefix,
  suffix,
  helpText,
  required = false,
  autoComplete = "off",
  enableVariables = true,
}) {
  const [variableOpen, setVariableOpen] = useState(false);

  const insertVariable = (variable) => {
    onChange(`${value || ""} ${variable}`.trim());
  };

  return (
    <BlockStack gap="100">
      <InlineStack align="space-between" blockAlign="center">
        <HelpHeader title={label} />
        {enableVariables && (
          <VariablePopover
            open={variableOpen}
            setOpen={setVariableOpen}
            onInsert={insertVariable}
          />
        )}
      </InlineStack>

      <TextField
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        multiline={multiline}
        type={type}
        prefix={prefix}
        suffix={suffix}
        helpText={helpText}
        requiredIndicator={required}
        autoComplete={autoComplete}
      />
    </BlockStack>
  );
}
