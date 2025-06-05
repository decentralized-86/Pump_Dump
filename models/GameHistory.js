const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const GameHistory = mongoose.model('GameHistory', gameHistorySchema);

module.exports = GameHistory;
