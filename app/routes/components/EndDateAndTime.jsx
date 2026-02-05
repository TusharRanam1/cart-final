import { useState, useCallback, useEffect } from "react";
import {
  Box,
  TextField,
  DatePicker,
  InlineStack,
  Icon,
  Popover,
  Scrollable,
} from "@shopify/polaris";
import { ClockIcon, CalendarIcon } from "@shopify/polaris-icons";

/** Parse stored date (ISO or YYYY-MM-DD) */

function parseStoredDate(input) {
  if (!input) return null;

  // Expect YYYY-MM-DD
  const [y, m, d] = input.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a JS Date to YYYY-MM-DD */
function formatLocalYMD(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

/** Convert time to minutes */
function tripleToMinutes(h, m, p) {
  let hour24 = h;
  if (p === "PM" && h !== 12) hour24 = h + 12;
  if (p === "AM" && h === 12) hour24 = 0;
  return hour24 * 60 + m;
}

function TimePickerField({ label, value, onChange }) {
  const [popoverActive, setPopoverActive] = useState(false);

  const parseTime = (val) => {
    const match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(val || "");
    if (!match) return { hour: 9, minute: 0, period: "AM" };
    const [, h, m, ap] = match;
    return {
      hour: parseInt(h, 10),
      minute: parseInt(m, 10),
      period: ap.toUpperCase(),
    };
  };

  const { hour, minute, period } = parseTime(value);
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ["AM", "PM"];

  const handleSelect = (h, m, p) => {
    const formatted = `${String(h)}:${String(m).padStart(2, "0")} ${p}`;
    onChange(formatted);
    setPopoverActive(false);
  };

  return (
    <Box width="200px">
      <Popover
        active={popoverActive}
        activator={
          <div
            onClick={() => setPopoverActive(true)}
            style={{ cursor: "pointer" }}
          >
            <TextField
              label={label}
              value={value}
              readOnly
              prefix={<Icon source={ClockIcon} tone="base" />}
            />
          </div>
        }
        onClose={() => setPopoverActive(false)}
      >
        <Box padding="300">
          <InlineStack gap="200" align="center">
            <Scrollable style={{ height: "180px", width: "60px" }}>
              {hours.map((h) => (
                <div
                  key={`h-${h}`}
                  className="timepicker-item"
                  onClick={() => handleSelect(h, minute, period)}
                  style={{ padding: 6, textAlign: "center", cursor: "pointer" }}
                >
                  {h}
                </div>
              ))}
            </Scrollable>
            <Scrollable style={{ height: "180px", width: "60px" }}>
              {minutes.map((m) => (
                <div
                  key={`m-${m}`}
                  className="timepicker-item"
                  onClick={() => handleSelect(hour, m, period)}
                  style={{ padding: 6, textAlign: "center", cursor: "pointer" }}
                >
                  {String(m).padStart(2, "0")}
                </div>
              ))}
            </Scrollable>
            <Scrollable style={{ height: "180px", width: "60px" }}>
              {periods.map((p) => (
                <div
                  key={`p-${p}`}
                  className="timepicker-item"
                  onClick={() => handleSelect(hour, minute, p)}
                  style={{ padding: 6, textAlign: "center", cursor: "pointer" }}
                >
                  {p}
                </div>
              ))}
            </Scrollable>
          </InlineStack>
        </Box>
      </Popover>
    </Box>
  );
}

export default function EndDateAndTime({ value, onChange }) {
  const today = new Date();
  const [{ month, year }, setDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });

  // const [selectedEnd, setSelectedEnd] = useState({
  //   start: today,
  //   end: today,
  // });

  const todayYMD = formatLocalYMD(new Date());

  const [selectedEnd, setSelectedEnd] = useState(todayYMD);

  const [endTime, setEndTime] = useState("11:00 AM");
  const [endPopoverActive, setEndPopoverActive] = useState(false);

  /** Hydrate from parent */
  useEffect(() => {
    if (!value) return;

    if (value?.end?.date) {
      const d = parseStoredDate(value.end.date);
      if (d) {
        setSelectedEnd({ start: d, end: d });
        setDate({ month: d.getMonth(), year: d.getFullYear() });
      }
    }
    if (value?.end?.time) {
      setEndTime(value.end.time);
    }
  }, [value]);

  /** Emit final output */
  const emit = (date, time) => {
    onChange?.({
      end: {
        date: formatLocalYMD(date),
        time,
      },
    });
  };

  const handleEndDateChange = (val) => {
    const newDate = val.start;
    setSelectedEnd(val);
    emit(newDate, endTime);
    setEndPopoverActive(false);
  };

  const handleEndTimeChange = (val) => {
    setEndTime(val);
    emit(selectedEnd.start, val);
  };

  return (
    <>
      <Box paddingBlockStart="300">
        <InlineStack gap="400" align="center">
          {/* END DATE */}
          <Box width="200px">
            <Popover
              active={endPopoverActive}
              activator={
                <div
                  onClick={() => setEndPopoverActive(true)}
                  style={{ cursor: "pointer" }}
                >
                  <TextField
                    label={
                      <span style={{ fontWeight: 600, color: "#000" }}>
                        End date
                      </span>
                    }
                    prefix={<Icon source={CalendarIcon} tone="base" />}
                    value={formatLocalYMD(selectedEnd.start)}
                    readOnly
                  />
                </div>
              }
              onClose={() => setEndPopoverActive(false)}
            >
              <Box padding="400">
                <DatePicker
                  month={month}
                  year={year}
                  selected={selectedEnd}
                  onMonthChange={(m, y) => setDate({ month: m, year: y })}
                  onChange={handleEndDateChange}
                />
              </Box>
            </Popover>
          </Box>

          {/* END TIME */}
          <TimePickerField
            label={
              <span style={{ fontWeight: 600, color: "#000" }}>End time</span>
            }
            value={endTime}
            onChange={handleEndTimeChange}
          />
        </InlineStack>
      </Box>

      <style jsx global>{`
        input.Polaris-TextField__Input {
          color: #000 !important;
        }
        .Polaris-Label__Text {
          color: #000 !important;
          font-weight: 600 !important;
        }
        .Polaris-TextField__Prefix svg {
          fill: #000 !important;
        }
        .timepicker-item {
          color: #000 !important;
        }
        .timepicker-item:hover {
          background: #eee;
        }
        .timepicker-item.selected {
          background: #000 !important;
          color: #fff !important;
        }
      `}</style>
    </>
  );
}
