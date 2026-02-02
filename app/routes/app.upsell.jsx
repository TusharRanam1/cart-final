import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  Box,
  InlineGrid,
  BlockStack,
  Card,
  Select,
  Page,
  Text,
  Button,
  InlineStack,
  Thumbnail,
} from "@shopify/polaris";
import { ArrowLeftIcon, CircleLeftIcon } from "@shopify/polaris-icons";
import { useState, useEffect, useMemo } from "react";
import { useLoaderData } from "@remix-run/react";
import { SaveBar, useAppBridge } from "@shopify/app-bridge-react";

import UpsellProductSettings from "./components/UpsellProductSettings.jsx";
import OneClickUpsellSettings from "./components/OneClickUpsellSettings.jsx";
import Colabssiblecom from "./components/Colabssiblecom";
import ProductPickerModal from "./components/ProductPickerModal";

/* ================= DEFAULT SETTINGS ================= */
const DEFAULT_SETTINGS = {
  normalUpsell: {
    enabled: false,
    upsellType: "recommended",
    displayLayout: "carousel",
    ctaAction: "add_to_cart",
    relatedProductCount: 4,
    selectedVariants: [],
  },
  oneClickUpsell: {
    enabled: false,
    ctaType: "checkbox",
    product: null,
    upsellText: "",
    showProductImage: false,
    showInCartList: false,
  },
};

/* ================= LOADER ================= */
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const res = await admin.graphql(`
    query {
      shop {
        metafield(namespace: "optimaio_cart", key: "upsell_settings") {
          value
        }
      }
    }
  `);

  const data = await res.json();
  let settings = DEFAULT_SETTINGS;

  if (data?.data?.shop?.metafield?.value) {
    try {
      const saved = JSON.parse(data.data.shop.metafield.value);
      settings = {
        normalUpsell: {
          ...DEFAULT_SETTINGS.normalUpsell,
          ...(saved.normalUpsell || {}),
        },
        oneClickUpsell: {
          ...DEFAULT_SETTINGS.oneClickUpsell,
          ...(saved.oneClickUpsell || {}),
        },
      };
    } catch {}
  }

  return json({ settings });
};

/* ================= PAGE ================= */
export default function Upsell() {
  const { settings } = useLoaderData();
  const shopify = useAppBridge();

  const ITEMS_PER_PAGE = 5;

  /* ---------- NORMAL UPSELL ---------- */
  const [showUpsell, setShowUpsell] = useState(settings.normalUpsell.enabled);
  const [upsellType, setUpsellType] = useState(
    settings.normalUpsell.upsellType,
  );
  const [displayLayout, setDisplayLayout] = useState(
    settings.normalUpsell.displayLayout,
  );
  const [ctaAction, setCtaAction] = useState(settings.normalUpsell.ctaAction);
  const [relatedProductCount, setRelatedProductCount] = useState(
    settings.normalUpsell.relatedProductCount,
  );
  const [selectedProducts, setSelectedProducts] = useState(
    settings.normalUpsell.selectedVariants ?? [],
  );

  /* ---------- ONE CLICK UPSELL ---------- */
  const [oneClickEnabled, setOneClickEnabled] = useState(
    settings.oneClickUpsell.enabled,
  );
  const [ctaType, setCtaType] = useState(settings.oneClickUpsell.ctaType);
  const [oneClickProducts, setOneClickProducts] = useState(
    settings.oneClickUpsell.product ? [settings.oneClickUpsell.product] : [],
  );
  const [upsellText, setUpsellText] = useState(
    settings.oneClickUpsell.upsellText,
  );
  const [showProductImage, setShowProductImage] = useState(
    settings.oneClickUpsell.showProductImage,
  );
  const [showInCartList, setShowInCartList] = useState(
    settings.oneClickUpsell.showInCartList,
  );

  /* ---------- PICKERS ---------- */
  const [normalPickerOpen, setNormalPickerOpen] = useState(false);

  /* ---------- SAVE BAR ---------- */
  const [page, setPage] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [saveBarOpen, setSaveBarOpen] = useState(false);

  const [oneClickPickerOpen, setOneClickPickerOpen] = useState(false);
  const [variablePopoverOpen, setVariablePopoverOpen] = useState(false);

  /* ---------- SNAPSHOT ---------- */
  const currentSnapshot = useMemo(
    () => ({
      normalUpsell: {
        enabled: showUpsell,
        upsellType,
        displayLayout,
        ctaAction,
        relatedProductCount,
        selectedVariants: selectedProducts,
      },
      oneClickUpsell: {
        enabled: oneClickEnabled,
        ctaType,
        product: oneClickProducts?.[0] ?? null,
        upsellText,
        showProductImage,
        showInCartList,
      },
    }),
    [
      showUpsell,
      upsellType,
      displayLayout,
      ctaAction,
      relatedProductCount,
      selectedProducts,
      oneClickEnabled,
      ctaType,
      oneClickProducts,
      upsellText,
      showProductImage,
      showInCartList,
    ],
  );

  /* ---------- HYDRATION SAFE INIT ---------- */
  useEffect(() => {
    if (hydrated) return;
    setInitialSnapshot(currentSnapshot);
    setHydrated(true);
  }, [hydrated, currentSnapshot]);

  /* ---------- CHANGE DETECTION ---------- */
  useEffect(() => {
    if (!hydrated || !initialSnapshot) return;
    setSaveBarOpen(
      JSON.stringify(currentSnapshot) !== JSON.stringify(initialSnapshot),
    );
  }, [currentSnapshot, initialSnapshot, hydrated]);

  /* ---------- SAVE ---------- */
  const handleSave = async () => {
    const res = await fetch("/api/upsell-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentSnapshot),
    });

    const data = await res.json();
    if (data.success) {
      setInitialSnapshot(currentSnapshot);
      setSaveBarOpen(false);
      shopify?.saveBar?.hide("upsell-save-bar");
    }
  };

  /* ---------- PAGINATION ---------- */
  useEffect(() => setPage(0), [selectedProducts]);

  const paginatedProducts = selectedProducts.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE,
  );

  const rows = paginatedProducts.map((variant) => [
    <Thumbnail
      key={variant.id}
      source={
        variant.image?.url ||
        "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
      }
      alt={variant.title}
      size="small"
    />,
    `${variant.productTitle} — ${variant.title}`,
  ]);

  /* ================= UI ================= */
  return (
    <>
      <Page
        padding="400"
        title={
          <InlineStack gap="500" blockAlign="center">
            <Button
              icon={ArrowLeftIcon}
              plain
              onClick={() => window.history.back()}
            />
            <Text variant="headingLg" as="h2">
              Upsell
            </Text>
          </InlineStack>
        }
      >
        <Box paddingBlockEnd="600">
          <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400">
            <BlockStack gap="400">
              <Colabssiblecom title="One Click Upsell" icon={CircleLeftIcon}>
                <OneClickUpsellSettings
                  enabled={oneClickEnabled}
                  setEnabled={setOneClickEnabled}
                  ctaType={ctaType}
                  setCtaType={setCtaType}
                  oneClickProducts={oneClickProducts}
                  setOneClickProducts={setOneClickProducts}
                  upsellText={upsellText}
                  setUpsellText={setUpsellText}
                  showProductImage={showProductImage}
                  setShowProductImage={setShowProductImage}
                  showInCartList={showInCartList}
                  setShowInCartList={setShowInCartList}
                  oneClickPickerOpen={oneClickPickerOpen} // ✅ FIX
                  setOneClickPickerOpen={setOneClickPickerOpen} // ✅ FIX
                  variablePopoverOpen={variablePopoverOpen} // ✅ FIX
                  setVariablePopoverOpen={setVariablePopoverOpen}
                />
              </Colabssiblecom>

              <Colabssiblecom title="Upsell Product" icon={CircleLeftIcon}>
                <UpsellProductSettings
                  showUpsell={showUpsell}
                  setShowUpsell={setShowUpsell}
                  upsellType={upsellType}
                  setUpsellType={setUpsellType}
                  displayLayout={displayLayout}
                  setDisplayLayout={setDisplayLayout}
                  ctaAction={ctaAction}
                  setCtaAction={setCtaAction}
                  relatedProductCount={relatedProductCount}
                  setRelatedProductCount={setRelatedProductCount}
                  selectedProducts={selectedProducts}
                  setSelectedProducts={setSelectedProducts}
                  rows={rows}
                  page={page}
                  setPage={setPage}
                  ITEMS_PER_PAGE={ITEMS_PER_PAGE}
                  pickerOpen={normalPickerOpen}
                  setPickerOpen={setNormalPickerOpen}
                />
              </Colabssiblecom>
            </BlockStack>

            <BlockStack>
              <Card>
                <Box padding="400">
                  <Select label="Status" />
                </Box>
              </Card>
            </BlockStack>
          </InlineGrid>
        </Box>
      </Page>

      <SaveBar id="upsell-save-bar" open={saveBarOpen} discardConfirmation>
        <button variant="primary" onClick={handleSave}>
          Save
        </button>
        <button onClick={() => window.location.reload()}>Discard</button>
      </SaveBar>
    </>
  );
}
