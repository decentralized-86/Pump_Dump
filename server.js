require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Import models first
require('./models');

const { scheduleGlobalDayReset, schedulePeriodicCheck } = require('./cron/globalDayReset');
const gameRoutes = require('./routes/game');
const publicRoutes = require('./routes/public');
const authMiddleware = require('./middlewares/auth');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./services/logger');
const config = require('./config');
const telegramService = require('./services/telegram');
const walletRoutes = require('./routes/wallet');

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
app.use('/api/game', authMiddleware, gameRoutes);
app.use('/api/wallet', walletRoutes);

// Error handling
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    console.log('Starting server...');
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    logger.info('Connected to MongoDB');
    console.log('Connected to MongoDB');

    // Initialize cron jobs
    scheduleGlobalDayReset();
    schedulePeriodicCheck();
    logger.info('Global day cron jobs initialized');
    console.log('Cron jobs initialized');

    // Start HTTP server first
    const PORT = process.env.HOST_PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Add error handler for server
    server.on('error', (error) => {
      console.error('Server error:', error);
      logger.error('Server error:', error);
    });

    // Start Telegram bot after server is running
    console.log('Starting Telegram bot...');
    await telegramService.startBot();
    logger.info('Telegram bot started');
    console.log('✅ Telegram bot started');

  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

console.log('Initializing server...');
startServer().catch(error => {
  console.error('Startup error:', error);
  process.exit(1);
});
