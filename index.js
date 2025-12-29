const express = require("express");
const app = express();

app.use(express.json());

/**
 * API 1: Health check
 * GET /health
 */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date().toISOString()
  });
});

/**
 * API 2: Send event with time payload
 * POST /event
 */
app.post("/event", (req, res) => {
  const { eventName, eventTime } = req.body;

  if (!eventName || !eventTime) {
    return res.status(400).json({
      message: "eventName and eventTime are required"
    });
  }

  res.json({
    message: "Event received successfully",
    data: {
      eventName,
      eventTime
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
