const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../services/logger');
const PumpUser = require('../models/PumpUser');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'No authorization token provided' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Invalid authorization format' });
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);
        
        // Get user
        const user = await PumpUser.findOne({ tgId: decoded.userId });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = authMiddleware; 