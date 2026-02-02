import {
  Box,
  Text,
  TextField,
  InlineStack,
  Icon,
  BlockStack,
  Divider,
  Banner,
  Card,
} from "@shopify/polaris";
import { ColorIcon } from "@shopify/polaris-icons";
import { useState, useEffect, useRef } from "react";
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

  const isInitialLoad = useRef(true);

  // Sync when saved metafield loads
  useEffect(() => {
    if (!value) return;

    setButtonColor(value.buttonColor || "#ff0000");
    setPrimaryColor(value.primaryColor || "#ff0000");
    setSecondaryColor(value.secondaryColor || "#0000ff");
    setProgressStart(value.progressStart || "#ff0000");
    setProgressEnd(value.progressEnd || "#0000ff");
  }, [value]);

  useEffect(() => {
    isInitialLoad.current = false;
  }, []);

  return (
    <Box paddingTop="200" paddingBottom="300">
      <Box paddingBlockEnd="300">
        <HelpHeader
          title="Cart banner"
          helpText="Customize colors for buttons, text, and progress bar"
        />
      </Box>
      <Box paddingBlockEnd="200">
        <Divider />
      </Box>
      {/* --------- NEW TABS --------- */}
      <Box paddingBottom="400" paddingTop="400">
        <InlineStack align="start" gap="600" wrap={false}>
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
      </Box>

      {/* ---------------- BUTTON TAB ---------------- */}
      {tab === "button" && (
        <Box paddingY="400">
          <div style={{ marginTop: "10px" }}>
            {" "}
            <Box paddingBlockEnd="200">
              <Divider />
            </Box>
          </div>

          <Box width="100%">
            <Card padding="100">
              <Box
                onClick={() =>
                  document.getElementById("buttonColorInput")?.click()
                }
                style={{
                  cursor: "pointer",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "start",
                  padding: "2%",
                  gap: "10px",
                  width: "100%",
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setButtonColor(val);
                    onChange?.("buttonColor", val);
                  }}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    width: "1px",
                    height: "1px",
                    pointerEvents: "none",
                  }}
                />
              </Box>
            </Card>
          </Box>
        </Box>
      )}

      {/* ---------------- TEXT TAB ---------------- */}
      {tab === "text" && (
        <Box paddingY="400">
          <div style={{ marginTop: "10px" }}>
            {" "}
            <Box paddingBlockEnd="200">
              <Divider />
            </Box>
          </div>

          {/* <Text variant="headingSm" fontWeight="semibold">
            Text Colors
          </Text> */}

          <InlineStack gap="200" marginTop="300" align="start" wrap={false}>
            {/* PRIMARY (left box) */}
            {/* PRIMARY */}

            <Box width="50%">
              <Card padding="100">
                <Box
                  onClick={() =>
                    document.getElementById("primaryColorInput")?.click()
                  }
                  style={{
                    cursor: "pointer",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "start",
                    padding: "2%",
                    gap: "10px",
                    width: "100%",
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setPrimaryColor(val);
                      onChange?.("primaryColor", val);
                    }}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: "34px",
                      height: "34px",
                      cursor: "pointer",
                    }}
                  />
                </Box>
              </Card>
            </Box>

            {/* SECONDARY (right box) */}
            <Box width="50%">
              <Card padding="100">
                <Box
                  onClick={() =>
                    document.getElementById("secondaryColorInput")?.click()
                  }
                  style={{
                    cursor: "pointer",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "start",
                    padding: "2%",
                    gap: "10px",
                    width: "100%",
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setSecondaryColor(val);
                      onChange?.("secondaryColor", val);
                    }}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: "34px",
                      height: "34px",
                      cursor: "pointer",
                    }}
                  />
                </Box>
              </Card>
            </Box>
          </InlineStack>
        </Box>
      )}

      {/* ---------------- PROGRESS BAR TAB ---------------- */}
      {tab === "progress" && (
        <Box paddingY="400">
          <div style={{ marginTop: "10px" }}>
            {" "}
            <Box paddingBlockEnd="200">
              <Divider />
            </Box>
          </div>

          {/* <Text variant="headingSm" fontWeight="semibold">
            Progress Bar Colors
          </Text> */}
          <InlineStack gap="200" marginTop="300" align="start" wrap={false}>
            {/* PRIMARY (left box) */}
            {/* PRIMARY */}

            <Box width="50%">
              <Card padding="100">
                {/* START COLOR */}
                <Box
                  onClick={() =>
                    document.getElementById("progressStartColorInput")?.click()
                  }
                  style={{
                    cursor: "pointer",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "start",
                    padding: "2%",
                    gap: "10px",
                    width: "100%",
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setProgressStart(val);
                      onChange?.("progressStart", val);
                    }}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: "1px",
                      height: "1px",
                      pointerEvents: "none",
                    }}
                  />
                </Box>
              </Card>
            </Box>

            {/* END COLOR */}
            <Box width="50%">
              <Card padding="100">
                <Box
                  onClick={() =>
                    document.getElementById("progressEndColorInput")?.click()
                  }
                  style={{
                    cursor: "pointer",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "start",
                    padding: "2%",
                    gap: "10px",
                    width: "100%",
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setProgressEnd(val);
                      onChange?.("progressEnd", val);
                    }}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: "1px",
                      height: "1px",
                      pointerEvents: "none",
                    }}
                  />
                </Box>
              </Card>
            </Box>
          </InlineStack>
          <div style={{ marginTop: "10px" }}>
            <Banner>
              <p>
                Choose Start and End colors. If both are the same, the progress
                bar shows a solid color. If they’re different, it becomes a
                gradient.
              </p>
            </Banner>
          </div>
        </Box>
      )}
    </Box>
  );
}
