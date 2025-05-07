const PumpProject = require("../models/PumpProject");

const calculateProjectPrice = (points) => {
  return (points * 1.0) / 50;
};

const calculatePoint = (score) => {
  return (score * score * 1.0) / 10000;
};

const updateBoost = async () => {
  try {
    await PumpProject.updateMany(
      {},
      {
        $set: {
          boostMulti: 1,
        },
      }
    );
    const randomProjects = await PumpProject.aggregate([
      { $sample: { size: 3 } },
    ]);
    if (randomProjects.length > 0) {
      await PumpProject.updateMany(
        {
          _id: {
            $in: randomProjects.map((p) => p._id),
          },
        },
        {
          $set: {
            boostMulti: 2,
          },
        }
      );
    }
  } catch (err) {
    console.error("Error updating boosts:", err);
    throw err;
  }
};

module.exports = { updateBoost, calculateProjectPrice, calculatePoint };
