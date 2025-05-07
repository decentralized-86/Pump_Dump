const express = require("express");
const PumpUser = require("../models/PumpUser");
const logger = require("../services/logger");
const PumpHist = require("../models/PumpHist");
const Joi = require("joi");
const PumpProject = require("../models/PumpProject");
const { calculatePoint } = require("../utils/calc");
const { remainTimeMs } = require("../services/remain");

const router = express.Router();

router.get("/rank-me", async (req, res) => {
  const user = req.bean.user;
  try {
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

    const myUserRank = userRank[0]?.rank + 1 || 1;

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

    const myProjectRank = projectRank[0]?.rank + 1 || 1;

    const userProject = await PumpProject.findOne({
      projectId: user.projectId,
    });

    return res.json({
      userId: user.userId,
      userRank: myUserRank,
      projectRank: myProjectRank,
      userScore: user.maxScore,
      projectId: user.projectId || null,
      projectName: userProject?.name,
      projectPoints: userProject?.points || 0,
      avatar: user.avatar,
    });
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
    return res.json({
      name: user.userId,
      walletAddress: user.walletAddress,
      maxScore: user.maxScore,
      avatar: user.avatar,
      remainTime: await remainTimeMs(user.tgId),
      projectPoints,
      projectName,
      projectWalletAddress,
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
