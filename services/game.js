const web3 = require('@solana/web3.js');
const walletService = require('./wallet');
const globalDayService = require('./globalDay');
const logger = require('./logger');
const config = require('../config');
const PumpUser = require('../models/PumpUser');
const GameSession = require('../models/GameSession');
const PumpProject = require('../models/PumpProject');

// Constants
const FREE_PLAYS = 10;
const PAID_ACCESS_SOL = 0.005;
const PAID_ACCESS_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const POINTS_PER_OBSTACLE = 5000;

const getUserState = async (userId) => {
    let user = await PumpUser.findOne({ tgId: userId });
    
    if (!user) {
        logger.error('User not found:', userId);
        throw new Error('User not found');
    }

    // Get current global day
    const currentDay = await globalDayService.getCurrentDay();
    
    // Reset user if they haven't played today
    if (!user.currentGlobalDayId || user.currentGlobalDayId.toString() !== currentDay._id.toString()) {
        user.freePlaysRemaining = FREE_PLAYS;
        user.currentGlobalDayId = currentDay._id;
        user.tweetVerifiedToday = false;
        await user.save();
    }

    return user;
};

const canUserPlay = async (userId, walletAddress = null) => {
    try {
        const user = await getUserState(userId);

        // Check paid access first
        if (user.paidAccessUntil && new Date() < user.paidAccessUntil) {
            return { canPlay: true, reason: 'paid_access' };
        }

        // Check token holder status
        if (walletAddress && await walletService.verifyMinimumTokens(walletAddress)) {
            return { canPlay: true, reason: 'token_holder' };
        }

        // Check free plays
        if (user.freePlaysRemaining > 0) {
            return { canPlay: true, reason: 'free_play' };
        }

        // Check if tweet verification is available
        if (!user.tweetVerifiedToday) {
            return { canPlay: true, reason: 'tweet_available' };
        }

        return { canPlay: false, reason: 'no_plays_left' };
    } catch (error) {
        logger.error('Error checking play eligibility', { error, userId, walletAddress });
        return { canPlay: false, reason: 'error' };
    }
};

const startGameSession = async (userId, projectId = null) => {
    try {
        const [user, currentDay] = await Promise.all([
            getUserState(userId),
            globalDayService.getCurrentDay()
        ]);

        const session = new GameSession({
            userId: user.tgId,
            projectId,
            globalDayId: currentDay._id,
            accessType: user.accessType,
            status: 'active'
        });

        await session.save();
        return session;
    } catch (error) {
        logger.error('Error starting game session', { error, userId, projectId });
        throw error;
    }
};

const endGameSession = async (sessionId, obstaclesPassed) => {
    try {
        const session = await GameSession.findById(sessionId);
        if (!session || session.status !== 'active') {
            throw new Error('Invalid or already completed session');
        }

        // Calculate score and end session
        session.obstaclesPassed = obstaclesPassed;
        await session.endSession();

        // Update project points if applicable
        if (session.projectId) {
            const points = Math.floor(session.currentScore / 1000); // 1 point per 1000 score
            const project = await PumpProject.findOne({ projectId: session.projectId });
            if (project) {
                await project.addPoints(session.userId, points);
            }
        }

        return session;
    } catch (error) {
        logger.error('Error ending game session', { error, sessionId });
        throw error;
    }
};

const consumePlay = async (userId) => {
    try {
        const user = await getUserState(userId);
        
        // Don't consume plays for paid access or token holders
        if (user.paidAccessUntil && new Date() < user.paidAccessUntil) {
            return true;
        }
        
        if (user.walletAddress && await walletService.verifyMinimumTokens(user.walletAddress)) {
            return true;
        }

        // Consume a free play
        if (user.freePlaysRemaining > 0) {
            user.freePlaysRemaining--;
            await user.save();
            return true;
        }
        
        return false;
    } catch (error) {
        logger.error('Error consuming play', { error, userId });
        return false;
    }
};

const grantPaidAccess = async (userId, signature) => {
    try {
        // Verify the payment
        const expectedAmount = PAID_ACCESS_SOL * web3.LAMPORTS_PER_SOL;
        const isValid = await walletService.verifyPayment(signature, expectedAmount);

        if (!isValid) {
            return false;
        }

        // Grant paid access
        const user = await getUserState(userId);
        user.paidAccessUntil = new Date(Date.now() + PAID_ACCESS_DURATION);
        user.accessType = 'paid';
        await user.save();

        return true;
    } catch (error) {
        logger.error('Error granting paid access', { error, userId, signature });
        return false;
    }
};

const verifyTweet = async (userId, tweetId) => {
    try {
        const user = await getUserState(userId);
        
        // Check if tweet has been verified today
        if (user.tweetVerifiedToday) {
            logger.warn('Tweet already verified today', { userId, tweetId });
            return false;
        }

        // Add tweet to verifications and grant an extra play
        user.tweetVerifications.push({ 
            tweetId, 
            verifiedAt: new Date(),
            rewardType: 'daily_play',
            rewardAmount: 1
        });
        user.freePlaysRemaining += 1;
        user.tweetVerifiedToday = true;
        
        // Keep only last 10 tweet verifications
        if (user.tweetVerifications.length > 10) {
            user.tweetVerifications = user.tweetVerifications.slice(-10);
        }
        
        await user.save();
        
        logger.info('Tweet verified and play granted', {
            userId,
            tweetId,
            currentFreePlays: user.freePlaysRemaining,
            development: process.env.NODE_ENV !== 'production'
        });

        return true;
    } catch (error) {
        logger.error('Error verifying tweet', { error, userId, tweetId });
        return false;
    }
};

// Cleanup old data periodically
const cleanup = async () => {
    try {
        const now = new Date();
        
        // Remove expired paid access
        await PumpUser.updateMany(
            { paidAccessUntil: { $lt: now } },
            { $set: { paidAccessUntil: null, accessType: 'free' } }
        );
        
        // Clean up old tweet verifications (keep last 10)
        const users = await PumpUser.find({ 
            'tweetVerifications.10': { $exists: true } 
        });
        
        for (const user of users) {
            user.tweetVerifications = user.tweetVerifications.slice(-10);
            await user.save();
        }

        // Check for global day reset
        await globalDayService.checkAndResetDay();
    } catch (error) {
        logger.error('Error in cleanup', { error });
    }
};

module.exports = {
    getUserState,
    canUserPlay,
    startGameSession,
    endGameSession,
    consumePlay,
    grantPaidAccess,
    verifyTweet,
    cleanup
}; 