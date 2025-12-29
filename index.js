import express from "express";
import dotenv from "dotenv";
import {
  SchedulerClient,
  CreateScheduleCommand
} from "@aws-sdk/client-scheduler";

/* =========================
   BOOTSTRAP
========================= */
console.log("🚀 Starting application...");
dotenv.config();
console.log("✅ Environment variables loaded");

const app = express();
app.use(express.json());
console.log("✅ Express initialized");

/* =========================
   AWS SCHEDULER CLIENT
========================= */
console.log("🔧 Initializing AWS Scheduler client...");
const scheduler = new SchedulerClient({
  region: process.env.AWS_REGION
});
console.log("✅ AWS Scheduler client ready");

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", (req, res) => {
  console.log("--------------------------------------------------");
  console.log("🟢 /health endpoint hit");
  console.log("🕒 Time:", new Date().toISOString());
  console.log("📡 Request IP:", req.ip);

  res.json({
    status: "OK",
    time: new Date().toISOString()
  });
});

/* =========================
   API #1 – CREATE SCHEDULE
========================= */
app.post("/publish-event", async (req, res) => {
  console.log("--------------------------------------------------");
  console.log("📥 /publish-event endpoint hit");
  console.log("🕒 Request Time:", new Date().toISOString());
  console.log("📦 Request Body:", req.body);

  try {
    const { eventName, payload, delayMinutes } = req.body;

    console.log("🔍 Validating request payload...");

    if (!eventName || !payload || !delayMinutes) {
      console.log("❌ Validation failed");
      return res.status(400).json({
        message: "eventName, payload and delayMinutes are required"
      });
    }

    console.log("✅ Validation passed");

    /* ---- Calculate execution time ---- */
    console.log("⏱ Calculating execution time...");
    const executeAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    console.log("📅 Event will execute at:", executeAt.toISOString());

    /* ---- Schedule name ---- */
    const scheduleName = `schedule-${Date.now()}`;
    console.log("🆔 Generated schedule name:", scheduleName);

    /* ---- Build scheduler command ---- */
    console.log("🛠 Building CreateScheduleCommand...");
    const command = new CreateScheduleCommand({
      Name: scheduleName,

      ScheduleExpression: `at(${executeAt.toISOString()})`,
      FlexibleTimeWindow: { Mode: "OFF" },

      Target: {
        Arn: process.env.API_DESTINATION_ARN,
        RoleArn: process.env.SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({
          eventName,
          payload,
          executedAt: executeAt.toISOString()
        })
      }
    });

    console.log("📤 Sending schedule creation request to AWS...");

    await scheduler.send(command);

    console.log("✅ Scheduler created successfully");
    console.log("📌 Schedule Name:", scheduleName);

    res.json({
      message: "Event scheduled successfully",
      scheduleName,
      executeAt
    });

  } catch (error) {
    console.log("--------------------------------------------------");
    console.error("❌ ERROR while creating scheduler");
    console.error("🧨 Error message:", error.message);
    console.error("🧾 Full error:", error);

    res.status(500).json({
      message: "Failed to create scheduler",
      error: error.message
    });
  }
});

/* =========================
   API #2 – EVENT RECEIVER
========================= */
app.post("/event-receiver", (req, res) => {
  console.log("--------------------------------------------------");
  console.log("🔥 /event-receiver endpoint HIT 🔥");
  console.log("🕒 Time:", new Date().toISOString());
  console.log("📩 Headers received:");
  console.log(req.headers);

  console.log("📦 Body received:");
  console.log(JSON.stringify(req.body, null, 2));

  const apiKey = req.headers["x-api-key"];
  console.log("🔑 API Key received:", apiKey);

  console.log("✅ API KEY VALID");
  console.log("🎯 Event processed successfully");

  res.json({
    message: "Event processed successfully",
    processedAt: new Date().toISOString()
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("--------------------------------------------------");
  console.log(`🟢 Server started successfully`);
  console.log(`🌍 Listening on port: ${PORT}`);
  console.log(`🕒 Startup time: ${new Date().toISOString()}`);
  console.log("--------------------------------------------------");
});
