import { useRef } from "react";
import { Icon, Box } from "@shopify/polaris";
import { ColorIcon } from "@shopify/polaris-icons";

export default function ColorPickerIcon({ value, onChange }) {
  const inputRef = useRef(null);

  return (
    <>
      {/* Visible icon button */}
      <Box
        onClick={() => inputRef.current?.click()}
        padding="200"
        borderRadius="500"
        borderWidth="1"
        borderColor="border"
        background="bg-surface"
        style={{
          width: "42px",
          height: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Icon source={ColorIcon} tone="base" />
      </Box>

      {/* Hidden color input */}
      <input
        type="color"
        ref={inputRef}
        value={value}
        onChange={onChange}
        style={{ display: "none" }}
      />
    </>
  );
}
