const mongoose = require("mongoose");

const PumpHistSchema = new mongoose.Schema({
  tgId: {
    required: true,
    type: String,
  },
  score: {
    type: Number,
    default: 0,
  },
  playTime: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
});

module.exports = mongoose.model("PumpHist", PumpHistSchema);
