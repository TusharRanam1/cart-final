import { useState, useEffect } from "react";
import {
  BlockStack,
  ChoiceList,
  Text,
  InlineGrid,
  Select,
} from "@shopify/polaris";

import Colabssiblecom from "./Colabssiblecom";
import EndDateAndTime from "./EndDateAndTime";
import { ClockIcon } from "@shopify/polaris-icons";
import HelpHeader from "./HelpHeader";

export default function ScarcityTimer({ value, onChange, title, helpText }) {
  // -----------------------
  // INTERNAL STATE
  // -----------------------
  const [timerMode, setTimerMode] = useState("duration");
  const [duration, setDuration] = useState({
    hours: "0",
    minutes: "5",
    seconds: "0",
  });
  const [activeDates, setActiveDates] = useState({
    date: null,
    time: "11:00 PM",
  });

  // -----------------------
  // 🔁 HYDRATE FROM PARENT
  // -----------------------
  useEffect(() => {
    if (!value) return;

    if (value.timerMode) setTimerMode(value.timerMode);
    if (value.duration) setDuration(value.duration);
    if (value.activeDates) setActiveDates(value.activeDates);
  }, [value]);

  // -----------------------
  // EMIT CHANGE
  // -----------------------
  const emitChange = (override = {}) => {
    onChange?.({
      timerMode,
      duration,
      activeDates,
      ...override,
    });
  };

  // options
  const hourOptions = [...Array(25)].map((_, i) => ({
    label: `${i} hours`,
    value: `${i}`,
  }));

  const minuteOptions = [...Array(60)].map((_, i) => ({
    label: `${i} minutes`,
    value: `${i}`,
  }));

  const secondOptions = [...Array(60)].map((_, i) => ({
    label: `${i} seconds`,
    value: `${i}`,
  }));

  return (
    <Colabssiblecom
      title="Scarcity Timer"
      description="Choose how the timer behaves."
      icon={ClockIcon}
    >
      <HelpHeader title={title} helpText={helpText} />

      <BlockStack gap="100">
        {/* TIMER MODE */}
        <ChoiceList
          choices={[
            {
              label: (
                <div>
                  <strong>Timer for a specified duration</strong>
                  <div style={{ fontSize: 13, color: "#616161" }}>
                    Timer starts when the first product is added.
                  </div>
                </div>
              ),
              value: "duration",
            },
            {
              label: (
                <div>
                  <strong>Countdown to a specific date & time</strong>
                  <div style={{ fontSize: 13, color: "#616161" }}>
                    Timer counts down to a date.
                  </div>
                </div>
              ),
              value: "specific",
            },
          ]}
          selected={[timerMode]}
          onChange={(val) => {
            const mode = val[0];
            setTimerMode(mode);
            emitChange({ timerMode: mode });
          }}
        />

        {/* DURATION MODE */}
        {timerMode === "duration" && (
          <>
            <Text variant="headingSm" fontWeight="bold">
              Duration Settings
            </Text>

            <InlineGrid columns={3} gap="300">
              <Select
                label="Hours"
                options={hourOptions}
                value={duration.hours}
                onChange={(v) => {
                  const updated = { ...duration, hours: v };
                  setDuration(updated);
                  emitChange({ duration: updated });
                }}
              />

              <Select
                label="Minutes"
                options={minuteOptions}
                value={duration.minutes}
                onChange={(v) => {
                  const updated = { ...duration, minutes: v };
                  setDuration(updated);
                  emitChange({ duration: updated });
                }}
              />

              <Select
                label="Seconds"
                options={secondOptions}
                value={duration.seconds}
                onChange={(v) => {
                  const updated = { ...duration, seconds: v };
                  setDuration(updated);
                  emitChange({ duration: updated });
                }}
              />
            </InlineGrid>
          </>
        )}

        {/* SPECIFIC DATE MODE */}
        {timerMode === "specific" && (
          <EndDateAndTime
            value={activeDates}
            onChange={(updated) => {
              setActiveDates(updated);
              emitChange({ activeDates: updated });
            }}
          />
        )}
      </BlockStack>
    </Colabssiblecom>
  );
}
