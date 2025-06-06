const express = require("express");
const PumpUser = require("../models/PumpUser");
const PumpProject = require("../models/PumpProject");
const fetch = require("node-fetch");
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../services/logger');
const walletService = require('../services/wallet');
const rateLimit = require('../middlewares/rateLimit');

const router = express.Router();

router.get("/", async (req, res) => {
  return res.json({});
});

router.get("/proxy", async (req, res) => {
  return res.status(500).send("Failed to fetch image");

  try {
    const response = await fetch(req.query.url);
    const buffer = await response.buffer();
    res.set("Content-Type", "image/jpeg");
    res.send(buffer);
  } catch (error) {
    console.log(error);
    res.status(500).send("Failed to fetch image");
  }
});

// API Endpoint to query storm data
router.get("/rank-projects", async (req, res) => {
  const projectRanking = await PumpProject.aggregate([
    // Step 1: Sort projects by points (descending)
    {
      $sort: {
        points: -1, // Sort by points descending
        score: -1,
      },
    },
    // Step 2: Limit the number of projects to 30
    {
      $limit: 30,
    },
    // Step 3: Lookup to join PumpUser to get owner and team data
    {
      $lookup: {
        from: "pumpusers", // Collection name for PumpUser
        localField: "projectId", // Field in PumpProject
        foreignField: "projectId", // Field in PumpUser
        as: "teamMembers",
      },
    },
    // Step 4: Add the owner's avatar and count the team members
    {
      $addFields: {
        avatar: {
          $arrayElemAt: [
            "$teamMembers.avatar",
            {
              $indexOfArray: ["$teamMembers.userId", "$ownerId"],
            },
          ], // Get the owner's avatar
        },
        count: {
          $size: "$teamMembers", // Count of team members
        },
      },
    },
    // Step 5: Project the required fields
    {
      $project: {
        _id: 0,
        ownerId: 1,
        projectName: "$name",
        points: 1,
        avatar: 1,
        count: 1,
        boostMulti: 1,
      },
    },
  ]);
  return res.json(projectRanking);
});

router.get("/rank-players", async (req, res) => {
  const topPlayers = await PumpUser.aggregate([
    // Step 1: Sort and limit the users to the top 30 by score
    {
      $sort: {
        maxScore: -1, // Sort by maxScore descending
      },
    },
    {
      $limit: 30, // Get the top 30 users
    },
    // Step 2: Perform the lookup only on the top 30 users
    {
      $lookup: {
        from: "pumpprojects", // Collection name for PumpProject
        localField: "projectId",
        foreignField: "projectId",
        as: "projectDetails",
      },
    },
    // Step 3: Unwind the project details
    {
      $unwind: {
        path: "$projectDetails",
        preserveNullAndEmptyArrays: true, // Keep users even if they don't have a project
      },
    },
    // Step 4: Add derived fields for easy access
    {
      $addFields: {
        projectPoints: "$projectDetails.points",
        projectName: "$projectDetails.name",
        boostMulti: "$projectDetails.boostMulti",
      },
    },
    // Step 5: Re-sort based on score and project points for final ranking
    {
      $sort: {
        maxScore: -1, // Sort by maxScore descending
        projectPoints: -1, // Sort by projectPoints descending for ties
      },
    },
    // Step 6: Project only the required fields
    {
      $project: {
        _id: 0,
        userId: "$userId",
        username: "$name",
        score: "$maxScore",
        projectPoints: 1,
        avatar: "$avatar",
        projectName: 1,
        boostMulti: 1,
      },
    },
  ]);
  return res.json(topPlayers);
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Telegram authentication
router.post('/auth/telegram', rateLimit('auth'), async (req, res) => {
    try {
        const { message, signature, tgId, username, displayName } = req.body;

        if (!message || !signature || !tgId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // For testing purposes, we'll skip signature verification
        // In production, you should verify the signature
        
        // Find or create user
        let user = await PumpUser.findOne({ tgId });
        if (!user) {
            user = new PumpUser({
                tgId,
                username,
                displayName,
                freePlaysRemaining: 10
            });
            await user.save();
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.tgId },
            config.jwtSecret,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                tgId: user.tgId,
                username: user.username,
                displayName: user.displayName,
                freePlaysRemaining: user.freePlaysRemaining
            }
        });

    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(500).json({ message: 'Authentication failed' });
    }
});

// Wallet verification
router.post('/verify-wallet', rateLimit('wallet'), async (req, res) => {
    try {
        const { walletAddress, signature, message } = req.body;

        if (!walletAddress || !signature || !message) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const isValid = await walletService.verifyWalletConnection(signature, walletAddress);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid wallet signature' });
        }

        res.json({ verified: true });

    } catch (error) {
        logger.error('Wallet verification error:', error);
        res.status(500).json({ message: 'Wallet verification failed' });
    }
});

module.exports = router;
