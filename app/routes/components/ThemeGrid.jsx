import { useState, useEffect } from "react";
import {
  Box,
  InlineGrid,
  BlockStack,
  InlineStack,
  Text,
  Scrollable,
  Card,
  Divider,
} from "@shopify/polaris";
import { ColorThemes } from "../utils/theme/colorThemes";

export default function ThemeGrid({ selectedTheme, onPreviewChange }) {
  const [previewTheme, setPreviewTheme] = useState(null);
  const [rotatingThemeId, setRotatingThemeId] = useState(null);

  // Sync preview when modal opens or selected theme changes
  useEffect(() => {
    const applied = ColorThemes.find((t) => t.id === selectedTheme);
    setPreviewTheme(applied);
    onPreviewChange?.(applied);
  }, [selectedTheme]);

  const handleThemeClick = (theme) => {
    setPreviewTheme(theme);
    onPreviewChange(theme);

    setRotatingThemeId(theme.id);

    // reset rotation state after animation
    setTimeout(() => {
      setRotatingThemeId(null);
    }, 600);
  };

  return (
    <InlineGrid columns="1.75fr 2fr" gap="300">
      {/* LEFT: Theme list */}

      <Card>
        <Scrollable shadow style={{ height: 400 }} focusable>
          <BlockStack gap="200">
            {ColorThemes.map((theme, index) => {
              const isSelected = previewTheme?.id === theme.id;
              return (
                <BlockStack key={theme.id} gap="100">
                  <Box
                    key={theme.id}
                    padding="300"
                    borderWidth="1"
                    borderRadius="200"
                    background={isSelected ? "bg-fill-tertiary" : "bg-surface"}
                    onClick={() => {
                      handleThemeClick(theme);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <InlineStack gap="300" blockAlign="center">
                      <img
                        src={theme.src}
                        width={60}
                        height={60}
                        style={{
                          transition: "transform 0.6s ease",
                          transform:
                            rotatingThemeId === theme.id
                              ? "rotate(360deg) scale(1.05)"
                              : "rotate(0deg) scale(1)",
                        }}
                      />

                      <Text fontWeight="medium">{theme.name}</Text>
                    </InlineStack>
                  </Box>
                  {/* Divider between items (not after last one) */}
                  {index !== ColorThemes.length - 1 && <Divider />}
                </BlockStack>
              );
            })}
          </BlockStack>
        </Scrollable>
      </Card>

      {/* RIGHT: Preview */}
      <Card>
        {previewTheme ? (
          <BlockStack gap="300" inlineAlign="center">
            <Text variant="headingMd">{previewTheme.name}</Text>
            <img src={previewTheme.previewSrc} width={250} height={350} />
            <Text tone="subdued" alignment="center">
              Preview only. Click “Apply theme” to confirm.
            </Text>
          </BlockStack>
        ) : (
          <Text tone="subdued">Select a theme to preview</Text>
        )}
      </Card>
    </InlineGrid>
  );
}
