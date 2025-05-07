const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const logger = require("./services/logger.js");
const game = require("./routes/game.js");
const public = require("./routes/public.js");
const { registerMetrics, metricsMiddleware } = require("./metrics.js");
// const bot = require("./bot");
const { authenticateToken } = require("./utils/gen.js");
const { MONGO_URL, HOST_PORT } = require("./config.js");
const cors = require("cors");
const { authBean } = require("./services/bean.js");
const { updateBoost } = require("./utils/calc.js");

const app = express();

app.use(cors());
app.use(bodyParser.json());

mongoose
  .connect(MONGO_URL || "mongodb://localhost:27017/pumpshie")
  .then(() => {
    logger.info("Connected to MongoDB");

    (async function () {
      await updateBoost();
      setInterval(async () => {
        await updateBoost();
      }, 1000 * 60 * 60 * 2);
    })();

    // bot
    //   .launch()
    //   .then(() => {
    //     logger.info(`Bot is running`);
    //   })
    //   .catch((error) => {
    //     logger.error(`Failed to launch bot: ${error}`);
    //   });
  })
  .catch((error) => {
    logger.error(`MongoDB connection error: ${error}`);
  });

// Middleware for logging and metrics
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use(metricsMiddleware);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Use routes
app.use("/api/game", [authenticateToken, authBean], game);
app.use("/api/public", public);
app.get("/test", (req, res) => {
  res.json({ message: "Connection successful. Server is running!" });
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", registerMetrics.contentType);
  res.end(await registerMetrics.metrics());
});

// Start the server
const PORT = HOST_PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.once("SIGINT", () => {
  logger.info("Received SIGINT. Stopping the bot and server...");
  server.close(() => {
    //    bot.stop("SIGINT");
    logger.info("Server stopped gracefully");
    process.exit(0);
  });
});

process.once("SIGTERM", () => {
  logger.info("Received SIGTERM. Stopping the bot and server...");
  server.close(() => {
    //    bot.stop("SIGTERM");
    logger.info("Server stopped gracefully");
    process.exit(0);
  });
});
