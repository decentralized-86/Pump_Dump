const mongoose = require("mongoose");

const PumpProjectSchema = new mongoose.Schema({
  projectId: {
    required: true,
    unique: true,
    type: String,
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  imageUrl: {
    type: String,
    required: true
  },
  website: {
    type: String
  },
  twitter: {
    type: String
  },
  telegram: {
    type: String
  },
  
  // Project Stats
  totalPoints: {
    type: Number,
    default: 0,
  },
  playerCount: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: 0
  },
  
  // Project Configuration
  walletAddress: {
    type: String,
    required: true
  },
  minTokensRequired: {
    type: Number,
    default: 100000 // 100k PUMPSHIE tokens
  },
  
  // Daily Stats
  currentGlobalDayId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GlobalDay'
  },
  dailyPoints: {
    type: Number,
    default: 0
  },
  dailyHighScore: {
    score: Number,
    userId: String,
    achievedAt: Date
  },
  
  // Historical Data
  totalGamesPlayed: {
    type: Number,
    default: 0
  },
  historicalHighScore: {
    score: Number,
    userId: String,
    achievedAt: Date
  },
  
  // Active Players
  activePlayers: [{
    userId: String,
    joinedAt: Date,
    totalPoints: Number,
    dailyPoints: {
      type: Number,
      default: 0
    }
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
PumpProjectSchema.index({ totalPoints: -1 }); // For project leaderboard
PumpProjectSchema.index({ dailyPoints: -1 }); // For daily project rankings
PumpProjectSchema.index({ playerCount: -1 }); // For popularity sorting
PumpProjectSchema.index({ currentGlobalDayId: 1 }); // For global day queries
PumpProjectSchema.index({ isActive: 1 });
PumpProjectSchema.index({ currentGlobalDayId: 1, dailyPoints: -1 });

// Methods
PumpProjectSchema.methods.resetDaily = async function(newGlobalDayId) {
  // Store historical high score if current daily is higher
  if (this.dailyHighScore && (!this.historicalHighScore || this.dailyHighScore.score > this.historicalHighScore.score)) {
    this.historicalHighScore = this.dailyHighScore;
  }
  
  // Reset daily stats
  this.dailyPoints = 0;
  this.dailyHighScore = null;
  this.currentGlobalDayId = newGlobalDayId;
  this.playerCount = 0;
  
  // Reset daily points for active players
  this.activePlayers.forEach(player => {
    player.dailyPoints = 0;
  });
  
  await this.save();
};

PumpProjectSchema.methods.addPoints = async function(userId, points) {
  // Update total points
  this.totalPoints += points;
  
  // Update daily points
  this.dailyPoints += points;
  
  // Update or add player
  let player = this.activePlayers.find(p => p.userId === userId);
  if (player) {
    player.totalPoints += points;
    player.dailyPoints += points;
  } else {
    this.activePlayers.push({
      userId,
      joinedAt: new Date(),
      totalPoints: points,
      dailyPoints: points
    });
    this.playerCount++;
  }
  
  await this.save();
};

module.exports = mongoose.model("PumpProject", PumpProjectSchema);
