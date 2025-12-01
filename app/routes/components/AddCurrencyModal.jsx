import { useState } from "react";
import {
  Modal,
  Box,
  Listbox,
  Combobox,
} from "@shopify/polaris";

// 🧩 Step 1: Define currency name + symbol map
const currencyData = {
  AED: { name: "United Arab Emirates Dirham", symbol: "د.إ" },
  AFN: { name: "Afghan Afghani", symbol: "؋" },
  ALL: { name: "Albanian Lek", symbol: "L" },
  AMD: { name: "Armenian Dram", symbol: "֏" },
  ARS: { name: "Argentine Peso", symbol: "$" },
  AUD: { name: "Australian Dollar", symbol: "$" },
  BDT: { name: "Bangladeshi Taka", symbol: "৳" },
  BHD: { name: "Bahraini Dinar", symbol: ".د.ب" },
  BAM: { name: "Bosnia-Herzegovina Convertible Mark", symbol: "KM" },
  BRL: { name: "Brazilian Real", symbol: "R$" },
  GBP: { name: "British Pound", symbol: "£" },
  BGN: { name: "Bulgarian Lev", symbol: "лв" },
  BIF: { name: "Burundian Franc", symbol: "FBu" },
  CAD: { name: "Canadian Dollar", symbol: "$" },
  CNY: { name: "Chinese Yuan", symbol: "¥" },
  EUR: { name: "Euro", symbol: "€" },
  INR: { name: "Indian Rupee", symbol: "₹" },
  USD: { name: "US Dollar", symbol: "$" },
};

// 🧩 Step 2: Build a readable currency list for the dropdown
const currencies = Object.entries(currencyData).map(
  ([code, { name }]) => `${name} (${code})`
);

export default function AddCurrencyModal({ open, onClose, onAdd }) {
  const [inputValue, setInputValue] = useState("");
  const [selected, setSelected] = useState("");

  const handleSelect = (value) => {
    const code = value.match(/\((.*?)\)/)?.[1];
    const symbol = currencyData[code]?.symbol || "$";

    // ✅ Return both code and symbol to parent
    onAdd({ code, symbol });
    setInputValue("");
    setSelected(code);
    onClose();
  };

  // Filter currencies by search text
  const filteredCurrencies = currencies.filter((currency) =>
    currency.toLowerCase().includes(inputValue.toLowerCase())
  );

  const options = filteredCurrencies.map((currency) => (
    <Listbox.Option key={currency} value={currency}>
      {currency}
    </Listbox.Option>
  ));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select a currency"
      primaryAction={{
        content: "Close",
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <Combobox
          activator={
            <Combobox.TextField
              onChange={setInputValue}
              label="Click to select a currency"
              value={inputValue}
              placeholder="Search currencies..."
              autoComplete="off"
            />
          }
        >
          {options.length > 0 ? (
            <Listbox onSelect={handleSelect}>{options}</Listbox>
          ) : (
            <Listbox>
              <Listbox.Option value="no-results" disabled>
                No results found
              </Listbox.Option>
            </Listbox>
          )}
        </Combobox>
      </Modal.Section>
    </Modal>
  );
}
