const PumpHist = require("../models/PumpHist");
const { configs } = require("../utils/val");

async function remainTimeMs(tgId) {
  try {
    const currentDate = new Date();
    const results = await PumpHist.aggregate([
      {
        $match: {
          tgId,
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
      { $limit: configs.checkRemainTimeDocuments },
      {
        $addFields: {
          timeDifference: { $subtract: [currentDate, "$createdAt"] },
        },
      },
      {
        $project: {
          _id: 0,
          timeDifference: 1,
        },
      },
    ]);

    if (results.length < configs.checkRemainTimeDocuments) {
      return 0;
    }

    const totalTimeDifference = results.reduce(
      (sum, record) => sum + record.timeDifference,
      0
    );

    const remainTime =
      configs.checkEachRemainTime -
      totalTimeDifference / configs.checkRemainTimeDocuments;
    return Math.max(remainTime, 0);
  } catch (error) {
    console.error("Error fetching records:", error);
    return 0;
  }
}

module.exports = { remainTimeMs };
