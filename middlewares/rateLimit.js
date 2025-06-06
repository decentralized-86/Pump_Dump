const logger = require('../services/logger');

// In-memory store for rate limiting
const rateLimitStore = new Map();

// Clean up old entries every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now - value.timestamp > 3600000) { // 1 hour
            rateLimitStore.delete(key);
        }
    }
}, 3600000);

const rateLimit = (type) => {
    const limits = {
        'wallet': { window: 300, max: 5 },    // 5 requests per 5 minutes
        'play': { window: 60, max: 10 },      // 10 requests per minute
        'tweet': { window: 300, max: 3 }      // 3 requests per 5 minutes
    };

    const limit = limits[type] || { window: 60, max: 30 }; // Default: 30 requests per minute

    return (req, res, next) => {
        try {
            const userId = req.user?.tgId || req.ip;
            const key = `${type}:${userId}`;
            const now = Date.now();

            let record = rateLimitStore.get(key);
            if (!record) {
                record = {
                    count: 0,
                    timestamp: now,
                    reset: now + (limit.window * 1000)
                };
            }

            // Reset if window has passed
            if (now > record.reset) {
                record = {
                    count: 0,
                    timestamp: now,
                    reset: now + (limit.window * 1000)
                };
            }

            // Check limit
            if (record.count >= limit.max) {
                return res.status(429).json({
                    message: 'Too many requests',
                    resetAt: new Date(record.reset)
                });
            }

            // Increment counter
            record.count++;
            rateLimitStore.set(key, record);

            // Add headers
            res.set({
                'X-RateLimit-Limit': limit.max,
                'X-RateLimit-Remaining': limit.max - record.count,
                'X-RateLimit-Reset': record.reset
            });

            next();
        } catch (error) {
            logger.error('Rate limit error:', error);
            next(error);
        }
    };
};

module.exports = rateLimit; 