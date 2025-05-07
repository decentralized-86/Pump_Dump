const mongoose = require("mongoose");

const PumpUserSchema = new mongoose.Schema({
  tgId: {
    required: true,
    unique: true,
    type: String,
  },
  userId: {
    required: true,
    type: String,
  },
  name: String,
  maxScore: {
    type: Number,
    default: 0,
  },
  maxTime: {
    type: Number,
    default: 0,
  },
  inviteLink: String,
  inviterId: String,
  invitees: {
    type: Array,
    default: [],
  },
  lastLoginAt: {
    type: Date,
    default: new Date(),
  },
  lastDailyReward: {
    type: Number,
    default: 0,
  },
  avatar: {
    type: String,
  },
  walletAddress: {
    type: String,
    default: "",
  },
  isDisplayGlobal: {
    type: Boolean,
    default: true,
  },
  projectId: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("PumpUser", PumpUserSchema);
