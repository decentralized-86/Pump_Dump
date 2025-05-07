const express = require("express");
const PumpUser = require("../models/PumpUser");
const PumpProject = require("../models/PumpProject");
const fetch = require("node-fetch");

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

module.exports = router;
