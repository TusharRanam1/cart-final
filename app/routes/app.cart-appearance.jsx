import {
  Page,
  Card,
  Box,
  BlockStack,
  InlineGrid,
  InlineStack,
  Text,
  Button,
  Modal,
} from "@shopify/polaris";
import {
  PaintBrushFlatIcon,
  ArrowLeftIcon,
  ConfettiIcon,
  ThemeEditIcon,
  CartSaleIcon,
  ColorIcon,
  EnvelopeSoftPackIcon,
  LayoutSectionIcon,
  AppsIcon,
} from "@shopify/polaris-icons";

import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { ColorThemes } from "./utils/theme/colorThemes";
import { authenticate } from "../shopify.server";
import Colabssiblecom from "./components/Colabssiblecom";
import ThemeGrid from "./components/ThemeGrid";
import BannerStyleSelector from "./components/BannerStyleSelector";
import CustomizeColorSelector from "./components/CustomizeColorSelector";
import CodeEditor from "./components/CodeEditor";
import ZIndexEditor from "./components/ZIndexEditor";
import AnnouncementBarSettings from "./components/AnnouncementBarSettings";
import CartFeaturesSettings from "./components/CartFeaturesSettings";
import { useState, useEffect } from "react";
import { SaveBar, useAppBridge } from "@shopify/app-bridge-react";
import CartWidgetSettings from "./components/CartWidgetSettings";

// this is new code
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const query = `
    query {
      shop {
        metafield(namespace: "optimaio_cart", key: "cart_settings") {
          value
        }
      }
    }
  `;

  const res = await admin.graphql(query);
  const data = await res.json();
  const DEFAULT_SETTINGS = {
    theme: "theme1",
    announcementBar: { messages: [], autoScroll: false },
    cartFeatures: {
      offerAnimation: "confetti",
      discountCodeInput: true,
      orderNotes: true,
    },
    cartWidget: {
      position: "right",
      widgetColor: "#000000",
      showFloatingWidget: true,
    },
    bannerStyle: { bannerType: "solid" },
    colors: {},
    customCSS: "",
    customJS: "",
    zIndex: "auto",
  };

  let settings;

  if (data?.data?.shop?.metafield?.value) {
    try {
      settings = {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(data.data.shop.metafield.value),
      };
    } catch {
      settings = DEFAULT_SETTINGS;
    }
  } else {
    settings = DEFAULT_SETTINGS;
  }

  return json({ settings });
};

export default function ResourceDetailsLayout() {
  const { settings } = useLoaderData();

  const shopify = useAppBridge();

  // Local states
  const [cartFeatures, setCartFeatures] = useState(
    () =>
      settings.cartFeatures || {
        offerAnimation: "confetti",
        discountCodeInput: true,
        orderNotes: true,
      },
  );

  const [cartWidget, setCartWidget] = useState(
    () =>
      settings.cartWidget || {
        position: "right",
        widgetColor: "#000000",
        showFloatingWidget: true,
      },
  );

  const [selectedTheme, setSelectedTheme] = useState(() => settings.theme);
  const [bannerStyle, setBannerStyle] = useState(() => ({
    bannerType: settings.bannerStyle?.bannerType || "solid",
    ...settings.bannerStyle,
  }));
  const [colors, setColors] = useState(() => settings.colors);
  const [customCSS, setCustomCSS] = useState(() => settings.customCSS);
  const [customJS, setCustomJS] = useState(() => settings.customJS);
  const [zIndex, setZIndex] = useState(() => settings.zIndex);
  const [announcementBar, setAnnouncementBar] = useState(
    () => settings.announcementBar || { messages: [""], autoScroll: false },
  );

  // SaveBar state
  const [saveBarOpen, setSaveBarOpen] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [previewTheme, setPreviewTheme] = useState(null);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  useEffect(() => {
    if (!initialSnapshot) return;

    // 🔥 If theme changed
    if (selectedTheme !== initialSnapshot.theme) {
      // Reset banner + colors ONLY
      setBannerStyle({ bannerType: "solid" });
      setColors({});
    }
  }, [selectedTheme]);

  // Initialize Snapshot (first load)
  useEffect(() => {
    if (!isInitialized) {
      const snap = {
        theme: settings.theme,
        bannerStyle: settings.bannerStyle,
        colors: settings.colors,
        customCSS: settings.customCSS,
        customJS: settings.customJS,
        zIndex: settings.zIndex,
        announcementBar: settings.announcementBar,
        cartFeatures: settings.cartFeatures,
        cartWidget: settings.cartWidget,
      };
      setInitialSnapshot(snap);
      setIsInitialized(true);
    }
  }, [settings]);

  useEffect(() => {
    setSelectedTheme(settings.theme);
    setBannerStyle({
      bannerType: settings.bannerStyle?.bannerType || "solid",
      ...settings.bannerStyle,
    });
    setColors(settings.colors || {});

    setCustomCSS(settings.customCSS);
    setCustomJS(settings.customJS);
    setZIndex(settings.zIndex);
    setAnnouncementBar(
      settings.announcementBar || { messages: [""], autoScroll: false },
    );
    setCartFeatures(
      settings.cartFeatures || {
        offerAnimation: "confetti",
        discountCodeInput: true,
        orderNotes: true,
      },
    );
    setCartWidget(
      settings.cartWidget || {
        position: "right",
        widgetColor: "#000000",
        showFloatingWidget: true,
      },
    );
  }, [settings]);

  // Detect changes (like in my-campaign)
  const currentSnapshot = {
    theme: selectedTheme,
    bannerStyle,
    colors,
    customCSS,
    customJS,
    zIndex,
    announcementBar,
    cartFeatures,
    cartWidget,
  };

  const changed =
    isInitialized &&
    initialSnapshot &&
    JSON.stringify(currentSnapshot) !== JSON.stringify(initialSnapshot);

  useEffect(() => {
    if (!isInitialized) return;
    setSaveBarOpen(changed);
  }, [changed, isInitialized]);

  // Save settings
  const handleSave = async () => {
    const payload = {
      selectedTheme,
      bannerStyle,
      colors,
      customCSS,
      customJS,
      zIndex,
      announcementBar,
      cartFeatures,
      cartWidget,
      themeChanged: selectedTheme !== initialSnapshot.theme, // 👈 IMPORTANT
    };

    const res = await fetch("/api/cart-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.ok) {
      setInitialSnapshot(currentSnapshot);
      setSaveBarOpen(false);
      shopify?.saveBar?.hide("cart-settings-save-bar");
    } else {
      alert("❌ Failed to save cart settings");
    }
  };

  // Discard does not need API
  const handleDiscard = () => {
    window.location.reload();
  };

  const selectedThemeName =
    ColorThemes.find((t) => t.id === selectedTheme)?.name || selectedTheme;

  return (
    <>
      <Page
        title={
          <InlineStack gap="500" blockAlign="center">
            <Button
              icon={ArrowLeftIcon}
              plain
              onClick={() => window.history.back()}
            />
            <Text variant="headingLg" as="h2">
              Cart Appearance
            </Text>
          </InlineStack>
        }
      >
        <Box paddingBlockEnd="600">
          <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400">
            {/* LEFT SECTION */}
            <BlockStack gap="400">
              {/* Announcement Bar */}
              <Colabssiblecom
                title="Announcement Bar"
                description="Display announcement messages at the top of the cart."
                icon={AppsIcon}
              >
                <AnnouncementBarSettings
                  value={announcementBar}
                  onChange={setAnnouncementBar}
                />
              </Colabssiblecom>

              {/* Cart Widget Settings */}
              <Colabssiblecom
                title="Cart widget"
                description="Control cart widget position and visibility."
                icon={ConfettiIcon}
              >
                <CartWidgetSettings
                  value={cartWidget}
                  onChange={setCartWidget}
                />
              </Colabssiblecom>

              {/* Cart Features */}

              <Colabssiblecom
                title="Cart features"
                description="Display cart features."
                icon={LayoutSectionIcon}
              >
                <CartFeaturesSettings
                  value={cartFeatures}
                  onChange={setCartFeatures}
                />
              </Colabssiblecom>

              {/* Select Theme */}
              <Colabssiblecom
                title="Select theme"
                description="Customize the cart widget appearance."
                icon={ThemeEditIcon}
              >
                <BlockStack gap="300">
                  <Box maxWidth="240px" width="100%">
                    <Button
                      variant="primary"
                      icon={PaintBrushFlatIcon}
                      onClick={() => setThemeModalOpen(true)}
                    >
                      Choose theme
                    </Button>
                  </Box>

                  {/* Optional: show currently selected theme */}
                  <Text tone="subdued">
                    Selected theme: <strong>{selectedThemeName}</strong>
                  </Text>
                </BlockStack>
              </Colabssiblecom>

              {/* Banner + Colors */}
              <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                <Colabssiblecom
                  title="Cart banner"
                  description="Choose between solid, gradient, or image banners."
                  icon={CartSaleIcon}
                >
                  <BannerStyleSelector
                    value={bannerStyle}
                    onChange={(v) => setBannerStyle(v)}
                  />
                </Colabssiblecom>

                <Colabssiblecom
                  title="Customize colors"
                  description="Buttons, text, and progress bar colors."
                  icon={ColorIcon}
                >
                  <CustomizeColorSelector
                    value={colors}
                    onChange={(key, value) => {
                      setColors((prev) => ({
                        ...prev,
                        [key]: value,
                      }));
                    }}
                  />
                </Colabssiblecom>
              </InlineGrid>

              {/* Z-index + Custom Code */}
              <Colabssiblecom
                title="Advanced"
                description="Custom CSS & JS overrides"
                icon={EnvelopeSoftPackIcon}
              >
                <ZIndexEditor value={zIndex} onChange={setZIndex} />

                <CodeEditor
                  title="CSS overrides"
                  helpText="Modify styling of the widget."
                  language="css"
                  value={customCSS}
                  onChange={setCustomCSS}
                />

                <CodeEditor
                  title="JavaScript overrides"
                  helpText="Executed inside the cart widget. No <script> tags needed."
                  language="js"
                  value={customJS}
                  onChange={setCustomJS}
                />
              </Colabssiblecom>
            </BlockStack>

            <Modal
              open={themeModalOpen}
              onClose={() => setThemeModalOpen(false)}
              title="Select a Theme"
              fullScreen
              primaryAction={{
                content: "Apply theme",
                onAction: () => {
                  setSelectedTheme(previewTheme.id);
                  setThemeModalOpen(false);
                },
              }}
              secondaryActions={[
                {
                  content: "Cancel",
                  onAction: () => setThemeModalOpen(false),
                },
              ]}
            >
              <Modal.Section>
                <ThemeGrid
                  selectedTheme={selectedTheme}
                  onPreviewChange={setPreviewTheme}
                />
              </Modal.Section>
            </Modal>

            {/* RIGHT SECTION */}
            <BlockStack>
              <Card>
                <Box padding="400">Preview or widget info here.</Box>
              </Card>
            </BlockStack>
          </InlineGrid>
        </Box>
      </Page>

      {/* SAVE BAR */}
      <SaveBar
        id="cart-settings-save-bar"
        open={saveBarOpen}
        discardConfirmation
      >
        <button variant="primary" onClick={handleSave} disabled={!saveBarOpen}>
          Save
        </button>
        <button onClick={handleDiscard}>Discard</button>
      </SaveBar>
    </>
  );
}
