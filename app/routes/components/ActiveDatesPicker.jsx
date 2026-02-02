import { useState, useCallback, useEffect } from "react";
import {
  Box,
  Checkbox,
  TextField,
  DatePicker,
  InlineStack,
  Icon,
  Popover,
} from "@shopify/polaris";
import { CalendarIcon } from "@shopify/polaris-icons";

/** Parse a stored date that might be ISO or 'YYYY-MM-DD' */
function parseStoredDate(input) {
  if (!input) return null;
  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) return d;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (m) {
    const [, y, mo, da] = m;
    return new Date(Number(y), Number(mo) - 1, Number(da));
  }
  return null;
}

/** Format a JS Date to local 'YYYY-MM-DD' */
function formatLocalYMD(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ActiveDatesPicker({ value, onChange }) {
  const today = new Date();
  const [{ month, year }, setDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });

  const [selectedStart, setSelectedStart] = useState({
    start: today,
    end: today,
  });
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [hasEndDate, setHasEndDate] = useState(false);

  const [startPopoverActive, setStartPopoverActive] = useState(false);
  const [endPopoverActive, setEndPopoverActive] = useState(false);
  // Skip emitting until we've actually received data from parent
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!value) return;
    const sd = parseStoredDate(value.start?.date);
    const ed = parseStoredDate(value.end?.date);
    const hasEnd = Boolean(value.hasEndDate);

    // --- Start ---
    if (sd) {
      setSelectedStart({ start: sd, end: sd });
      setDate({ month: sd.getMonth(), year: sd.getFullYear() });
    } else {
      const now = new Date();
      setSelectedStart({ start: now, end: now });
    }

    // --- End + checkbox ---
    if (hasEnd && ed) {
      setSelectedEnd({ start: ed, end: ed });
      setHasEndDate(true);
    } else {
      setSelectedEnd(null);
      setHasEndDate(false);
    }

    setHydrated(true); // ✅ mark ready
  }, [value]);

  /** Emit to parent */
  const emitChange = useCallback(
    (startObj, endFlag, endObj) => {
      if (!hydrated) return; // 🛑 block initial save bar

      onChange?.({
        start: { date: startObj ? formatLocalYMD(startObj) : null },
        end: endFlag ? { date: endObj ? formatLocalYMD(endObj) : null } : null,
        hasEndDate: endFlag,
      });
    },
    [onChange, hydrated],
  );

  const handleMonthChange = useCallback(
    (m, y) => setDate({ month: m, year: y }),
    [],
  );

  /** START DATE */
  const handleStartDateChange = (val) => {
    const newStart = val.start;
    setSelectedStart(val);
    // if end date exists and is same or before start, clear it
    if (selectedEnd?.start && newStart >= selectedEnd.start) {
      setSelectedEnd(null);
      setHasEndDate(false);
    }
    emitChange(
      newStart,
      hasEndDate && selectedEnd?.start > newStart,
      selectedEnd?.start,
    );
    setStartPopoverActive(false);
  };

  /** END DATE */
  const handleEndDateChange = (val) => {
    const newEnd = val.start;
    if (newEnd <= selectedStart.start) {
      // disallow same-day or before start
      return;
    }
    setSelectedEnd(val);
    emitChange(selectedStart.start, true, newEnd);
    setEndPopoverActive(false);
  };

  /** TOGGLE END DATE */
  const handleToggleEndDate = (checked) => {
    setHasEndDate(checked);
    if (checked && !selectedEnd) {
      const nextDay = new Date(selectedStart.start);
      nextDay.setDate(nextDay.getDate() + 1);
      setSelectedEnd({ start: nextDay, end: nextDay });
      emitChange(selectedStart.start, true, nextDay);
    } else if (!checked) {
      setSelectedEnd(null);
      emitChange(selectedStart.start, false, null);
    }
  };

  // ⛔ Disable the start date itself — user must pick at least the next day
  const disableEndDatesBefore = selectedStart?.start
    ? new Date(
        selectedStart.start.getFullYear(),
        selectedStart.start.getMonth(),
        selectedStart.start.getDate() + 1,
      )
    : new Date();

  return (
    <>
      <Box>
        {/* ---------- START DATE ---------- */}
        <InlineStack gap="400" align="start">
          <Box width="50%">
            <Popover
              active={startPopoverActive}
              activator={
                <div
                  onClick={() => setStartPopoverActive(true)}
                  style={{ cursor: "pointer" }}
                >
                  <TextField
                    label="Start date"
                    prefix={<Icon source={CalendarIcon} tone="base" />}
                    value={formatLocalYMD(selectedStart.start)}
                    readOnly
                  />
                </div>
              }
              onClose={() => setStartPopoverActive(false)}
              preferredAlignment="left"
            >
              <Box padding="400">
                <DatePicker
                  month={month}
                  year={year}
                  onChange={handleStartDateChange}
                  onMonthChange={handleMonthChange}
                  selected={selectedStart}
                />
              </Box>
            </Popover>
          </Box>
        </InlineStack>

        {/* ---------- CHECKBOX ---------- */}
        <Box paddingBlockStart="400">
          <InlineStack align="start" gap="400">
            <Box width="200px" display="flex" justifyContent="flex-start">
              <div style={{ marginLeft: "4px" }}>
                <Checkbox
                  label="Set end date"
                  checked={hasEndDate}
                  onChange={handleToggleEndDate}
                />
              </div>
            </Box>
          </InlineStack>
        </Box>

        {/* ---------- END DATE ---------- */}
        {hasEndDate && (
          <Box paddingBlockStart="400">
            <InlineStack gap="400" align="start">
              <Box width="50%">
                <Popover
                  active={endPopoverActive}
                  activator={
                    <div
                      onClick={() => setEndPopoverActive(true)}
                      style={{ cursor: "pointer" }}
                    >
                      <TextField
                        label="End date"
                        prefix={<Icon source={CalendarIcon} tone="base" />}
                        value={formatLocalYMD(selectedEnd?.start || today)}
                        readOnly
                      />
                    </div>
                  }
                  onClose={() => setEndPopoverActive(false)}
                  preferredAlignment="left"
                >
                  <Box padding="400">
                    <DatePicker
                      month={month}
                      year={year}
                      onChange={handleEndDateChange}
                      onMonthChange={handleMonthChange}
                      selected={selectedEnd || { start: today, end: today }}
                      disableDatesBefore={disableEndDatesBefore}
                    />
                  </Box>
                </Popover>
              </Box>
            </InlineStack>
          </Box>
        )}
      </Box>

      {/* 🖤 Keep text/icons black */}
      <style jsx global>{`
        input.Polaris-TextField__Input {
          color: #000 !important;
        }
        .Polaris-Label__Text {
          color: #000 !important;
        }
        .Polaris-TextField__Prefix svg {
          fill: #000 !important;
        }
      `}</style>
    </>
  );
}
