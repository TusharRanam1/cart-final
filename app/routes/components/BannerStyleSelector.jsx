import {
  Box,
  Text,
  TextField,
  InlineStack,
  Icon,
  BlockStack,
  Divider,
} from "@shopify/polaris";
import { ColorIcon } from "@shopify/polaris-icons";
import { useState,useEffect } from "react";
import HelpHeader from "./HelpHeader";

export default function BannerStyleSelector({ onChange , value}) {
const [bannerType, setBannerType] = useState(value?.bannerType || "solid");
 const [solidColor, setSolidColor] = useState(value?.solidColor || "#ff0000");
const [gradientStart, setGradientStart] = useState(value?.gradientStart || "#ff0000");
const [gradientEnd, setGradientEnd] = useState(value?.gradientEnd || "#0000ff");
const [imageUrl, setImageUrl] = useState(value?.imageUrl || "");

  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => {
  if (!value) return;
  setBannerType(value.bannerType || "solid");
  setSolidColor(value.solidColor || "#ff0000");
  setGradientStart(value.gradientStart || "#ff0000");
  setGradientEnd(value.gradientEnd || "#0000ff");
  setImageUrl(value.imageUrl || "");
}, [value]);


  const emitChange = (updated = {}) => {
  onChange?.({
    bannerType,
    solidColor,
    gradientStart,
    gradientEnd,
    imageUrl,
    uploadedFile,
    ...updated, // override with incoming values
  });
};



  return (
    <Box paddingTop="200" paddingBottom="300">

      {/* ---- YOUR HELP HEADER COMPONENT ---- */}
      <HelpHeader
        title="Cart banner"
        helpText="Choose between solid/gradient colors or custom images for the banner"
      />

      {/* --------- TABS --------- */}
      <InlineStack align="center" gap="600" wrap={false}>

        {["solid", "gradient", "image"].map((type) => (
          <Box
            key={type}
           onClick={() => {
  setBannerType(type);
  emitChange({ bannerType: type });
}}

            style={{ cursor: "pointer", textAlign: "center" }}
          >
            <Text
              variant="bodyLg"
              fontWeight={bannerType === type ? "bold" : "regular"}
              color={bannerType === type ? "text" : "subdued"}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>

            {bannerType === type && (
              <Box
                style={{
                  height: "2px",
                  width: "100%",
                  marginTop: "4px",
                  backgroundColor: "#000",
                }}
              />
            )}
          </Box>
        ))}

      </InlineStack>

      {/* -------- SOLID PICKER -------- */}
      {bannerType === "solid" && (
        <Box paddingY="400">
            <div style={{ marginTop: "10px" }}> <Divider /></div>
             
          <Text variant="headingSm" fontWeight="semibold">
            Choose Solid Color
          </Text>

          <Box
            onClick={() =>
              document.getElementById("solidColorPickerInput")?.click()
            }
            padding="200"
            borderWidth="2"
            borderColor="border"
            borderRadius="300"
            background="bg-surface-secondary"
            marginTop="300"
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "48px",
              gap: "12px",
            }}
          >
            <Box
              style={{
                width: "34px",
                height: "34px",
                background: solidColor,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon source={ColorIcon} tone="inverse" />
            </Box>

            <Text variant="bodyMd" tone="subdued">Solid color</Text>

            <input
              type="color"
              id="solidColorPickerInput"
              value={solidColor}
            onChange={(e) => {
  const v = e.target.value;
  setSolidColor(v);
  emitChange({ solidColor: v, bannerType: "solid" });
}}

              style={{ display: "none" }}
            />
          </Box>
        </Box>
      )}

      {/* -------- GRADIENT PICKER -------- */}
      {bannerType === "gradient" && (
        <Box paddingY="400">
            <div style={{ marginTop: "10px" }}> <Divider /></div>
             
          <Text variant="headingSm" fontWeight="semibold">
            Choose Gradient Colors
          </Text>

          <InlineStack gap="0" marginTop="300" align="center">
            
            {/* Start */}
            <Box
              onClick={() =>
                document.getElementById("gradientStartColorInput")?.click()
              }
              padding="200"
              borderWidth="2"
              borderColor="border"
              borderRadius="300 0 0 300"
              background="bg-surface-secondary"
              style={{
                cursor: "pointer",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "48px",
                gap: "12px",
              }}
            >
              <Box
                style={{
                  width: "34px",
                  height: "34px",
                  background: gradientStart,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon source={ColorIcon} tone="inverse" />
              </Box>

              <Text variant="bodyMd" tone="subdued">Start color</Text>

              <input
                type="color"
                id="gradientStartColorInput"
                value={gradientStart}
               onChange={(e) => {
  const v = e.target.value;
  setGradientStart(v);
  emitChange({ gradientStart: v, bannerType: "gradient" });
}}

                style={{ display: "none" }}
              />
            </Box>

            {/* Divider */}
            <Box
              style={{
                width: "1px",
                height: "48px",
                background: "#d9d9d9",
              }}
            />

            {/* End */}
            <Box
              onClick={() =>
                document.getElementById("gradientEndColorInput")?.click()
              }
              padding="200"
              borderWidth="2"
              borderColor="border"
              borderRadius="0 300 300 0"
              background="bg-surface-secondary"
              style={{
                cursor: "pointer",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "48px",
                gap: "12px",
              }}
            >
              <Box
                style={{
                  width: "34px",
                  height: "34px",
                  background: gradientEnd,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon source={ColorIcon} tone="inverse" />
              </Box>

              <Text variant="bodyMd" tone="subdued">End color</Text>

              <input
                type="color"
                id="gradientEndColorInput"
                value={gradientEnd}
               onChange={(e) => {
  const v = e.target.value;
  setGradientEnd(v);
  emitChange({ gradientEnd: v, bannerType: "gradient" });
}}

                style={{ display: "none" }}
              />
            </Box>

          </InlineStack>
        </Box>
      )}

      {/* -------- IMAGE PICKER -------- */}
      {bannerType === "image" && (
        <Box paddingY="400">

            <div style={{ marginTop: "10px" }}> <Divider /></div>
             
          <Text variant="headingSm" fontWeight="semibold">
            Upload Image
          </Text>

          <BlockStack gap="300" marginTop="300">
            <TextField
              labelHidden
              placeholder="Paste image URL"
              value={imageUrl}
              onChange={(v) => {
  setImageUrl(v);
  emitChange({ imageUrl: v, bannerType: "image" });
}}

            />

            {/* <InlineStack align="center" gap="200">
              <Box style={{ height: "1px", flex: 1, background: "#ddd" }} />
              <Text tone="subdued">or</Text>
              <Box style={{ height: "1px", flex: 1, background: "#ddd" }} />
            </InlineStack> */}

            {/* <Box
            dis
              padding="300"
              borderWidth="1"
              borderColor="border-subdued"
              borderRadius="300"
              background="bg-surface-secondary"
              style={{ cursor: "pointer", textAlign: "center" }}
              onClick={() =>
                document.getElementById("imageUploadInput")?.click()
              }
            >
              <Text tone="subdued">Click to upload image</Text>

              <input
                type="file"
                accept="image/*"
                id="imageUploadInput"
                style={{ display: "none" }}
                onChange={(e) => {
  const file = e.target.files[0];
  setUploadedFile(file);
  emitChange({ uploadedFile: file, bannerType: "image" });
}}

              />
            </Box> */}
          </BlockStack>
        </Box>
      )}

    </Box>
  );
}
