import { TextField } from "@shopify/polaris";

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
}) {
  return (
    <TextField
      label={label}
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
  );
}
