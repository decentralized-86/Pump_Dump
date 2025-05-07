const bot = require("./bot");
const { MONGO_URL } = require("./config");
const logger = require("./services/logger");
const mongoose = require("mongoose");

mongoose
  .connect(MONGO_URL || "mongodb://localhost:27017/pumpshie")
  .then(() => {
    logger.info("Connected to MongoDB");
    bot
      .launch()
      .then(() => {
        logger.info(`Bot is running`);
      })
      .catch((error) => {
        logger.error(`Failed to launch bot: ${error}`);
      });
  })
  .catch((error) => {
    logger.error(`MongoDB connection error: ${error}`);
  });

// Graceful shutdown
process.once("SIGINT", () => {
  logger.info("Received SIGINT. Stopping the bot and server...");
  bot.stop("SIGINT");
  logger.info("Server stopped gracefully");
  process.exit(0);
});

process.once("SIGTERM", () => {
  logger.info("Received SIGTERM. Stopping the bot and server...");
  bot.stop("SIGTERM");
  logger.info("Server stopped gracefully");
  process.exit(0);
});
