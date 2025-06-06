const mongoose = require('mongoose');
const { GlobalDay, PumpUser, PumpProject } = require('../models');
const logger = require('./logger');

// Helper to get EST midnight
const getESTMidnight = (date = new Date()) => {
  const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  estDate.setHours(0, 0, 0, 0);
  return estDate;
};

// Helper to get next EST midnight
const getNextESTMidnight = (date = new Date()) => {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  return getESTMidnight(nextDay);
};

const globalDayService = {
  async getCurrentDay() {
    let currentDay = await GlobalDay.findOne({ isActive: true });
    if (!currentDay) {
      // Create new day if none exists
      currentDay = await this.createNewDay();
    }
    return currentDay;
  },

  async createNewDay() {
    const startTime = getESTMidnight();
    const endTime = getNextESTMidnight();

    const newDay = new GlobalDay({
      startTime,
      endTime,
      isActive: true
    });

    await newDay.save();
    return newDay;
  },

  async resetGlobalDay() {
    // Get current active day
    const currentDay = await GlobalDay.findOne({ isActive: true });
    if (!currentDay) return;

    // Mark current day as inactive
    currentDay.isActive = false;
    await currentDay.save();

    // Create new day
    const newDay = await this.createNewDay();

    // Reset all projects
    const projects = await PumpProject.find({});
    await Promise.all(projects.map(project => project.resetDaily(newDay._id)));

    // Reset all users
    await PumpUser.updateMany({}, {
      $set: {
        freePlaysRemaining: 10,
        currentGlobalDayId: newDay._id,
        tweetVerifiedToday: false
      }
    });

    return newDay;
  },

  async checkAndResetDay() {
    const currentDay = await this.getCurrentDay();
    const now = new Date();
    
    if (now >= currentDay.endTime) {
      return await this.resetGlobalDay();
    }
    
    return currentDay;
  },

  async getDailyLeaderboard(limit = 10) {
    const currentDay = await this.getCurrentDay();
    
    const sessions = await mongoose.model('GameSession')
      .find({ globalDayId: currentDay._id })
      .sort({ currentScore: -1 })
      .limit(limit)
      .populate('userId', 'displayName avatar');
      
    return sessions.map(session => ({
      userId: session.userId,
      displayName: session.userId.displayName,
      avatar: session.userId.avatar,
      score: session.currentScore,
      playedAt: session.endedAt
    }));
  },

  async getProjectLeaderboard(limit = 10) {
    const currentDay = await this.getCurrentDay();
    
    const projects = await PumpProject.find({ currentGlobalDayId: currentDay._id })
      .sort({ dailyPoints: -1 })
      .limit(limit)
      .select('name imageUrl dailyPoints playerCount');
      
    return projects.map(project => ({
      name: project.name,
      imageUrl: project.imageUrl,
      points: project.dailyPoints,
      players: project.playerCount
    }));
  }
};

module.exports = globalDayService; 