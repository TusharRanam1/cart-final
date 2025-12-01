import { useState, useEffect } from "react";
import { Card, TextField, Select, Box } from "@shopify/polaris";

export default function CampaignStatusCard({
  initialStatus = "draft",
  initialName = "",
  onChange = () => {},
}) {
  const [status, setStatus] = useState(initialStatus);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

  // STATUS OPTIONS
  const statusOptions = [
    { label: "Draft", value: "draft" },
    { label: "Active", value: "active" },
  ];

  // VALIDATION
  const validateName = (value) => {
    if (!value || value.trim().length < 3) {
      setError("Enter a campaign name (at least 3 characters).");
      return false;
    }
    setError("");
    return true;
  };

  // INPUT HANDLERS
  const handleNameChange = (val) => {
    setName(val);
    validateName(val);

    onChange({
      status,
      name: val,
      isValid: validateName(val),
    });
  };

  const handleStatusChange = (val) => {
    setStatus(val);

    onChange({
      status: val,
      name,
      isValid: validateName(name),
    });
  };

  // INITIAL UPDATE
  useEffect(() => {
    onChange({
      status,
      name,
      isValid: validateName(name),
    });
  }, []);

  return (
    <Card>
      <Box padding="400">
        <Select
          label="Status"
          options={statusOptions}
          value={status}
          onChange={handleStatusChange}
        />

        <Box paddingBlockStart="400">
          <TextField
            label="Campaign Name"
            value={name}
            onChange={handleNameChange}
            error={error}
          />
        </Box>
      </Box>
    </Card>
  );
}
