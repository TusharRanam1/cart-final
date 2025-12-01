const express = require("express");
const bodyParser = require("body-parser");

const app = express();

// Parse JSON
app.use(bodyParser.json());

// Webhook endpoint
app.post("/inventory-update", (req, res) => {
  console.log("Webhook Received!");
  console.log(req.body); // Full inventory payload

  res.status(200).send("OK");
});

// Start server
app.listen(3000, () => {
  console.log("Webhook server running on port 3000");
});
