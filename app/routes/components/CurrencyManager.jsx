import { useState, useEffect, useRef } from "react";
import {
  Box,
  InlineGrid,
  Button,
  Banner,
  Card,
  Spinner,
} from "@shopify/polaris";
import CurrencyRow from "./CurrencyRow";
import AddCurrencyModal from "./AddCurrencyModal";

export default function CurrencyManager() {
  const [currencies, setCurrencies] = useState([]);
  const [defaultCurrency, setDefaultCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [initialCurrencies, setInitialCurrencies] = useState([]);
  const [initialDefault, setInitialDefault] = useState("");

  const hiddenInputRef = useRef(null);
  const [hasLoaded, setHasLoaded] = useState(false);
const [showDecimals, setShowDecimals] = useState("no"); // or "yes"
const [initialShowDecimals, setInitialShowDecimals] = useState("no");

  /* ---------------- Fetch existing metafield ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/get-currencies");
        const data = await res.json();

        if (data.ok) {
          setCurrencies(data.currencies);
          setDefaultCurrency(data.defaultCurrency);

          setInitialCurrencies(data.currencies);
          setInitialDefault(data.defaultCurrency);

          setShowDecimals(data.showDecimals || "no");
setInitialShowDecimals(data.showDecimals || "no");

          // ✅ Set BOTH defaultValue and value BEFORE enabling tracking
          const json = JSON.stringify({
            currencies: data.currencies,
            defaultCurrency: data.defaultCurrency,
              showDecimals: data.showDecimals || "no",
          });
          if (hiddenInputRef.current) {
            hiddenInputRef.current.defaultValue = json; // baseline
            hiddenInputRef.current.value = json;
          }
        } else {
          console.warn("⚠️ Failed to fetch metafield data:", data);
        }
      } catch (err) {
        console.error("Error loading currencies:", err);
      } finally {
        setLoading(false);
        // allow Save Bar after stable mount
        setTimeout(() => setHasLoaded(true), 500);
      }
    })();
  }, []);

  /* ---------------- Trigger Save Bar after real user change ---------------- */
  useEffect(() => {
    if (!hasLoaded) return;
    if (!hiddenInputRef.current) return;

    const newValue = JSON.stringify({ currencies, defaultCurrency, showDecimals});

    // ✅ Only trigger if value differs from defaultValue
    if (hiddenInputRef.current.defaultValue !== newValue) {
      hiddenInputRef.current.value = newValue;
      const evt = new Event("change", { bubbles: true });
      hiddenInputRef.current.dispatchEvent(evt);
    } else {
      // No changes — hide Save Bar if shown
      hiddenInputRef.current.value = newValue;
    }
  }, [currencies, defaultCurrency,showDecimals, hasLoaded]);

  const handleSetDefault = (code) => setDefaultCurrency(code);

  const handleSaveFormat = (code, newFormat) => {
    setCurrencies((prev) =>
      prev.map((c) => (c.code === code ? { ...c, format: newFormat } : c))
    );
  };

  const handleAddCurrency = ({ code, symbol }) => {
    if (currencies.some((c) => c.code === code)) return;
    setCurrencies([...currencies, { code, format: `${symbol} {{amount}}` }]);
    setIsModalOpen(false);
  };

  const handleDeleteCurrency = (code) => {
    if (currencies.length === 1) {
      alert("You must have at least one currency.");
      return;
    }
    if (code === defaultCurrency) {
      const nextCurrency = currencies.find((c) => c.code !== code);
      if (nextCurrency) setDefaultCurrency(nextCurrency.code);
    }
    setCurrencies((prev) => prev.filter((c) => c.code !== code));
  };

  if (loading) {
    return (
      <Box padding="400" align="center">
        <Spinner accessibilityLabel="Loading currencies" size="large" />
      </Box>
    );
  }

 /* ---------------- Render ---------------- */
if (loading) {
  return (
    <Box padding="400" align="center">
      <Spinner accessibilityLabel="Loading currencies" size="large" />
    </Box>
  );
}

// ✅ Don't render form until data and baseline are ready
if (!hasLoaded) return null;

return (
  <>
    <form
      method="post"
      data-save-bar
      onSubmit={async (e) => {
        e.preventDefault();
        const payload = { currencies, defaultCurrency, showDecimals };
        const res = await fetch("/api/save-currencies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
          console.log("✅ Saved currencies to metafield");

          // ✅ Reset baseline (so Save Bar hides again)
          const json = JSON.stringify({ currencies, defaultCurrency, showDecimals });
          hiddenInputRef.current.defaultValue = json;
          hiddenInputRef.current.value = json;
          const evt = new Event("change", { bubbles: true });
          hiddenInputRef.current.dispatchEvent(evt);

          setInitialCurrencies(currencies);
          setInitialDefault(defaultCurrency);

        } else {
          console.error("❌ Failed to save:", data.errors);
        }
      }}
      onReset={() => {
  console.log("🗑️ Discarding changes");

  // Restore from backup (React state)
  setCurrencies(initialCurrencies);
  setDefaultCurrency(initialDefault);
  setShowDecimals(initialShowDecimals);

  // Wait for React to finish rendering restored state
  requestAnimationFrame(() => {
    const json = JSON.stringify({
      currencies: initialCurrencies,
      defaultCurrency: initialDefault,
       showDecimals: initialShowDecimals,
    });

    if (hiddenInputRef.current) {
      hiddenInputRef.current.defaultValue = json;
      hiddenInputRef.current.value = json;

      // Dispatch AFTER render, so Shopify sees stable values
      const evt = new Event("change", { bubbles: true });
      hiddenInputRef.current.dispatchEvent(evt);
    }

    console.log("✅ Discard applied and Save Bar cleared");
  });
}}

    >
      <input
        ref={hiddenInputRef}
        type="hidden"
        name="metafieldData"
        defaultValue={JSON.stringify({
          currencies: initialCurrencies,
          defaultCurrency: initialDefault,
              showDecimals: initialShowDecimals,
        })}
      />

      <Card>
        <InlineGrid columns={["1fr", "2fr"]} gap="400" alignItems="center">
          <CurrencyRow
            currencies={currencies}
            onSave={handleSaveFormat}
            onDelete={handleDeleteCurrency}
            onSetDefault={handleSetDefault}
            defaultCurrency={defaultCurrency}
             showDecimals={showDecimals}
  setShowDecimals={setShowDecimals}
          />

          <Box paddingBlockStart="400">
            <Button fullWidth onClick={() => setIsModalOpen(true)}>
              Add currency
            </Button>
          </Box>

          <AddCurrencyModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAdd={handleAddCurrency}
          />
        </InlineGrid>
      </Card>
    </form>

    <Box paddingBlockStart="400">
      <Banner tone="warning">
        If you don't add all currencies in your store to this list, it's
        possible that a user may see an incorrect price for a product.
      </Banner>
    </Box>
  </>
);

}
