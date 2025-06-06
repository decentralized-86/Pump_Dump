const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { scheduleGlobalDayReset, schedulePeriodicCheck } = require('./cron/globalDayReset');
const gameRoutes = require('./routes/game');
const publicRoutes = require('./routes/public');
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
app.use('/api/game', authMiddleware, gameRoutes);

// Error handling
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(config.mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  logger.info('Connected to MongoDB');
  
  // Initialize cron jobs
  scheduleGlobalDayReset();
  schedulePeriodicCheck();
  
  logger.info('Global day cron jobs initialized');
})
.catch(error => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Start server and Telegram bot
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  
  // Start Telegram bot
  try {
    await telegramService.startBot();
    logger.info('Telegram bot started successfully');
  } catch (error) {
    logger.error('Failed to start Telegram bot:', error);
  }
});

module.exports = app; 