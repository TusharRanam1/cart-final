import {
  Page,
  Card,
  Box,
  BlockStack,
  InlineGrid,
  InlineStack,
  Text,
  Button,
  Icon,
} from "@shopify/polaris";

import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";

import { authenticate } from "../shopify.server";

import Colabssiblecom from "./components/Colabssiblecom";
import { PaintBrushFlatIcon , ArrowLeftIcon} from "@shopify/polaris-icons";

import ThemeGrid from "./components/ThemeGrid";
import BannerStyleSelector from "./components/BannerStyleSelector";
import CustomizeColorSelector from "./components/CustomizeColorSelector";
import CodeEditor from "./components/CodeEditor";
import ZIndexEditor from "./components/ZIndexEditor";

import { useState, useEffect } from "react";
import { SaveBar, useAppBridge } from "@shopify/app-bridge-react";

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
let settings = {
  theme: "theme1",
  bannerStyle: {
    bannerType: "solid",
  },
  colors: {},
  customCSS: "",
  customJS: "",
  zIndex: "auto",
};


  console.log("Loader fetched data:", data);
  if (data?.data?.shop?.metafield?.value) {
    try {
      settings = JSON.parse(data.data.shop.metafield.value);
    } catch (e) {}
  }

  return json({ settings });
};


export default function ResourceDetailsLayout() {
    const { settings } = useLoaderData();

  const shopify = useAppBridge();

  // Local states
const [selectedTheme, setSelectedTheme] = useState(() => settings.theme);
const [bannerStyle, setBannerStyle] = useState(() => ({
  bannerType: settings.bannerStyle?.bannerType || "solid",
  ...settings.bannerStyle,
}));
const [colors, setColors] = useState(() => settings.colors);
const [customCSS, setCustomCSS] = useState(() => settings.customCSS);
const [customJS, setCustomJS] = useState(() => settings.customJS);
const [zIndex, setZIndex] = useState(() => settings.zIndex);


  // SaveBar state
  const [saveBarOpen, setSaveBarOpen] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
}, [settings]);



  // Detect changes (like in my-campaign)
  const currentSnapshot = {
    theme: selectedTheme,
    bannerStyle,
    colors,
    customCSS,
    customJS,
    zIndex,
  };

  const changed =
    JSON.stringify(currentSnapshot) !== JSON.stringify(initialSnapshot);

  if (changed !== saveBarOpen) {
    setSaveBarOpen(changed);
  }

  // Save settings
  const handleSave = async () => {
  const payload = {
    selectedTheme,
    bannerStyle,
    colors,
    customCSS,
    customJS,
    zIndex,
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
    if (!window.confirm("Discard changes?")) return;
    window.location.reload();
  };

  return (
    <>
      <Page title={
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
        }>
        <Box paddingBlockEnd="600">

        <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400">
          
          {/* LEFT SECTION */}
          <BlockStack gap="400">

            {/* Select Theme */}
            <Colabssiblecom
              title="Select Theme"
              description="Customize the cart widget appearance."
              icon={PaintBrushFlatIcon}
            >
              <ThemeGrid
               selectedTheme={selectedTheme}
  onSelect={(id) => {
    setSelectedTheme(id);
  }}
              />
            </Colabssiblecom>

            {/* Banner + Colors */}
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">

              <Colabssiblecom
                title="Cart banner"
                description="Choose between solid, gradient, or image banners."
                icon={PaintBrushFlatIcon}
              >
                <BannerStyleSelector
                  value={bannerStyle}
                  onChange={(v) => setBannerStyle(v)}
                />
              </Colabssiblecom>

              <Colabssiblecom
                title="Customize colors"
                description="Buttons, text, and progress bar colors."
                icon={PaintBrushFlatIcon}
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
              icon={PaintBrushFlatIcon}
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
      <SaveBar id="cart-settings-save-bar" open={saveBarOpen} discardConfirmation>
        <button variant="primary" onClick={handleSave} disabled={!saveBarOpen}>
          Save
        </button>
        <button onClick={handleDiscard}>Discard</button>
      </SaveBar>
    </>
  );
}