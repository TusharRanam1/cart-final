import { useState, useCallback, useEffect } from "react";
import {
  Card,
  Text,
  Box,
  Checkbox,
  TextField,
  DatePicker,
  InlineStack,
  Icon,
  Popover,
  Scrollable,
} from "@shopify/polaris";
import { ClockIcon, CalendarIcon } from "@shopify/polaris-icons";

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

/** Compare AM/PM times */
function isTimeAfter(start, end) {
  const toMinutes = (t) => {
    const match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(t);
    if (!match) return 0;
    let [, h, m, ap] = match;
    h = parseInt(h, 10);
    m = parseInt(m, 10);
    if (ap.toUpperCase() === "PM" && h !== 12) h += 12;
    if (ap.toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  return toMinutes(end) > toMinutes(start);
}

/** Helpers to convert hour/minute/period <-> minutes since midnight */
function tripleToMinutes(h, m, p) {
  let hour24 = h;
  if (p === "PM" && h !== 12) hour24 = h + 12;
  if (p === "AM" && h === 12) hour24 = 0;
  return hour24 * 60 + m;
}
function timeStringToMinutes(t) {
  const match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(t || "");
  if (!match) return null;
  let [, h, m, ap] = match;
  return tripleToMinutes(parseInt(h, 10), parseInt(m, 10), ap.toUpperCase());
}

/** ⏰ Advanced Time Picker — Hours, Minutes, AM/PM
 *  - Can gray out & block times before/after thresholds using disabledBefore / disabledAfter (minutes since midnight)
 */
function TimePickerField({
  label,
  value,
  onChange,
  error,
  disabledBefore = null,
  disabledAfter = null,
}) {
  const [popoverActive, setPopoverActive] = useState(false);

  const parseTime = (val) => {
    const match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(val || "");
    if (match) {
      const [, h, m, ap] = match;
      return {
        hour: parseInt(h, 10),
        minute: parseInt(m, 10),
        period: ap.toUpperCase(),
      };
    }
    return { hour: 9, minute: 0, period: "AM" };
  };

  const { hour, minute, period } = parseTime(value);
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ["AM", "PM"];

  const isDisabled = (h, m, p) => {
    const total = tripleToMinutes(h, m, p);
    if (disabledBefore != null && total < disabledBefore) return true;
    if (disabledAfter != null && total > disabledAfter) return true;
    return false;
  };

  const handleSelect = (h, m, p) => {
    if (isDisabled(h, m, p)) return; // block invalid
    const formatted = `${String(h)}:${String(m).padStart(2, "0")} ${p}`;
    onChange(formatted);
    setPopoverActive(false);
  };

  const optionStyle = (selected, disabled) => ({
    padding: "6px",
    textAlign: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: "6px",
    background: selected ? "#000" : "transparent",
    color: disabled ? "#bbb" : selected ? "#fff" : "#000",
    fontWeight: selected ? "600" : "normal",
    transition: "all 0.15s ease",
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <Popover
      active={popoverActive}
      autofocusTarget="none"
      preferredAlignment="left"
      activator={
        <div
          onClick={() => setPopoverActive(true)}
          style={{ cursor: "pointer" }}
        >
          <TextField
            label={label}
            value={value}
            prefix={<Icon source={ClockIcon} tone="base" />}
            readOnly
            error={error}
          />
        </div>
      }
      onClose={() => setPopoverActive(false)}
    >
      <Box padding="300">
        <InlineStack gap="200" align="center" blockAlign="center">
          {/* Hours */}
          <Scrollable shadow style={{ height: "180px", width: "60px" }}>
            {hours.map((h) => {
              const disabled = isDisabled(h, minute, period);
              const selected = h === hour;
              return (
                <div
                  key={`h-${h}`}
                  onClick={() => !disabled && handleSelect(h, minute, period)}
                  style={optionStyle(selected, disabled)}
                >
                  {h}
                </div>
              );
            })}
          </Scrollable>

          {/* Minutes */}
          <Scrollable shadow style={{ height: "180px", width: "60px" }}>
            {minutes.map((m) => {
              const disabled = isDisabled(hour, m, period);
              const selected = m === minute;
              return (
                <div
                  key={`m-${m}`}
                  onClick={() => !disabled && handleSelect(hour, m, period)}
                  style={optionStyle(selected, disabled)}
                >
                  {String(m).padStart(2, "0")}
                </div>
              );
            })}
          </Scrollable>

          {/* AM/PM */}
          <Scrollable shadow style={{ height: "180px", width: "60px" }}>
            {periods.map((p) => {
              const disabled = isDisabled(hour, minute, p);
              const selected = p === period;
              return (
                <div
                  key={`p-${p}`}
                  onClick={() => !disabled && handleSelect(hour, minute, p)}
                  style={optionStyle(selected, disabled)}
                >
                  {p}
                </div>
              );
            })}
          </Scrollable>
        </InlineStack>
      </Box>
    </Popover>
  );
}

export default function TimerDateAndTime({ value, onChange }) {
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
  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("11:00 PM");
  const [hasEndDate, setHasEndDate] = useState(false);

  const [startPopoverActive, setStartPopoverActive] = useState(false);
  const [endPopoverActive, setEndPopoverActive] = useState(false);

  // Inline error states (times)
  const [startTimeError, setStartTimeError] = useState("");
  const [endTimeError, setEndTimeError] = useState("");

  /** Hydrate from props (edit mode) */
  useEffect(() => {
    if (value?.start?.date) {
      const sd = parseStoredDate(value.start.date);
      if (sd) {
        setSelectedStart({ start: sd, end: sd });
        setDate({ month: sd.getMonth(), year: sd.getFullYear() });
      }
      setStartTime(value.start.time || "09:00 AM");
    }
    if (value?.hasEndDate && value?.end?.date) {
      const ed = parseStoredDate(value.end.date);
      if (ed) setSelectedEnd({ start: ed, end: ed });
      setEndTime(value.end.time || "11:00 PM");
      setHasEndDate(true);
    } else {
      setSelectedEnd(null);
      setHasEndDate(false);
    }
  }, [value]);

  /** Emit to parent */
  const emitChange = useCallback(
    (startObj, sTime, endFlag, endObj, eTime) => {
      onChange?.({
        start: {
          date: startObj ? formatLocalYMD(startObj) : null,
          time: sTime || null,
        },
        end: endFlag
          ? {
              date: endObj ? formatLocalYMD(endObj) : null,
              time: eTime || null,
            }
          : null,
        hasEndDate: endFlag,
      });
    },
    [onChange],
  );

  const handleMonthChange = useCallback(
    (m, y) => setDate({ month: m, year: y }),
    [],
  );

  /** START DATE — keep end >= start */
  const handleStartDateChange = (val) => {
    const newStart = val.start;
    setSelectedStart(val);
    if (selectedEnd?.start && newStart > selectedEnd.start) {
      setSelectedEnd({ start: newStart, end: newStart });
    }
    emitChange(
      newStart,
      startTime,
      hasEndDate,
      selectedEnd?.start || newStart,
      endTime,
    );
    setStartPopoverActive(false);
  };

  /** END DATE — keep start <= end */
  const handleEndDateChange = (val) => {
    const newEnd = val.start;
    if (newEnd < selectedStart.start) {
      setSelectedStart({ start: newEnd, end: newEnd });
    }
    setSelectedEnd(val);
    emitChange(selectedStart.start, startTime, true, newEnd, endTime);
    setEndPopoverActive(false);
  };

  /** Toggle end date */
  const handleToggleEndDate = (checked) => {
    setHasEndDate(checked);
    if (checked && !selectedEnd) {
      const newEnd = { start: selectedStart.start, end: selectedStart.start };
      setSelectedEnd(newEnd);
      emitChange(selectedStart.start, startTime, true, newEnd.start, endTime);
    } else if (!checked) {
      setSelectedEnd(null);
      emitChange(selectedStart.start, startTime, false, null, null);
    }
  };

  /** Time changes (validate only if same day) */
  const handleStartTimeChange = (val) => {
    if (
      hasEndDate &&
      selectedEnd?.start &&
      formatLocalYMD(selectedStart.start) ===
        formatLocalYMD(selectedEnd.start) &&
      !isTimeAfter(val, endTime)
    ) {
      setStartTimeError("Start time must be earlier than end time.");
      return;
    }
    setStartTimeError("");
    setStartTime(val);
    emitChange(
      selectedStart.start,
      val,
      hasEndDate,
      selectedEnd?.start,
      endTime,
    );
  };

  const handleEndTimeChange = (val) => {
    if (
      selectedEnd?.start &&
      formatLocalYMD(selectedStart.start) ===
        formatLocalYMD(selectedEnd.start) &&
      !isTimeAfter(startTime, val)
    ) {
      setEndTimeError("End time must be later than start time.");
      return;
    }
    setEndTimeError("");
    setEndTime(val);
    emitChange(selectedStart.start, startTime, true, selectedEnd?.start, val);
  };

  /** Calendar disabling (end cannot be < start; no past dates allowed) */
  const disableEndDatesBefore = selectedStart?.start
    ? new Date(
        Math.max(
          new Date().setHours(0, 0, 0, 0),
          new Date(selectedStart.start).setHours(0, 0, 0, 0),
        ),
      )
    : new Date();

  const disableStartDatesAfter = selectedEnd?.start || null;

  /** Time disabling (gray + block invalid options) */
  const sameDay =
    hasEndDate &&
    selectedEnd?.start &&
    formatLocalYMD(selectedStart.start) === formatLocalYMD(selectedEnd.start);

  const endDisabledBefore = sameDay
    ? (timeStringToMinutes(startTime) ?? null)
    : null;
  const startDisabledAfter = sameDay
    ? (timeStringToMinutes(endTime) ?? null)
    : null;

  // convert "after" threshold to inclusive upper bound; we’ll treat it as “> disabledAfter is blocked”
  // so we pass disabledAfter minus 1 minute to allow equality when needed
  const startDisabledAfterInclusive =
    startDisabledAfter != null ? startDisabledAfter - 1 : null;

  return (
    <>
      <Box />
      {/* <Text variant="headingSm" fontWeight="bold">
          Active dates
        </Text> */}

      <Box>
        {/* ---------- START DATE & TIME ---------- */}
        <InlineStack gap="400" align="center" wrap={false}>
          <Box width="50%">
            <Popover
              active={startPopoverActive}
              activator={
                <div
                  onClick={() => setStartPopoverActive(true)}
                  style={{ cursor: "pointer" }}
                >
                  <TextField
                    label={
                      <span style={{ fontWeight: 600, color: "#000" }}>
                        Start date
                      </span>
                    }
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
                  disableDatesAfter={disableStartDatesAfter}
                />
              </Box>
            </Popover>
          </Box>

          <Box width="50%">
            <TimePickerField
              label={
                <span style={{ fontWeight: 600, color: "#000" }}>
                  Start time
                </span>
              }
              value={startTime}
              error={startTimeError}
              disabledAfter={startDisabledAfterInclusive} // gray-out times >= end time when same day
              onChange={handleStartTimeChange}
            />
          </Box>
        </InlineStack>

        {/* ---------- CHECKBOX (aligned under Start date) ---------- */}
        <Box paddingBlockStart="400">
          <InlineStack align="start" gap="400">
            <Box width="200px" display="flex" justifyContent="flex-start">
              <div style={{ marginLeft: "4px" }}>
                <Checkbox
                  label={
                    <span style={{ fontWeight: 600, color: "#000" }}>
                      Set end date
                    </span>
                  }
                  checked={hasEndDate}
                  onChange={handleToggleEndDate}
                />
              </div>
            </Box>
            <Box width="200px" />
          </InlineStack>
        </Box>

        {/* ---------- END DATE & TIME ---------- */}
        {hasEndDate && (
          <Box paddingBlockStart="400">
            <InlineStack gap="400" align="center" wrap={false}>
              <Box width="50%">
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

              <Box width="50%">
                <TimePickerField
                  label={
                    <span style={{ fontWeight: 600, color: "#000" }}>
                      End time
                    </span>
                  }
                  value={endTime}
                  error={endTimeError}
                  disabledBefore={endDisabledBefore} // gray-out times < start time when same day
                  onChange={handleEndTimeChange}
                />
              </Box>
            </InlineStack>
          </Box>
        )}
      </Box>

      <style jsx global>{`
        /* Make all Polaris input text black */
        input.Polaris-TextField__Input {
          color: #000 !important;
        }

        /* Make all labels black */
        .Polaris-Label__Text {
          color: #000 !important;
          font-weight: 600 !important;
        }

        /* Make prefix icons (calendar + clock) black */
        .Polaris-TextField__Prefix svg {
          fill: #000 !important;
        }

        /* TimePicker popover text (hours/minutes/AMPM) */
        .timepicker-item {
          color: #000 !important;
        }

        /* When selected in TimePicker */
        .timepicker-item.selected {
          background: #000 !important;
          color: #fff !important;
        }
      `}</style>
    </>
  );
}
