import { Box, Text } from "@shopify/polaris";
import { useState } from "react";
import HelpHeader from "./HelpHeader";

export default function PolarisTextAreaWithLineNumbers() {
  const [value, setValue] = useState(
    ""
  );

  const lineArray = value.split("\n");
  const lineCount = Math.max(lineArray.length, 4); // 👈 Always minimum 4

  return (
    <Box>

      {/* LABEL */}
       <HelpHeader
             title="Css overrides"
             helpText="Add custom CSS to modify the appearance of the cart widget beyond the default styling."
           />

      {/* WRAPPER */}
      <div style={{ display: "flex", marginTop: "8px", width: "100%" }}>
        
        {/* ---------------- LINE NUMBER BAR ---------------- */}
        <div
          style={{
            background: "#eef4ff",
            padding: "12px 10px",
            border: "1px solid #c4cdd5",
            borderRight: "none",
            borderRadius: "8px 0 0 8px",
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#637381",
            lineHeight: "22px",
            userSelect: "none",
            textAlign: "right",
          }}
        >
          {Array.from({ length: lineCount }).map((_, idx) => (
            <div key={idx}>{idx + 1}</div>
          ))}
        </div>

        {/* ---------------- POLARIS TEXTAREA ---------------- */}
        <div style={{ flex: 1 }}>
          <div
            className="Polaris-TextField Polaris-TextField--multiline Polaris-TextField--hasValue"
            style={{
              borderRadius: "0 8px 8px 0",
              borderLeft: "none",
            }}
          >
            <textarea
              className="Polaris-TextField__Input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{
                fontFamily: "monospace",
                fontSize: "14px",
                height: lineCount * 22 + 24, // 👈 Always at least 4 lines tall
                padding: "12px 12px",
                resize: "none",
                lineHeight: "22px",
                borderRadius: "0 8px 8px 0",
              }}
            />

            <div
              className="Polaris-TextField__Backdrop"
              style={{
                borderRadius: "0 8px 8px 0",
              }}
            ></div>
          </div>
        </div>

      </div>
    </Box>
  );
}
