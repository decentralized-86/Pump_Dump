const mongoose = require("mongoose");

const PumpProjectSchema = new mongoose.Schema({
  projectId: {
    required: true,
    unique: true,
    type: String,
  },
  name: {
    type: String,
    default: 0,
  },
  points: {
    type: Number,
    default: 0,
  },
  walletAddress: {
    type: String,
    default: "",
  },
  imageUrl: {
    type: String,
    default: "",
  },
  boostMulti: {
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model("PumpProject", PumpProjectSchema);
