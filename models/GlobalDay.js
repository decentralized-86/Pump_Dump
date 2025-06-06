const mongoose = require("mongoose");

const GlobalDaySchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // High Score Tracking
  highestScore: {
    type: Number,
    default: 0
  },
  highestScoreUser: {
    type: String,
    ref: 'PumpUser'
  },
  
  // Reward Configuration
  rewardAmount: {
    type: Number,
    default: 126000 // $126,000 default
  },
  rewardClaimed: {
    type: Boolean,
    default: false
  },
  rewardPaidAt: Date,
  rewardTxHash: String,
  
  // Sponsor Info (if any)
  sponsor: {
    name: String,
    logo: String,
    website: String
  },
  
  // Daily Stats
  totalGamesPlayed: {
    type: Number,
    default: 0
  },
  uniquePlayers: {
    type: Number,
    default: 0
  },
  totalPlayers: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
GlobalDaySchema.index({ startTime: -1 });
GlobalDaySchema.index({ isActive: 1 });

// Methods
GlobalDaySchema.methods.isWithinPeriod = function() {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime;
};

GlobalDaySchema.statics.getCurrentDay = async function() {
  return this.findOne({ isActive: true });
};

module.exports = mongoose.model("GlobalDay", GlobalDaySchema); 