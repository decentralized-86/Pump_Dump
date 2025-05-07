const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  WEBAPP_URL: process.env.WEBAPP_URL,
  AUTH_KEY: process.env.AUTH_KEY,
  JWT_KEY_ID: process.env.JWT_KEY_ID,
  JWT_SECRET: process.env.JWT_SECRET,
  MONGO_URL: process.env.MONGO_URL,
  HOST_PORT: process.env.HOST_PORT,
};
