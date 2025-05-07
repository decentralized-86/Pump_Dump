const PumpUser = require("../models/PumpUser");

const authBean = async (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ message: "Access Denied: No Token Provided" });
  }

  const tgId = req.user.tgId;
  const user = await PumpUser.findOne({
    tgId,
  }).exec();
  if (!user) {
    return res.status(401).json({ message: "Access Denied: Deleted User" });
  }

  if (!req.bean) {
    req.bean = {};
  }
  req.bean.user = user;
  next();
};

module.exports = { authBean };
