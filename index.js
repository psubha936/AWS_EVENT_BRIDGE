require("dotenv").config(); // Load .env
const express = require("express");
const { EventBridgeClient, PutEventsCommand } = require("@aws-sdk/client-eventbridge");

const app = express();
app.use(express.json());

/* ---------- AWS EventBridge Client ---------- */
const eventBridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION
});

/* =====================================================
   1️⃣ Health Check API
===================================================== */
app.get("/health", (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /health hit`);
  res.json({
    status: "OK",
    service: "event-bridge-demo",
    time: new Date().toISOString()
  });
});

/* =====================================================
   2️⃣ Publish Event to EventBridge
   - Adds 2 minutes to event time
   - Logs everything
   - Checks AWS connection when called
===================================================== */
app.post("/publish-event", async (req, res) => {
  const { eventName, payload } = req.body;

  const eventTime = new Date(Date.now() + 2 * 60 * 1000); // +2 minutes
  console.log(`[${new Date().toISOString()}] POST /publish-event hit`);
  console.log("Event Name:", eventName);
  console.log("Payload:", payload);
  console.log("Event Time (will be sent to EventBridge):", eventTime.toISOString());

  if (!eventName) {
    return res.status(400).json({ message: "eventName is required" });
  }

  try {
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: "custom.node.publisher",
          DetailType: eventName,
          EventBusName: "my-event-bus",
          Time: eventTime,
          Detail: JSON.stringify({ eventName, eventTime: eventTime.toISOString(), payload })
        }
      ]
    });

    const response = await eventBridgeClient.send(command);

    console.log(`[${new Date().toISOString()}] ✅ EventBridge publish success`);
    console.log("EventBridge response:", response);

    res.json({
      message: "Event published successfully",
      eventBridgeResponse: response
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ AWS EventBridge connection failed:`, error.message);
    res.status(500).json({ message: "Failed to publish event", error: error.message });
  }
});

/* =====================================================
   3️⃣ Event Receiver (API Destination Target)
===================================================== */
app.post("/event-receiver", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  console.log(`[${new Date().toISOString()}] POST /event-receiver hit`);
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("❌ Invalid API Key:", apiKey);

  console.log("🔥 Event received from EventBridge successfully 🔥");

  res.status(200).json({
    message: "Event received successfully",
    receivedAt: new Date().toISOString()
  });
});

/* ---------- Server ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT} at ${new Date().toISOString()}`);
});
