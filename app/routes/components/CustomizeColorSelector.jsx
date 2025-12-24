import {
  Box,
  Text,
  TextField,
  InlineStack,
  Icon,
  BlockStack,
  Divider,
  Banner,
} from "@shopify/polaris";
import { ColorIcon } from "@shopify/polaris-icons";
import { useState, useEffect } from "react";
import HelpHeader from "./HelpHeader";

export default function CustomizeColorSelector({ onChange, value }) {
  const [tab, setTab] = useState("button");

  // Button color
  const [buttonColor, setButtonColor] = useState(
    value?.buttonColor || "#ff0000",
  );

  // Text colors
  const [primaryColor, setPrimaryColor] = useState(
    value?.primaryColor || "#ff0000",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    value?.secondaryColor || "#0000ff",
  );

  // Progress bar colors
  const [progressStart, setProgressStart] = useState(
    value?.progressStart || "#ff0000",
  );
  const [progressEnd, setProgressEnd] = useState(
    value?.progressEnd || "#0000ff",
  );

  // Sync when saved metafield loads
  useEffect(() => {
    if (!value) return;

    setButtonColor(value.buttonColor || "#ff0000");
    setPrimaryColor(value.primaryColor || "#ff0000");
    setSecondaryColor(value.secondaryColor || "#0000ff");
    setProgressStart(value.progressStart || "#ff0000");
    setProgressEnd(value.progressEnd || "#0000ff");
  }, [value]);

  // Send output to parent
  useEffect(() => {
    onChange &&
      onChange({
        buttonColor,
        primaryColor,
        secondaryColor,
        progressStart,
        progressEnd,
      });
  }, [buttonColor, primaryColor, secondaryColor, progressStart, progressEnd]);

  return (
    <Box paddingTop="200" paddingBottom="300">
      <HelpHeader
        title="Cart banner"
        helpText="Customize colors for buttons, text, and progress bar"
      />

      {/* --------- NEW TABS --------- */}
      <InlineStack align="center" gap="600" wrap={false}>
        {["button", "text", "progress"].map((type) => (
          <Box
            key={type}
            onClick={() => setTab(type)}
            style={{ cursor: "pointer", textAlign: "center" }}
          >
            <Text
              variant="bodyLg"
              fontWeight={tab === type ? "bold" : "regular"}
              color={tab === type ? "text" : "subdued"}
            >
              {type === "button" && "Button"}
              {type === "text" && "Text"}
              {type === "progress" && "Progress Bar"}
            </Text>

            {tab === type && (
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

      {/* ---------------- BUTTON TAB ---------------- */}
      {tab === "button" && (
        <Box paddingY="400">
          <div style={{ marginTop: "10px" }}>
            {" "}
            <Divider />
          </div>

          <Text variant="headingSm" fontWeight="semibold">
            Button Color
          </Text>

          <Box
            onClick={() => document.getElementById("buttonColorInput")?.click()}
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
                background: buttonColor,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon source={ColorIcon} tone="inverse" />
            </Box>

            <Text variant="bodyMd" tone="subdued">
              Button color
            </Text>

            <input
              type="color"
              id="buttonColorInput"
              value={buttonColor}
              onChange={(e) => setButtonColor(e.target.value)}
              style={{ display: "none" }}
            />
          </Box>
        </Box>
      )}

      {/* ---------------- TEXT TAB ---------------- */}
      {/* ---------------- TEXT TAB ---------------- */}
      {tab === "text" && (
        <Box paddingY="400">
          <div style={{ marginTop: "10px" }}>
            {" "}
            <Divider />
          </div>

          <Text variant="headingSm" fontWeight="semibold">
            Text Colors
          </Text>

          <InlineStack gap="0" marginTop="300" align="center">
            {/* PRIMARY (left box) */}
            <Box
              onClick={() =>
                document.getElementById("primaryColorInput")?.click()
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
                  background: primaryColor,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon source={ColorIcon} tone="inverse" />
              </Box>

              <Text variant="bodyMd" tone="subdued">
                Primary
              </Text>

              <input
                type="color"
                id="primaryColorInput"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
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

            {/* SECONDARY (right box) */}
            <Box
              onClick={() =>
                document.getElementById("secondaryColorInput")?.click()
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
                  background: secondaryColor,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon source={ColorIcon} tone="inverse" />
              </Box>

              <Text variant="bodyMd" tone="subdued">
                Secondary
              </Text>

              <input
                type="color"
                id="secondaryColorInput"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                style={{ display: "none" }}
              />
            </Box>
          </InlineStack>
        </Box>
      )}

      {/* ---------------- PROGRESS BAR TAB ---------------- */}
      {tab === "progress" && (
        <Box paddingY="400">
          <div style={{ marginTop: "10px" }}>
            {" "}
            <Divider />
          </div>

          <Text variant="headingSm" fontWeight="semibold">
            Progress Bar Colors
          </Text>

          <InlineStack gap="0" marginTop="300" align="center">
            {/* START COLOR */}
            <Box
              onClick={() =>
                document.getElementById("progressStartColorInput")?.click()
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
                  background: progressStart,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon source={ColorIcon} tone="inverse" />
              </Box>

              <Text variant="bodyMd" tone="subdued">
                Start color
              </Text>

              <input
                type="color"
                id="progressStartColorInput"
                value={progressStart}
                onChange={(e) => setProgressStart(e.target.value)}
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

            {/* END COLOR */}
            <Box
              onClick={() =>
                document.getElementById("progressEndColorInput")?.click()
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
                  background: progressEnd,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon source={ColorIcon} tone="inverse" />
              </Box>

              <Text variant="bodyMd" tone="subdued">
                End color
              </Text>

              <input
                type="color"
                id="progressEndColorInput"
                value={progressEnd}
                onChange={(e) => setProgressEnd(e.target.value)}
                style={{ display: "none" }}
              />
            </Box>
          </InlineStack>
          <div style={{marginTop:"10px"}}>
            <Banner >
          <p>
            Choose Start and End colors. If both are the same, the progress bar shows a solid color. If they’re different, it becomes a gradient.
          </p>
        </Banner>
        </div>
        </Box>
      )}
    </Box>
  );
}
