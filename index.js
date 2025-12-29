require("dotenv").config();
const express = require("express");
const { SchedulerClient, CreateScheduleCommand } = require("@aws-sdk/client-scheduler");

const app = express();
app.use(express.json());

const schedulerClient = new SchedulerClient({
  region: process.env.AWS_REGION
});

/* ===============================
   1️⃣ HEALTH
================================ */
app.get("/health", (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /health`);
  res.json({ status: "OK" });
});

/* ===============================
   2️⃣ CREATE SCHEDULE FROM API
================================ */
app.post("/publish-event", async (req, res) => {
  const { eventName, payload } = req.body;
  const executeAt = new Date(Date.now() + 3 * 60 * 1000);

  if (!executeAt || !eventName) {
    return res.status(400).json({
      message: "executeAt and eventName are required"
    });
  }

  const scheduleName = `schedule-${Date.now()}`;

  console.log("📅 Execute At:", executeAt);
  console.log("🧾 Payload:", payload);

  try {
    const command = new CreateScheduleCommand({
      Name: scheduleName,
      ScheduleExpression: `at(${new Date(executeAt).toISOString()})`,
      FlexibleTimeWindow: { Mode: "OFF" },

      Target: {
        Arn: process.env.EVENT_RECEIVER_URL,
        RoleArn: process.env.SCHEDULER_ROLE_ARN,

        HttpParameters: {
          HeaderParameters: {
            "x-api-key": "my-secret-key-123",
            "Content-Type": "application/json"
          }
        },

        Input: JSON.stringify({
          eventName,
          payload,
          executeAt
        })
      },
      ActionAfterCompletion: "DELETE" // 🔥 auto cleanup
    });

    await schedulerClient.send(command);

    console.log("✅ Scheduler created:", scheduleName);

    res.json({
      message: "Event scheduled successfully",
      scheduleName,
      executeAt
    });

  } catch (err) {
    console.error("❌ Scheduler error:", err);
    res.status(500).json({
      message: "Failed to create scheduler",
      error: err.message
    });
  }
});

/* ===============================
   3️⃣ EVENT RECEIVER
================================ */
app.post("/event-receiver", (req, res) => {
  console.log("🔥 EVENT RECEIVED 🔥");
  console.log("Time:", new Date().toISOString());
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("headers:", JSON.stringify(req.headers, null, 2));
  const apiKey = req.headers["x-api-key"];
  console.log("apiKey:", apiKey);

  res.status(200).json({
    message: "Event received",
    receivedAt: new Date().toISOString()
  });
});

/* ===============================
   SERVER
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});
