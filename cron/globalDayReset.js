const cron = require('node-cron');
const globalDayService = require('../services/globalDay');
const logger = require('../services/logger');

// Schedule the job to run at midnight EST (5 AM UTC)
const scheduleGlobalDayReset = () => {
  cron.schedule('0 5 * * *', async () => {
    try {
      logger.info('Starting global day reset...');
      const newDay = await globalDayService.resetGlobalDay();
      logger.info(`Global day reset complete. New day ID: ${newDay._id}`);
    } catch (error) {
      logger.error('Error during global day reset:', error);
    }
  }, {
    timezone: 'UTC'
  });
};

// Also run a periodic check every 5 minutes to ensure we haven't missed a reset
const schedulePeriodicCheck = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await globalDayService.checkAndResetDay();
    } catch (error) {
      logger.error('Error during periodic global day check:', error);
    }
  });
};

module.exports = {
  scheduleGlobalDayReset,
  schedulePeriodicCheck
}; 