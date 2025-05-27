const express = require("express");
const PumpUser = require("../models/PumpUser");
const GameSession = require("../models/GameSession");
const logger = require("../services/logger");
const PumpHist = require("../models/PumpHist");
const Joi = require("joi");
const PumpProject = require("../models/PumpProject");
const { calculatePoint } = require("../utils/calc");
const { remainTimeMs } = require("../services/remain");
const walletService = require("../services/wallet");
const gameService = require("../services/game");
const globalDayService = require("../services/globalDay");
const twitterService = require("../services/twitter");
const cache = require("../services/cache");
const rateLimit = require("../middlewares/rateLimit");

const router = express.Router();

router.get("/rank-me", async (req, res) => {
  const user = req.bean.user;
  try {
    const cacheKey = cache.generateKey('rank', user.tgId);
    
    const rankData = await cache.getOrSet(cacheKey, async () => {
    const userRank = await PumpUser.aggregate([
      {
        $sort: {
          maxScore: -1,
        },
      },
      {
        $group: {
          _id: null,
          users: { $push: { userId: "$userId", score: "$maxScore" } },
        },
      },
      {
        $project: {
          rank: {
            $indexOfArray: ["$users.userId", user.userId],
          },
        },
      },
    ]);

    const projectRank = await PumpProject.aggregate([
      {
        $sort: {
          points: -1,
        },
      },
      {
        $group: {
          _id: null,
          projects: { $push: { projectId: "$projectId", points: "$points" } },
        },
      },
      {
        $project: {
          rank: {
            $indexOfArray: ["$projects.projectId", user.projectId],
          },
        },
      },
    ]);

    const userProject = await PumpProject.findOne({
      projectId: user.projectId,
    });

      return {
      userId: user.userId,
        userRank: userRank[0]?.rank + 1 || 1,
        projectRank: projectRank[0]?.rank + 1 || 1,
      userScore: user.maxScore,
      projectId: user.projectId || null,
      projectName: userProject?.name,
      projectPoints: userProject?.points || 0,
      avatar: user.avatar,
      };
    }, cache.DURATIONS.SHORT);

    return res.json(rankData);
  } catch (error) {
    console.error("Error calculating rank:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/", async (req, res) => {
  const user = req.bean.user;
  const ms = await remainTimeMs(user.tgId);
  const resp = {
    telegramId: user.userId,
    maxScore: user.maxScore || 0,
    maxTime: user.maxTime || 0,
    remainTime: ms,
    avatar: user.avatar,
  };
  return res.json(resp);
});

router.get("/get-invites", async (req, res) => {
  const users = await PumpUser.aggregate([
    {
      $match: {
        tgId: req.bean.user.tgId, // Match the specific user (inviter)
      },
    },
    {
      $unwind: "$invitees", // Unwind the invitees array
    },
    {
      $lookup: {
        from: "pumpusers", // This refers to the PumpUser collection (use the correct collection name)
        localField: "invitees", // Field in the invitees array to match
        foreignField: "tgId", // Field in the PumpUser collection to match
        as: "inviteesDetails", // The resulting array will contain the detailed invitee info
      },
    },
    {
      $unwind: {
        path: "$inviteesDetails", // Flatten the array of invitee details
        preserveNullAndEmptyArrays: true, // Keep the document even if no match found
      },
    },
    {
      $project: {
        _id: 0,
        name: "$inviteesDetails.name",
        userId: "$inviteesDetails.userId",
        tgId: "$inviteesDetails.tgId",
      },
    },
  ]).exec();
  return res.json(users);
});

router.post("/update-project", async (req, res) => {
  const user = req.bean.user;

  const updateSchema = Joi.object({
    projectId: Joi.string().required(),
  });
  const { error } = updateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  if (user.projectId === req.body.projectId) {
    return res.json({
      success: false,
      message: "You are already part of that project.",
    });
  }
  user.projectId = req.body.projectId;
  await user.save();
  return res.json({
    success: true,
    message: "Selected updated project successfully",
  });
});

router.get("/projects", async (req, res) => {
  const projects = await PumpProject.aggregate([
    {
      $project: {
        projectId: 1,
        name: 1,
        points: 1,
        walletAddress: 1,
        projectName: "$name",
      },
    },
  ]);
  return res.json({
    projects,
  });
});

router.get("/search-projects", async (req, res) => {
  const searchProject = req.query.project || "";
  try {
    const projects = await PumpProject.aggregate([
      {
        $match: {
          name: { $regex: searchProject, $options: "i" },
        },
      },
      {
        $project: {
          projectId: 1,
          name: 1,
          points: 1,
          walletAddress: 1,
        },
      },
    ]);

    const response = await fetch(
      `https://frontend-api-v2.pump.fun/coins?offset=0&limit=100&sort=market_cap&order=DESC&includeNsfw=true&searchTerm=${searchProject}`
    );
    const externalProjects = await response.json();
    // only filter out the projects that are not in the internal projects
    externalProjects.filter((v) => {
      return projects.findIndex((p) => p.walletAddress === v.mint) < 0;
    });

    const combinedProjects = projects.concat(
      externalProjects.map((p) => ({
        name: p.name,
        points: 0,
        walletAddress: p.mint,
        imageUrl: p.image_uri,
      }))
    );

    return res.json({
      projects: combinedProjects,
    });
  } catch (error) {
    console.error("Error searching projects:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/referral-data", async (req, res) => {
  const user = req.bean.user;
  const ms = await remainTimeMs(user.tgId);
  return res.json({
    referralCode: user.tgId,
    remainTime: ms,
    inviteLink: user.inviteLink,
  });
});

router.post("/update-display", async (req, res) => {
  const updateSchema = Joi.object({
    isDisplayGlobal: Joi.boolean().required(),
  });
  const { error } = updateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { isDisplayGlobal } = req.body;
    const user = req.bean.user;
    await PumpUser.updateOne(
      { tgId: user.tgId },
      {
        $set: { isDisplayGlobal: isDisplayGlobal },
      }
    );
    return res.json({ success: true, message: "Display updated successfully" });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/update-wallet", async (req, res) => {
  const updateSchema = Joi.object({
    newWalletAddress: Joi.string().required(),
  });
  const { error } = updateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { newWalletAddress } = req.body;
    const user = req.bean.user;
    await PumpUser.updateOne(
      { tgId: user.tgId },
      {
        $set: { walletAddress: newWalletAddress },
      }
    );
    return res.json({ success: true, message: "Score updated successfully" });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/update-play", async (req, res) => {
  const user = req.bean.user;
  const updateSchema = Joi.object({
    score: Joi.number().required(),
    playTime: Joi.number().required(),
  });
  const { error } = updateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { score, playTime } = req.body;
    if (score < 1) {
      return res.json({
        success: true,
        message: "Score updated successfully",
        remainTime: await remainTimeMs(user.tgId),
      });
    }
    const project = await PumpProject.findOne({
      projectId: user.projectId,
    });
    if (project) {
      project.points += calculatePoint(score) * (project.boostMulti || 1);
      await project.save();
    }
    await PumpUser.updateOne(
      { tgId: user.tgId },
      {
        $set: { maxScore: Math.max(user.maxScore, score), maxTime: playTime },
      }
    );
    const hist = new PumpHist({
      tgId: user.tgId,
      score,
      playTime,
    });
    await hist.save();
    return res.json({
      success: true,
      message: "Score updated successfully",
      remainTime: await remainTimeMs(user.tgId),
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/history", async (req, res) => {
  try {
    const user = req.bean.user;
    const query = [
      {
        $match: {
          tgId: user.tgId,
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $limit: 100,
      },
      {
        $lookup: {
          from: "pumpusers",
          localField: "tgId",
          foreignField: "tgId",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          //date: "$createdAt",
          projectName: "$name",
          name: "$user.name",
          score: "$score",
          avatar: "$user.avatar",
          date: {
            $dateToString: {
              format: "%Y-%m-%d %H:%M:%S",
              date: "$createdAt",
            },
          },
        },
      },
    ];
    const hists = await PumpHist.aggregate(query).exec();
    return res.json({
      data: hists,
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const user = req.bean.user;
    const cacheKey = cache.generateKey('profile', user.tgId);
    
    const profile = await cache.getOrSet(cacheKey, async () => {
    const project = await PumpProject.findOne({
      projectId: user.projectId,
    }).exec();
      
    let projectPoints = 0;
    let projectName = "---";
    let projectWalletAddress = "---";
      
    if (project) {
      projectPoints = project.points;
      projectName = project.name;
      projectWalletAddress = project.walletAddress;
    }
      
      return {
      name: user.userId,
      walletAddress: user.walletAddress,
      maxScore: user.maxScore,
      avatar: user.avatar,
      remainTime: await remainTimeMs(user.tgId),
      projectPoints,
      projectName,
      projectWalletAddress,
      };
    }, cache.DURATIONS.MEDIUM);

    return res.json(profile);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// New routes for wallet and game functionality
router.post("/prepare-wallet-verification", async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: "Missing wallet address" });
        }

        const verificationData = await walletService.prepareWalletVerification(walletAddress);
        return res.json({
            success: true,
            message: verificationData.message,
            nonce: verificationData.nonce
        });
    } catch (error) {
        logger.error("Error preparing wallet verification", { error });
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/verify-wallet", rateLimit('wallet'), async (req, res) => {
    try {
        const { signature, walletAddress } = req.body;
        if (!signature || !walletAddress) {
            return res.status(400).json({ error: "Missing signature or wallet address" });
        }

        const isValid = await walletService.verifyWalletConnection(signature, walletAddress);
        if (!isValid) {
            return res.status(400).json({ error: "Invalid signature" });
        }

        // Update user's wallet address
        const user = req.bean.user;
        user.walletAddress = walletAddress;
        await user.save();

        return res.json({ success: true });
    } catch (error) {
        logger.error("Error verifying wallet", { error });
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/purchase-access", rateLimit('wallet'), async (req, res) => {
    try {
        const { signature } = req.body;
        if (!signature) {
            return res.status(400).json({ error: "Missing transaction signature" });
        }

        const success = await gameService.grantPaidAccess(req.bean.user.tgId, signature);
        if (!success) {
            return res.status(400).json({ error: "Invalid payment" });
        }

        return res.json({ success: true });
    } catch (error) {
        logger.error("Error processing payment", { error });
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/check-eligibility", rateLimit('play'), async (req, res) => {
    try {
        const user = req.bean.user;
        const eligibility = await gameService.canUserPlay(user.tgId, user.walletAddress);
        return res.json(eligibility);
    } catch (error) {
        logger.error("Error checking eligibility", { error });
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/verify-tweet", rateLimit('tweet'), async (req, res) => {
    try {
        const { tweetId } = req.body;
        if (!tweetId) {
            return res.status(400).json({ error: "Missing tweet ID" });
        }

        const result = await twitterService.verifyTweet(tweetId, req.bean.user.tgId);
        if (!result.success) {
            return res.status(400).json({ error: result.reason });
        }

        // Grant an extra play through game service
        await gameService.verifyTweet(req.bean.user.tgId, tweetId);

        return res.json({ success: true });
    } catch (error) {
        logger.error("Error verifying tweet", { error });
        return res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user's game state
router.get("/state", async (req, res) => {
  try {
    const user = await gameService.getUserState(req.bean.user.tgId);
    const canPlay = await gameService.canUserPlay(user.tgId, user.walletAddress);
    
    return res.json({
      userId: user.tgId,
      displayName: user.displayName,
      avatar: user.avatar,
      accessType: user.accessType,
      freePlaysRemaining: user.freePlaysRemaining,
      tweetVerifiedToday: user.tweetVerifiedToday,
      currentProject: user.currentProject,
      highestScore: user.highestScore,
      canPlay: canPlay.canPlay,
      playReason: canPlay.reason
    });
  } catch (error) {
    logger.error("Error getting game state:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Start a new game session
router.post("/start", async (req, res) => {
  try {
    const user = req.bean.user;
    
    // Check if user can play
    const canPlay = await gameService.canUserPlay(user.tgId, user.walletAddress);
    if (!canPlay.canPlay) {
      return res.status(403).json({ 
        message: "You cannot play at this time",
        reason: canPlay.reason
      });
    }
    
    // Start session
    const session = await gameService.startGameSession(
      user.tgId,
      user.currentProject?.projectId
    );
    
    // Consume play if needed
    await gameService.consumePlay(user.tgId);
    
    return res.json({
      sessionId: session._id,
      message: "Game session started successfully"
    });
  } catch (error) {
    logger.error("Error starting game:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// End a game session
router.post("/end", async (req, res) => {
  try {
    const schema = Joi.object({
      sessionId: Joi.string().required(),
      obstaclesPassed: Joi.number().min(0).required()
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    const session = await gameService.endGameSession(
      value.sessionId,
      value.obstaclesPassed
    );
    
    return res.json({
      score: session.currentScore,
      isHighScore: session.isHighScore,
      isDailyHighScore: session.isDailyHighScore,
      mcPointsEarned: session.mcPointsEarned
    });
  } catch (error) {
    logger.error("Error ending game:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get daily leaderboard
router.get("/leaderboard/daily", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const leaderboard = await globalDayService.getDailyLeaderboard(limit);
    return res.json(leaderboard);
  } catch (error) {
    logger.error("Error getting daily leaderboard:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get project leaderboard
router.get("/leaderboard/projects", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const leaderboard = await globalDayService.getProjectLeaderboard(limit);
    return res.json(leaderboard);
  } catch (error) {
    logger.error("Error getting project leaderboard:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get user's rank
router.get("/rank", async (req, res) => {
  const user = req.bean.user;
  try {
    const cacheKey = cache.generateKey('rank', user.tgId);
    
    const rankData = await cache.getOrSet(cacheKey, async () => {
      const [currentDay, userProject] = await Promise.all([
        globalDayService.getCurrentDay(),
        user.currentProject?.projectId ? PumpProject.findOne({ projectId: user.currentProject.projectId }) : null
      ]);

      // Get user's daily rank
      const dailyRank = await GameSession.countDocuments({
        globalDayId: currentDay._id,
        currentScore: { $gt: user.highestScore }
      }) + 1;

      // Get project's daily rank if user has a project
      let projectRank = null;
      if (userProject) {
        projectRank = await PumpProject.countDocuments({
          currentGlobalDayId: currentDay._id,
          dailyPoints: { $gt: userProject.dailyPoints }
        }) + 1;
      }

      return {
        userId: user.tgId,
        displayName: user.displayName,
        avatar: user.avatar,
        dailyRank,
        dailyScore: user.highestScore,
        projectId: userProject?.projectId,
        projectName: userProject?.name,
        projectRank,
        projectPoints: userProject?.dailyPoints || 0
      };
    }, cache.DURATIONS.SHORT);

    return res.json(rankData);
  } catch (error) {
    logger.error("Error calculating rank:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Update user's project
router.post("/project", async (req, res) => {
  try {
    const schema = Joi.object({
      projectId: Joi.string().required()
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    const user = req.bean.user;
    const project = await PumpProject.findOne({ projectId: value.projectId });
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    if (user.currentProject?.projectId === value.projectId) {
      return res.status(400).json({ message: "You are already in this project" });
    }
    
    user.currentProject = {
      projectId: project.projectId,
      name: project.name,
      joinedAt: new Date()
    };
    
    await user.save();
    
    return res.json({
      message: "Project updated successfully",
      project: {
        projectId: project.projectId,
        name: project.name,
        imageUrl: project.imageUrl
      }
    });
  } catch (error) {
    logger.error("Error updating project:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Verify tweet for extra play
router.post("/verify-tweet", async (req, res) => {
  try {
    const schema = Joi.object({
      tweetId: Joi.string().required()
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    const user = req.bean.user;
    
    // Verify tweet content and ownership
    const isValid = await twitterService.verifyTweet(value.tweetId, user.tgId);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid tweet" });
    }
    
    // Grant extra play
    const success = await gameService.verifyTweet(user.tgId, value.tweetId);
    if (!success) {
      return res.status(400).json({ message: "Tweet already verified today" });
    }
    
    return res.json({
      message: "Tweet verified successfully",
      freePlaysRemaining: user.freePlaysRemaining
    });
  } catch (error) {
    logger.error("Error verifying tweet:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get all projects
router.get("/projects", async (req, res) => {
  try {
    const projects = await PumpProject.find()
      .select('projectId name imageUrl dailyPoints playerCount')
      .sort('-dailyPoints');
      
    return res.json(projects);
  } catch (error) {
    logger.error("Error getting projects:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Search projects
router.get("/projects/search", async (req, res) => {
  try {
    const searchTerm = req.query.q || "";
    const projects = await PumpProject.find({
      name: { $regex: searchTerm, $options: "i" }
    })
    .select('projectId name imageUrl dailyPoints playerCount')
    .sort('-dailyPoints')
    .limit(20);
    
    return res.json(projects);
  } catch (error) {
    logger.error("Error searching projects:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const user = req.user;
        res.json({
            tgId: user.tgId,
            username: user.username,
            displayName: user.displayName,
            freePlaysRemaining: user.freePlaysRemaining,
            walletAddress: user.walletAddress
        });
    } catch (error) {
        logger.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await globalDayService.getDailyLeaderboard();
        res.json(leaderboard);
    } catch (error) {
        logger.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
});

// Start game session
router.post('/start', rateLimit('play'), async (req, res) => {
    try {
        const { projectId } = req.body;
        
        if (!projectId) {
            return res.status(400).json({ message: 'Project ID is required' });
        }

        const project = await PumpProject.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const currentDay = await globalDayService.getCurrentDay();
        
        const session = new GameSession({
            userId: req.user._id,
            projectId: project._id,
            globalDayId: currentDay._id,
            startedAt: new Date(),
            currentScore: 0
        });

        await session.save();

        res.json({
            sessionId: session._id,
            project: {
                name: project.name,
                imageUrl: project.imageUrl
            }
        });

    } catch (error) {
        logger.error('Error starting game session:', error);
        res.status(500).json({ message: 'Failed to start game session' });
    }
});

// Submit game play
router.post('/play', rateLimit('play'), async (req, res) => {
    try {
        const { sessionId, score } = req.body;

        if (!sessionId || typeof score !== 'number') {
            return res.status(400).json({ message: 'Session ID and score are required' });
        }

        const session = await GameSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Game session not found' });
        }

        if (session.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this session' });
        }

        session.currentScore = score;
        session.lastPlayedAt = new Date();
        await session.save();

        res.json({
            sessionId: session._id,
            currentScore: session.currentScore
        });

    } catch (error) {
        logger.error('Error submitting play:', error);
        res.status(500).json({ message: 'Failed to submit play' });
    }
});

module.exports = router;
