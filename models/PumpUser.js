const mongoose = require("mongoose");

const PumpUserSchema = new mongoose.Schema({
  // Telegram User Data
  tgId: {
    required: true,
    unique: true,
    type: String,
  },
  username: {
    type: String,
    required: true
  },
  firstName: String,
  lastName: String,
  languageCode: String,
  
  // Game Profile
  displayName: {
    type: String,
    required: true
  },
  isDisplayGlobal: {
    type: Boolean,
    default: true,
  },
  avatar: String,
  
  // Game Stats
  mcPoints: {
    type: Number,
    default: 0
  },
  highestScore: {
    type: Number,
    default: 0,
  },
  totalPlayTime: {
    type: Number,
    default: 0,
  },
  
  // Project/Team Data
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PumpProject',
    required: false,
  },

  projectTokenAddress: {
    type: String,
    default: null,
    requried: false
  },
  
  // Wallet & Access
  walletAddress: {
    type: String,
    default: null,
    sparse: true
  },
  walletVerifiedAt: Date,
  accessType: {
    type: String,
    enum: ['free', 'token_holder', 'paid'],
    default: 'free'
  },
  
  // Play Tracking
  freePlaysRemaining: {
    type: Number,
    default: 10,
    min: [0, 'freePlaysRemaining cannot be negative'],
  },
  currentGlobalDayId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GlobalDay'
  },
  tweetVerifiedToday: {
    type: Boolean,
    default: false
  },
  lastTweetVerification: {
    tweetId: String,
    verifiedAt: Date
  },
  paidAccessUntil: Date,
  
  // Game History
  gameHistory: [{
    score: Number,
    playTime: Number,
    projectId: String,
    globalDayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalDay'
    },
    playedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Daily High Scores
  dailyHighScores: [{
    score: Number,
    globalDayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalDay'
    },
    achievedAt: Date,
    rewardAmount: Number,
    rewardClaimed: Boolean,
    rewardTxHash: String
  }],
  
  // Social & Rewards
  tweetVerifications: [{
    tweetId: String,
    verifiedAt: Date,
    rewardType: String,
    rewardAmount: Number
  }],
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  invitedBy: String,
  invitees: [{
    userId: String,
    joinedAt: Date
  }],
  
  // Daily Rewards
  lastDailyReward: {
    claimedAt: Date,
    amount: Number
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
PumpUserSchema.index({ mcPoints: -1 }); // For leaderboard queries
PumpUserSchema.index({ walletAddress: 1 }); // For wallet verification
PumpUserSchema.index({ currentGlobalDayId: 1 }); // For global day queries

// Methods
PumpUserSchema.methods.canPlay = async function() {
  if (this.accessType === 'token_holder') return true;
  if (this.accessType === 'paid') {
    const globalDay = await mongoose.model('GlobalDay').getCurrentDay();
    return globalDay.isWithinPeriod();
  }
  return this.freePlaysRemaining > 0 || !this.tweetVerifiedToday;
};

PumpUserSchema.methods.deductPlay = async function() {
  if (this.accessType === 'free' && this.freePlaysRemaining > 0) {
    this.freePlaysRemaining--;
    await this.save();
  }
};

// Update lastActive timestamp before save
PumpUserSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

module.exports = mongoose.model("PumpUser", PumpUserSchema);
