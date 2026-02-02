import {
  Page,
  Card,
  Box,
  BlockStack,
  InlineGrid,
  Select,
  InlineStack,
  Text,
  Button,
  Badge,
  Banner,
} from "@shopify/polaris";
import { useState, useEffect, useMemo } from "react";
import { SaveBar, useAppBridge } from "@shopify/app-bridge-react";

import TimerMessageField from "./components/TimerMessageField";
import Colabssiblecom from "./components/Colabssiblecom";
import {
  CircleLeftIcon,
  CircleRightIcon,
  ArrowLeftIcon,
  CalendarTimeIcon,
} from "@shopify/polaris-icons";

import ScarcityTimer from "./components/ScarcityTimer";
import AfterTimerActions from "./components/AfterTimerActions";
import TimerDateAndTime from "./components/TimerDateAndTime";

export default function ResourceDetailsLayout() {
  const shopify = useAppBridge();

  /* --------------------------------------------------
     STATE
  -------------------------------------------------- */
  const [timerConfig, setTimerConfig] = useState({
    timerMode: "duration",
    duration: { hours: "0", minutes: "5", seconds: "0" },
  });

  const [timerText, setTimerText] = useState("Hurry! Offer ends soon!");
  const [expiredMessage, setExpiredMessage] = useState(
    "This offer has expired.",
  );
  const [afterAction, setAfterAction] = useState("refresh");
  const [status, setStatus] = useState("draft");

  const todayISO = new Date().toISOString().split("T")[0];

  const [activeDates, setActiveDates] = useState({
    start: { date: todayISO, time: "09:00 AM" },
    end: { date: null, time: "11:00 PM" },
    hasEndDate: false,
  });

  /* --------------------------------------------------
     SNAPSHOT SYSTEM (🔥 IMPORTANT)
  -------------------------------------------------- */
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  const currentSnapshot = useMemo(
    () => ({
      timerConfig,
      timerText,
      expiredMessage,
      afterAction,
      status,
      activeDates,
    }),
    [timerConfig, timerText, expiredMessage, afterAction, status, activeDates],
  );

  const isDirty =
    initialSnapshot &&
    JSON.stringify(currentSnapshot) !== JSON.stringify(initialSnapshot);

  /* --------------------------------------------------
     LOAD SAVED DATA
  -------------------------------------------------- */
  useEffect(() => {
    const loadTimerSettings = async () => {
      try {
        const res = await fetch("/api/get-timer");
        const data = await res.json();

        if (data.ok && data.data) {
          const snapshot = {
            timerConfig: data.data.timerConfig,
            timerText: data.data.timerText,
            expiredMessage: data.data.expiredMessage,
            afterAction: data.data.afterAction,
            status: data.data.status,
            activeDates: data.data.activeDates,
          };

          setTimerConfig(snapshot.timerConfig);
          setTimerText(snapshot.timerText);
          setExpiredMessage(snapshot.expiredMessage);
          setAfterAction(snapshot.afterAction);
          setStatus(snapshot.status);
          setActiveDates(snapshot.activeDates);

          setInitialSnapshot(snapshot);
        } else {
          // 🔑 IMPORTANT: baseline = defaults
          setInitialSnapshot({
            timerConfig,
            timerText,
            expiredMessage,
            afterAction,
            status,
            activeDates,
          });
        }
      } catch (err) {
        console.error("🔥 LOAD ERROR:", err);
      }
    };

    loadTimerSettings();
  }, []);

  /* --------------------------------------------------
     NORMALIZE DATES
  -------------------------------------------------- */
  const normalizeDates = (dates) => ({
    start: {
      date: dates.start.date ? dates.start.date.toString().split("T")[0] : null,
      time: dates.start.time,
    },
    end: {
      date: dates.end.date ? dates.end.date.toString().split("T")[0] : null,
      time: dates.end.time,
    },
    hasEndDate: dates.hasEndDate,
  });

  /* --------------------------------------------------
     SAVE
  -------------------------------------------------- */
  const handleSave = async () => {
    const payload = {
      ...currentSnapshot,
      activeDates: normalizeDates(activeDates),
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/save-timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.ok) {
        setInitialSnapshot(currentSnapshot);
        shopify?.saveBar?.hide("timer-save-bar");
      } else {
        alert("❌ Failed to save");
      }
    } catch (err) {
      console.error("🔥 SAVE ERROR:", err);
    }
  };

  /* --------------------------------------------------
     DISCARD (NO CONFIRM)
  -------------------------------------------------- */
  const handleDiscard = () => {
    if (!initialSnapshot) return;

    setTimerConfig(initialSnapshot.timerConfig);
    setTimerText(initialSnapshot.timerText);
    setExpiredMessage(initialSnapshot.expiredMessage);
    setAfterAction(initialSnapshot.afterAction);
    setStatus(initialSnapshot.status);
    setActiveDates(initialSnapshot.activeDates);

    shopify?.saveBar?.hide("timer-save-bar");
  };

  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Draft", value: "draft" },
  ];

  /* --------------------------------------------------
     UI
  -------------------------------------------------- */
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
              Scarcity Timer
            </Text>
            {status === "draft" ? (
              <Badge tone="info">Draft</Badge>
            ) : (
              <Badge tone="success">Active</Badge>
            )}
          </InlineStack>
        }
      >
        <Box paddingBlockEnd="600">
          <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400">
            <BlockStack gap="400">
              <ScarcityTimer value={timerConfig} onChange={setTimerConfig} />

              <Colabssiblecom
                title="Before timer expires"
                icon={CircleLeftIcon}
              >
                <TimerMessageField
                  title="Timer Message"
                  value={timerText}
                  onChange={setTimerText}
                />
              </Colabssiblecom>

              <Colabssiblecom
                title="After timer expires"
                icon={CircleRightIcon}
              >
                <TimerMessageField
                  title="Expired Message"
                  value={expiredMessage}
                  onChange={setExpiredMessage}
                />

                <AfterTimerActions
                  title="After Timer Action"
                  value={afterAction}
                  onChange={setAfterAction}
                />
              </Colabssiblecom>

              <Colabssiblecom title="Active dates" icon={CalendarTimeIcon}>
                <TimerDateAndTime
                  value={activeDates}
                  onChange={setActiveDates}
                />
              </Colabssiblecom>
            </BlockStack>

            <BlockStack>
              {status == "active" ? (
                <Card>
                  <Box padding="400">
                    <Select
                      label="Status"
                      options={statusOptions}
                      value={status}
                      onChange={setStatus}
                    />
                  </Box>
                </Card>
              ) : (
                <Banner title="This timer is currently paused" tone="warning">
                  <Box padding="400">
                    <Select
                      label="Status"
                      options={statusOptions}
                      value={status}
                      onChange={setStatus}
                    />
                  </Box>
                </Banner>
              )}
            </BlockStack>
          </InlineGrid>
        </Box>
      </Page>

      {/* ✅ SHOPIFY SAVE BAR */}
      <SaveBar id="timer-save-bar" open={Boolean(isDirty)}>
        <button variant="primary" onClick={handleSave}>
          Save
        </button>
        <button onClick={handleDiscard}>Discard</button>
      </SaveBar>
    </>
  );
}
