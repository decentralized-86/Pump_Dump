const express = require('express');
const router = express.Router();
const logger = require('../services/logger');
const PumpUser = require('../models/PumpUser');

/**
 * @route   POST /api/users/init
 * @desc    Initialize or update user from Telegram data
 */
router.post('/init', async (req, res) => {
    try {
        const { tgId, username, firstName, lastName } = req.body;
        
        if (!tgId) {
            return res.status(400).json({
                success: false,
                error: 'Telegram ID is required'
            });
        }

        // Find or create user
        let user = await PumpUser.findOne({ tgId });
        
        if (!user) {
            user = new PumpUser({
                tgId,
                username,
                displayName: firstName ? `${firstName} ${lastName || ''}`.trim() : username,
                createdAt: new Date()
            });
        } else {
            // Update user data if changed
            if (username) user.username = username;
            if (firstName || lastName) {
                user.displayName = `${firstName} ${lastName || ''}`.trim();
            }
            user.lastSeenAt = new Date();
        }

        await user.save();

        res.json({
            success: true,
            tgId: user.tgId,
            username: user.username,
            displayName: user.displayName,
            walletAddress: user.walletAddress,
            walletVerifiedAt: user.walletVerifiedAt
        });
    } catch (error) {
        logger.error('User initialization failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize user'
        });
    }
});

module.exports = router; 