const express = require('express');
const router = express.Router();
const logger = require('../services/logger');
const PumpUser = require('../models/PumpUser');
const bs58 = require('bs58');
const nacl = require('tweetnacl');

/**
 * @route   POST /api/wallet/verify
 * @desc    Verify wallet signature and check/update wallet status
 */
router.post('/verify', async (req, res) => {
    try {
        const { walletAddress, signature, tgId } = req.body;
        
        if (!walletAddress || !signature || !tgId) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address, signature and tgId are required'
            });
        }

        // Verify the signature
        const message = `Verifying wallet ${walletAddress}`;
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = Buffer.from(signature, 'hex');
        const publicKeyBytes = bs58.decode(walletAddress);
        
        const isValid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );
        
        if (!isValid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid signature'
            });
        }

        // Check if this wallet is already linked to another user
        const existingWalletUser = await PumpUser.findOne({ walletAddress });
        if (existingWalletUser && existingWalletUser.tgId !== tgId) {
            return res.status(400).json({
                success: false,
                error: 'This wallet is already linked to another user'
            });
        }

        // Find or create user by tgId
        let user = await PumpUser.findOne({ tgId });
        
        if (!user) {
            // If user doesn't exist, we should not create one here
            return res.status(404).json({
                success: false,
                error: 'User not found. Please start the bot first using /start command.'
            });
        }

        // Update user's wallet
        user.walletAddress = walletAddress;
        user.walletVerifiedAt = new Date();
        await user.save();

        res.json({
            success: true,
            data: {
                walletAddress,
                verified: true,
                username: user.username,
                displayName: user.displayName
            }
        });
    } catch (error) {
        logger.error('Wallet verification failed', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to verify wallet'
        });
    }
});

/**
 * @route   GET /api/wallet/status
 * @desc    Get wallet status for a user
 */
router.get('/status', async (req, res) => {
    try {
        const tgId = req.headers['x-telegram-user-id'];
        
        if (!tgId) {
            return res.status(400).json({
                success: false,
                error: 'Telegram ID is required'
            });
        }

        // Find user by tgId
        const user = await PumpUser.findOne({ tgId });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            walletAddress: user.walletAddress || null,
            walletVerifiedAt: user.walletVerifiedAt || null
        });
    } catch (error) {
        logger.error('Failed to get wallet status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get wallet status'
        });
    }
});

module.exports = router; 