import {
  Text,
  InlineStack,
  Box,
  Card,
  Button,
  Badge,
  BlockStack,
  TextField,
} from "@shopify/polaris";
import { PlusIcon, DeleteIcon } from "@shopify/polaris-icons";
import { useCallback, useEffect } from "react";

export default function AnnouncementBarSettings({ value, onChange }) {
  const { messages = [], autoScroll = false } = value || {};

  /* ---------- Handlers ---------- */
  const addMessage = useCallback(() => {
    onChange({
      ...value,
      messages: [...messages, ""],
    });
  }, [messages, value, onChange]);

  const updateMessage = useCallback(
    (index, newValue) => {
      const updated = [...messages];
      updated[index] = newValue;

      onChange({
        ...value,
        messages: updated,
      });
    },
    [messages, value, onChange],
  );

  const removeMessage = useCallback(
    (index) => {
      const updated = messages.filter((_, i) => i !== index);

      onChange({
        ...value,
        messages: updated,
      });
    },
    [messages, value, onChange],
  );

  const toggleAutoScroll = useCallback(() => {
    onChange({
      ...value,
      autoScroll: !autoScroll,
    });
  }, [autoScroll, value, onChange]);

  useEffect(() => {
    if (messages.length <= 1 && autoScroll) {
      onChange({
        ...value,
        autoScroll: false,
      });
    }
  }, [messages.length]);

  const removeEmptyMessages = useCallback(() => {
    const cleaned = messages.filter(
      (m) => typeof m === "string" && m.trim() !== "",
    );

    if (cleaned.length !== messages.length) {
      onChange({
        ...value,
        messages: cleaned,
      });
    }
  }, [messages, value, onChange]);

  const canEnableAutoScroll = messages.length > 1;

  const badgeTone = autoScroll ? "success" : "critical";

  return (
    <BlockStack gap="400">
      {/* Auto scroll toggle */}
      <InlineStack align="space-between" blockAlign="start">
        <BlockStack gap="100">
          <InlineStack gap="200" align="start">
            <Text variant="bodyMd" fontWeight="semibold">
              Auto scrolling
            </Text>
            <Badge tone={badgeTone}>{autoScroll ? "On" : "Off"}</Badge>
          </InlineStack>

          {/* Helper text */}
          {/* Helper text – only when invalid */}
          {!canEnableAutoScroll && (
            <Text variant="bodySm" tone="subdued">
              Add at least 2 messages to enable auto scrolling.
            </Text>
          )}
          {/* <Text variant="bodySm" tone="subdued">
            {autoScroll
              ? "Messages will scroll automatically."
              : "Add at least 2 messages to enable auto scrolling."}
          </Text> */}
        </BlockStack>

        <Button
          role="switch"
          ariaChecked={autoScroll ? "true" : "false"}
          size="slim"
          disabled={!canEnableAutoScroll}
          onClick={toggleAutoScroll}
        >
          {autoScroll ? "Turn off" : "Turn on"}
        </Button>
      </InlineStack>

      {/* Messages */}
      <BlockStack gap="300">
        {messages.map((msg, index) => (
          <InlineStack key={index} gap="200" wrap={false} align="center">
            <Box width="100%">
              <TextField
                label={`Message ${index + 1}`}
                labelHidden
                value={msg}
                placeholder="Announcement text"
                onChange={(v) => updateMessage(index, v)}
                onBlur={removeEmptyMessages} // ✅ AUTO REMOVE EMPTY
                autoComplete="off"
              />
            </Box>

            <Button
              icon={DeleteIcon}
              variant="plain"
              tone="critical"
              accessibilityLabel="Remove message"
              onClick={() => removeMessage(index)}
            />
          </InlineStack>
        ))}

        <Button icon={PlusIcon} variant="plain" onClick={addMessage}>
          Add message
        </Button>
      </BlockStack>
    </BlockStack>
  );
}
