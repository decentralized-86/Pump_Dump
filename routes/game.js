const express = require("express");
const PumpUser = require("../models/PumpUser");
const Constants = require("../models/Constants");
const Meme = require("../models/Meme");
const GameDay = require('../models/GameDay');
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
const { authenticateToken,authenticateAdmin,generateAdminJWTToken } = require("../utils/gen");
const {getProjectMetadata} = require("../services/project")

const router = express.Router();

router.post("/make-golden", authenticateAdmin,async(req,res)=>{
  try{
    const tokenAddress = req.body?.tokenAddress;
    let project = await PumpProject.findOne({tokenAddress: tokenAddress});
    if(!project) return res.status(404).json({msg:"project not found"})
    project.isGolden = true;
    await project.save();
    return res.status(200).json({msg: "project is made golden"})
  }catch(err){
    return err
  }
});

router.get("/get-winner",authenticateAdmin, async(req,res)=>{
  try{
    const topUser = await GameDay.aggregate([
        {
          $sort: {
            score: -1,       
            playTime: 1  
          }
        },
        {
          $limit: 1  
        },
        {
          $lookup: {
            from: 'pumpusers',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            _id: 0,
            userId: 1,
            score: 1,
            playTime: 1,
            walletAddress: '$user.walletAddress',
            username: '$user.username'
          }
        }
    ]);
    const constant = await Constants.find({})
    return res.status(200).json({winnerWalletAddress:topUser[0].walletAddress, amount: constant[0].reward })
  }catch(err){
    logger.error(err)
    return res.status(500).json()
  }   
})

router.post("/admin-login",async(req,res)=>{
  const tgId =  req.body?.username;
  const password = req.body?.password;
  const resp = await generateAdminJWTToken(tgId, password);
  const code = resp.success?200:403;
  return res.status(code).json(resp)
})

router.delete("/delete-project/:address", authenticateAdmin, async(req,res)=>{
  try{
    const {address} = req.params;
    const project = await PumpProject.findOne({tokenAddress: address})
    await PumpUser.updateMany({projectId: project._id},{projectId: null, projectTokenAddress: null})
    await PumpProject.deleteOne({ tokenAddress: address });
    return res.status(200).json({success:"true"});
  }catch(err){
    return res.status(500).json(err)
  }
});


router.put("/update-admin", authenticateAdmin, async(req,res)=>{
  const user = req.user;
  const sponsor =  req.body?.sponsor;
  const reward = req.body?.reward;
  const freeplays = req.body?.freeplays;
  const tweetFreePlays = req.body?.tweetFreePlays;
  const sponsorUrl = req.body.sponsorUrl||null;
  const constant = await Constants.findOne({adminTgId:user.tgId})
  constant.sponsor = sponsor??null;
  constant.reward = reward??constant.reward;
  constant.freePlays = freeplays?? constant.freePlays;
  constant.tweetFreePlays = tweetFreePlays?? constant.tweetFreePlays;
  constant.sponsorImageUrl = sponsorUrl??constant.sponsorImageUrl;
  await constant.save();
  return res.json(constant)
})

router.get("/admin-constant", async(req,res)=>{
  // const user = req.user;
  const constant = await Constants.find({});
  console.log(constant)
  return res.json(constant);
})

router.post("/meme", authenticateAdmin, async(req,res)=>{
  try{
    const user = req.user;
    const candleType = req.body?.candleType;
    const text = req.body?.text;
    const what = req.body?.what||null;
    const pos = req.body?.pos||null;
    const image = req.body?.image || null
    let meme = new Meme({
      candleType,
      text,
      what,
      pos,
      image,
    });
    await meme.save()
    return res.json(meme)
  }catch(err){
    res.status(500).json(err)
  }
})

router.put("/meme/:id", authenticateAdmin, async (req, res) => {
  try {
    const memeId = req.params.id;
    const allowedFields = ["candleType", "text", "what", "pos", "image"];
    const updateData = {};

    // Only include fields that are actually provided
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedMeme = await Meme.findByIdAndUpdate(memeId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedMeme) {
      return res.status(404).json({ message: "Meme not found" });
    }

    return res.json(updatedMeme);
  } catch (err) {
    console.error("Error updating meme:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/meme/:id", authenticateAdmin, async (req, res) => {
  try {
    const memeId = req.params.id;
    const deletedMeme = await Meme.findByIdAndDelete(memeId);

    if (!deletedMeme) {
      return res.status(404).json({ message: "Meme not found" });
    }

    return res.json({ message: "Meme deleted successfully", meme: deletedMeme });
  } catch (err) {
    console.error("Error deleting meme:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/add-freeplays/:username", authenticateAdmin, async(req,res)=>{
  try{
    const username = req.params.username;
    const constant = await Constants.find({})
    const freeplaysToAdd = constant[0].freePlays;
    const user = await PumpUser.findOneAndUpdate(
      { username: username },
      { $inc: { freePlaysRemaining: freeplaysToAdd } },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  }catch(err){
    console.log(err)
    return res.status(500).json({message: "Server error"})
  }

})

router.get("/all-memes",authenticateToken, async(req,res)=>{
  const meme = await Meme.find({});
  const CandlesRed = meme.filter((ele)=>ele.candleType=='red')
  const CandlesGreen =  meme.filter((ele)=>ele.candleType=='green')
  const MovingTexts =  meme.filter((ele)=>ele.candleType=='moving')
  return res.json({CandlesRed,CandlesGreen, MovingTexts})
})

router.get("/rank-me", authenticateToken,async (req, res) => {
  const userData = req.user;
  try {
    const user = await PumpUser.findOne({tgId:userData.userId})
    const userRank = await PumpUser.aggregate([
      {
        $sort: {
          highestScore: -1, // ✅ Use correct field
        },
      },
      {
        $group: {
          _id: null,
          users: { $push: { userId: "$_id", score: "$highestScore" } },
        },
      },
      {
        $project: {
          rank: {
            $indexOfArray: ["$users.userId", user._id], // ✅ match by MongoDB _id
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
      tokenAddress: user.projectTokenAddress,
    });

    const resData =  {
      userId: user.tgId,
      userRank: userRank[0]?.rank + 1 || 1,
      projectRank: projectRank[0]?.rank + 1 || 1,
      username: user.username,
      userScore: user.highestScore,
      projectId: user.projectId || null,
      projectName: userProject?.name,
      projectImage: userProject?.imageUrl,
      projectPoints: userProject?.totalPoints || 0,
      avatar: user.avatar,
    }
    return res.json(resData)
  } catch (error) {
    console.error("Error calculating rank:", error);
    return res.status(500).json({ message: "Internal Server Error",});
  }
});

router.get('/rank-players', async(req,res)=>{
  console.log("rank-players")
  
  const leaderboard = await GameDay.aggregate([
    {
      $group: {
        _id: "$userId",
        score: { $max: "$score" },
        playTime: { $first: "$playTime" } // Optional
      }
    },
    {
      $lookup: {
        from: "pumpusers",
        localField: "_id",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "pumpprojects",
        localField: "user.projectId",
        foreignField: "_id",
        as: "project"
      }
    },
    { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        score: 1,
        playTime: 1,
        displayName: "$user.displayName",
        username: "$user.username",
        avatar: "$user.avatar",
        projectTokenAddress: "$user.projectTokenAddress",
        totalPoints: "$project.totalPoints",
        projectName: "$project.name",
        projectImage: "$project.imageUrl"
      }
    },
    {
      $sort: {
        score: -1,
        playTime: -1
      }
    },
    { $limit: 10 }
  ]);
  
  console.log(leaderboard, "leaderboard")
  return res.json(leaderboard)
  
});

router.get('/rank-projects',async (req,res)=>{
  const projects = await PumpProject.find({ totalPoints: { $gt: 0 } })
  .sort({ totalPoints: -1 })
  .limit(10);
  return res.json(projects)
})

router.get("/", authenticateToken,async (req, res) => {
  const user = req.user;
  const userData = await PumpUser.findOne({tgId:user.userId})
  const ms = await remainTimeMs(user.tgId);
  const gameDay = await GameDay.findOne().sort({ score: -1 });
  const project = await PumpProject.findOne({_id: userData?.projectId})
  const resp = {
    telegramId: user.userId,
    username: userData?.username,
    firstName:userData?.firstName,
    maxScore: gameDay?.score || 0,
    maxTime: gameDay?.playTime || 0,
    remainTime: ms,
    avatar: userData?.avatar,
    gameRemaining: userData?.freePlaysRemaining,
    projectName: project?.name||null,
    projectImage: project?.imageUrl||null,
    accessType: userData?.accessType,
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

router.post("/update-project", authenticateToken,async (req, res) => {
  const userData = req.user;
  let user = await PumpUser.findOne({tgId: userData.userId})

  const updateSchema = Joi.object({
    tokenAddress: Joi.string().required(),
  });
  const { error } = updateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  let project = await PumpProject.findOne({tokenAddress:req.body.tokenAddress})
  if(!project){
    console.log("project not found")
    console.log(req.body.tokenAddress, "tokenAddress")
    const meta = await getProjectMetadata(req.body.tokenAddress)
    console.log(meta, "meta")
    project = new PumpProject({
      projectId: req.body.tokenAddress,
      tokenAddress: req.body.tokenAddress,
      playerCount:1,
      name: meta?.name,
      symbol: meta?.symbol,
      imageUrl: meta?.uri,
    })
    await project.save()
  }else {
    project.playerCount = project.playerCount+1;
    await project.save()
  }
  if (user?.projectTokenAddress === req.body.tokenAddress) {
    return res.json({
      success: false,
      message: "You are already part of that project.",
    });
  }
  user.projectTokenAddress = req.body.tokenAddress;
  user.projectId = project._id;
  await user.save();
  return res.json({
    success: true,
    message: "Selected updated project successfully",
    project:project,
  });
});

router.get("/projects", async (req, res) => {
  const projects = await PumpProject.aggregate([
    {
      $project: {
        projectId: 1,
        name: 1,
        points: 1,
        score: 1,
        symbol:1,
        walletAddress: 1,
        projectName: "$name",
        image: "$imageUrl",
        isGolden: "$isGolden",
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

    console.log(projects)
    return res.json({
      projects: projects,
    });
  } catch (error) {
    console.error("Error searching projects:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/referral-data", authenticateToken,async (req, res) => {
  const userData = req.user;
  let user = await PumpUser.findOne({tgId: userData.userId})
  if(!user.inviteCode){
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let inviteCode = '';
    for (let i = 0; i < 8; i++) {
      inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    user.inviteCode = inviteCode;
    
    await user.save()
  }
  console.log(user.inviteCode, "inviteCode")
  const now = new Date();

  // Create a new Date object for tomorrow at 00:00 (midnight)
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // Tomorrow
    0, 0, 0, 0 // At 00:00:00.000
  );

  const remainingTime = midnight - now;
  return res.json({
    referralCode: user.inviteCode,
    remainTime: remainingTime,
    inviteLink: user.inviteCode,
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

router.post("/update-play", authenticateToken ,async (req, res) => {
  const user = req.user;
  const userData = await PumpUser.findOne({tgId:user.userId})
  const updateSchema = Joi.object({
    score: Joi.number().required(),
    playTime: Joi.number().required(),
  });
  const { error } = updateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { score, playTime } = req.body;
    console.log(userData.freePlaysRemaining, "freePlaysRemaining")
    if(Number(userData.freePlaysRemaining) <= 0){
      return res.status(500).json({
        error: "you do not have plays remaining",
      });
    }
    if (score < 1) {
      return res.json({
        success: true,
        message: "Score updated successfully",
        remainTime: await remainTimeMs(user.userId),
      });
    }
    const project = await PumpProject.findOne({
      tokenAddress: userData.projectTokenAddress,
    });
    if (project) {
      project.totalPoints += score;
      await project.save();
    }
    if(userData.accessType=="free"){
      await PumpUser.updateOne(
        { tgId: user.userId },
        {
          $set: { highestScore: Math.max(userData.highestScore, score), totalPlayTime: userData.totalPlayTime+playTime, mcPoints: userData.mcPoints + score, freePlaysRemaining: userData.freePlaysRemaining - 1 },
        }
      );
    }else{
      await PumpUser.updateOne(
        { tgId: user.userId },
        {
          $set: { highestScore: Math.max(userData.highestScore, score), totalPlayTime: userData.totalPlayTime+playTime, mcPoints: userData.mcPoints + score},
        }
      );
    }
    
    const gameDay = new GameDay({
      userId: userData._id,
      score: score,
      playTime: playTime,
      projectName: project?.name || null,
    });
    await gameDay.save()
    const hist = new PumpHist({
      tgId: user.userId,
      score,
      playTime,
      projectName: project?.name || null,
    });
    await hist.save();
    return res.json({
      success: true,
      message: "Score updated successfully",
      remainTime: await remainTimeMs(user.userId),
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({
      error: err,
    });
  }
});

router.get("/history", authenticateToken,async (req, res) => {
  try {
    const user = req.user;
    const query = [
      {
        $match: {
          tgId: user.userId,
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
        $lookup: {
          from: "pumpprojects",
          localField: "user.projectId",
          foreignField: "_id",
          as: "project"
        }
      },
      { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          //date: "$createdAt",
          pName: "$projectName",
          name: "$user.username",
          score: "$score",
          avatar: "$user.avatar",
          projectName: "$project.name",
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

router.get("/profile",authenticateToken ,async (req, res) => {
  try {
    const userData = req.user;
    const user = await PumpUser.findOne({tgId:userData.userId});
    // return userData;

    const cacheKey = cache.generateKey('profile', user.userId);
    
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

router.get("/profileUser",authenticateToken ,async (req, res) => {
  let userheader = req.user;
  let user = await PumpUser.findOne({tgId:userheader.userId})
  return user
})

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
router.get('/profileData', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const userData = await PumpUser.findOne({tgId: user.userId});
        const project = await PumpProject.findOne({tokenAddress:userData.projectTokenAddress})
        const now = new Date();

        // Create a new Date object for tomorrow at 00:00 (midnight)
        const midnight = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1, // Tomorrow
          0, 0, 0, 0 // At 00:00:00.000
        );

        // Return the difference in milliseconds
        const remainingTime = midnight - now;
        res.json({
            tgId: userData?.tgId,
            username: userData?.username,
            displayName: userData?.displayName,
            freePlaysRemaining: userData?.freePlaysRemaining,
            walletAddress: userData?.walletAddress || "",
            projectName: project?.name || "",
            maxScore: userData.mcPoints,
            tokenAddress: userData.projectTokenAddress || "",
            projectPoints: project?.totalPoints || 0,
            remainTime: remainingTime
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
