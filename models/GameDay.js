const mongoose = require('mongoose');

const gameDaySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PumpUser',
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    playTime: {
      type: Number,
      required: true,
    },
    projectName: {
      type: String,
      required: false,
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const GameDay = mongoose.model('GameDay', gameDaySchema);

module.exports = GameDay;
