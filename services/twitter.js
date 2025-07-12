const config = require('../config');
const logger = require('./logger');
const { Client } = require('twitter-api-sdk');
require('dotenv').config();

const bearerToken = process.env.TWITTER_BEARER_TOKEN;
async function verifyTweet(twitterLink) {
    // Initialize Twitter client
    const client = new Client(bearerToken);
    
    try {
        // Extract tweet ID from the link
        const tweetId = extractTweetId(twitterLink);
        if (!tweetId) {
            throw new Error('Invalid Twitter link format');
        }
        
        // Fetch tweet with author expansion
        const tweetResponse = await client.tweets.findTweetById(tweetId, {
            'expansions': ['author_id'],
            'user.fields': ['verified', 'name', 'username', 'public_metrics'],
            'tweet.fields': ['created_at', 'text']
        });
        if (!tweetResponse.data) {
            throw new Error('Tweet not found or not accessible');
        }
        
        // Extract author information
        if(!isTweetLessThan10MinOld(tweetResponse.data.created_at)){
            return {
                success: false,
                error: "Tweet is more than 10 mins old",
                isVerified: false
            }
        }
        const tweetText = tweetResponse.data.text.toLowerCase();
if (!tweetText.includes('pumpshiedotfun') || !tweetText.includes('pumpdotfun')) {
    return {
        success: false,
        error: "Tweet must mention 'Pumpshiedotfun' and 'pumpdotfun'",
        isVerified: false
    }
}

        
        return {
            success: true,
            tweetId: tweetId,
            tweet: {
                text: tweetResponse.data.text,
                createdAt: tweetResponse.data.created_at
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error,
            isVerified: false
        };
    }
}

function extractTweetId(url) {
    // Handle multiple Twitter URL formats
    const patterns = [
        /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
        /(?:mobile\.twitter\.com)\/\w+\/status\/(\d+)/,
        /(?:twitter\.com|x\.com)\/\w+\/statuses\/(\d+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

function isTweetLessThan10MinOld(createdAt) {
    const tweetTime = new Date(createdAt); // Twitter's created_at is UTC
    const now = new Date();
    const diffMs = now - tweetTime; // difference in milliseconds
    const diffMin = diffMs / (1000 * 60); // convert ms to minutes
    return diffMin < 10;
}



// Usage example
// async function example() {
//     const bearerToken = 'YOUR_BEARER_TOKEN_HERE';
//     const twitterLink = 'https://twitter.com/TwitterDev/status/1255542774432063488';
    
//     const result = await verifyTweetAuthor(twitterLink, bearerToken);
    
//     if (result.success) {
//         console.log(`Tweet author @${result.author.username} is ${result.isVerified ? 'verified' : 'not verified'}`);
//         console.log(`Author: ${result.author.name}`);
//         console.log(`Tweet: ${result.tweet.text.substring(0, 100)}...`);
//     } else {
//         console.error('Error:', result.error);
//     }
// }


// Development mode flag - we'll read this from config
// const isDevelopment = process.env.NODE_ENV !== 'production';

// let twitterClient = null;

// // Only initialize Twitter client if we have credentials and are in production
// if (!isDevelopment && config.TWITTER_API_KEY) {
//     const { TwitterApi } = require('twitter-api-v2');
//     twitterClient = new TwitterApi({
//         appKey: config.TWITTER_API_KEY,
//         appSecret: config.TWITTER_API_SECRET,
//         accessToken: config.TWITTER_ACCESS_TOKEN,
//         accessSecret: config.TWITTER_ACCESS_SECRET,
//     });
// }

// const verifyTweetContent = (tweet) => {
//     // Check if tweet contains required hashtags or mentions
//     const requiredTags = ['#Pumpshie', '#Play2Earn'];
//     const hasRequiredTags = requiredTags.every(tag => 
//         tweet.text.toLowerCase().includes(tag.toLowerCase())
//     );

//     // Check if tweet mentions our game
//     const mentionsGame = tweet.text.toLowerCase().includes('@pumpshie_game');

//     return hasRequiredTags && mentionsGame;
// };

// const getTweetById = async (tweetId) => {
//     if (isDevelopment) {
//         // In development, return a mock tweet
//         logger.info('Development mode: Mocking tweet data', { tweetId });
//         return {
//             id: tweetId,
//             text: '#Pumpshie #Play2Earn @pumpshie_game Amazing game!',
//             author_id: 'dev_user_123',
//             created_at: new Date().toISOString()
//         };
//     }

//     try {
//         if (!twitterClient) {
//             throw new Error('Twitter client not initialized');
//         }

//         const tweet = await twitterClient.v2.singleTweet(tweetId, {
//             expansions: ['author_id'],
//             'tweet.fields': ['created_at', 'text', 'public_metrics']
//         });

//         if (!tweet.data) {
//             logger.error('Tweet not found', { tweetId });
//             return null;
//         }

//         return tweet.data;
//     } catch (error) {
//         logger.error('Error fetching tweet', { error, tweetId });
//         return null;
//     }
// };

// const verifyTweetOwnership = async (tweetId, userId) => {
//     if (isDevelopment) {
//         // In development, always return true
//         logger.info('Development mode: Assuming tweet ownership', { tweetId, userId });
//         return true;
//     }

//     try {
//         const tweet = await getTweetById(tweetId);
//         if (!tweet) return false;

//         // Get user's Twitter ID from your database or user profile
//         const userTwitterId = await getUserTwitterId(userId);
        
//         return tweet.author_id === userTwitterId;
//     } catch (error) {
//         logger.error('Error verifying tweet ownership', { error, tweetId, userId });
//         return false;
//     }
// };

// const isRecentTweet = (tweet) => {
//     const tweetDate = new Date(tweet.created_at);
//     const now = new Date();
//     // Tweet must be within the last 24 hours
//     return (now - tweetDate) <= 24 * 60 * 60 * 1000;
// };

// const verifyTweet = async (tweetId, userId) => {
//     try {
//         if (isDevelopment) {
//             // In development, log the attempt and return success
//             logger.info('Development mode: Tweet verification requested', {
//                 tweetId,
//                 userId,
//                 note: 'Auto-approving in development mode'
//             });
//             return { 
//                 success: true,
//                 development: true,
//                 message: 'Tweet auto-approved in development mode'
//             };
//         }

//         const tweet = await getTweetById(tweetId);
//         if (!tweet) return { success: false, reason: 'tweet_not_found' };

//         // Verify tweet ownership
//         const isOwner = await verifyTweetOwnership(tweetId, userId);
//         if (!isOwner) return { success: false, reason: 'not_owner' };

//         // Verify tweet content
//         const hasValidContent = verifyTweetContent(tweet);
//         if (!hasValidContent) return { success: false, reason: 'invalid_content' };

//         // Verify tweet is recent
//         const isRecent = isRecentTweet(tweet);
//         if (!isRecent) return { success: false, reason: 'tweet_too_old' };

//         return { success: true };
//     } catch (error) {
//         logger.error('Error in tweet verification', { error, tweetId, userId });
//         return { success: false, reason: 'error' };
//     }
// };

// // Helper function to get user's Twitter ID (implement this based on your user system)
// const getUserTwitterId = async (userId) => {
//     if (isDevelopment) {
//         return 'dev_user_123';
//     }
//     // TODO: Implement this based on your user system
//     // This should return the user's Twitter ID that was stored during Twitter account linking
//     throw new Error('Not implemented');
// };

module.exports = {
    verifyTweet,
    // getTweetById,
    // isDevelopment 
}; 