const mongoose = require("mongoose");

const GameSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PumpUser',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PumpProject',
    required: true
  },
  globalDayId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GlobalDay',
    required: true
  },
  
  // Game State
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active'
  },
  currentScore: {
    type: Number,
    default: 0
  },
  highScore: {
    type: Number,
    default: 0
  },
  lastPlayedAt: {
    type: Date,
    default: Date.now
  },
  playCount: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date
  },
  playTime: Number, // in seconds
  
  // Access Type Used
  accessType: {
    type: String,
    enum: ['free', 'token_holder', 'paid'],
    required: true
  },
  
  // Rewards
  mcPointsEarned: {
    type: Number,
    default: 0
  },
  isHighScore: {
    type: Boolean,
    default: false
  },
  isDailyHighScore: {
    type: Boolean,
    default: false
  },
  
  // Game Metadata
  deviceInfo: {
    platform: String,
    language: String,
    version: String
  }
}, {
  timestamps: true
});

// Indexes
GameSessionSchema.index({ userId: 1, globalDayId: 1 });
GameSessionSchema.index({ projectId: 1, globalDayId: 1 });
GameSessionSchema.index({ globalDayId: 1, currentScore: -1 });

// Methods
GameSessionSchema.methods.calculateScore = function() {
  // 5k points per obstacle
  return this.obstaclesPassed * 5000;
};

GameSessionSchema.methods.endSession = async function() {
  if (this.status === 'active') {
    this.status = 'completed';
    this.endedAt = new Date();
    this.playTime = Math.floor((this.endedAt - this.startedAt) / 1000);
    this.currentScore = this.calculateScore();
    
    // Update user and project stats
    const [user, project, globalDay] = await Promise.all([
      mongoose.model('PumpUser').findOne({ tgId: this.userId }),
      this.projectId ? mongoose.model('PumpProject').findOne({ projectId: this.projectId }) : null,
      mongoose.model('GlobalDay').findById(this.globalDayId)
    ]);

    if (user) {
      // Update user stats
      if (this.currentScore > user.highestScore) {
        user.highestScore = this.currentScore;
        this.isHighScore = true;
      }
      user.totalPlayTime += this.playTime;
      user.mcPoints += this.mcPointsEarned;
      await user.save();
    }

    if (project) {
      // Update project stats
      project.totalGamesPlayed++;
      if (this.currentScore > (project.dailyHighScore?.score || 0)) {
        project.dailyHighScore = {
          score: this.currentScore,
          userId: this.userId,
          achievedAt: new Date()
        };
      }
      await project.save();
    }

    if (globalDay) {
      // Update global day stats
      globalDay.totalGamesPlayed++;
      if (this.currentScore > globalDay.highestScore) {
        globalDay.highestScore = this.currentScore;
        globalDay.highestScoreUser = this.userId;
        this.isDailyHighScore = true;
      }
      await globalDay.save();
    }

    await this.save();
  }
};

// Update highScore if currentScore is higher
GameSessionSchema.pre('save', function(next) {
  if (this.currentScore > this.highScore) {
    this.highScore = this.currentScore;
  }
  this.lastPlayedAt = new Date();
  this.playCount += 1;
  next();
});

module.exports = mongoose.model("GameSession", GameSessionSchema); 