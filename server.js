require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const {startListener } = require('./services/walletListener');

// Import models first
require('./models');

const { scheduleGlobalDayReset, schedulePeriodicCheck } = require('./cron/globalDayReset');
const gameRoutes = require('./routes/game');
const publicRoutes = require('./routes/public');
const walletRoutes = require('./routes/wallet')
const authMiddleware = require('./middlewares/auth');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./services/logger');
const config = require('./config');
const telegramService = require('./services/telegram');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/public', publicRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/wallet', walletRoutes)

// Error handling
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    logger.info('Connected to MongoDB');
    console.log('Mongo connected, HOST_PORT:', process.env.HOST_PORT);

    console.log('Scheduling cron jobs...');
    scheduleGlobalDayReset();
    schedulePeriodicCheck();
    logger.info('Global day cron jobs initialized');

    console.log('Starting Telegram bot...');
    telegramService.startBot();
    logger.info('Telegram bot started');

    startListener()

    const PORT = process.env.HOST_PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error(error);  // Also print error to console
    process.exit(1);
  }
};

startServer();
