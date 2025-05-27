const gameService = require('./game');
const logger = require('./logger');

let cleanupInterval = null;

const start = () => {
    // Run cleanup every 5 minutes
    cleanupInterval = setInterval(() => {
        try {
            gameService.cleanup();
            logger.info('Cleanup completed successfully');
        } catch (error) {
            logger.error('Error during cleanup', { error });
        }
    }, 5 * 60 * 1000);
};

const stop = () => {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
};

module.exports = {
    start,
    stop
}; 