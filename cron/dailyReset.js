const cron = require('node-cron');
const moment = require('moment-timezone');
const {sendTokens, getTokenHolder} = require('../services/web3')
const GameDay = require('../models/GameDay');
const PumpUser = require("../models/PumpUser");
const PumpProject = require("../models/PumpProject");
const logger = require("../services/logger");
const Constants = require("../models/Constants");
const {
  PublicKey,
} = require('@solana/web3.js');
require('dotenv').config();
const logger = require('./logger');
require('dotenv').config();

const sendReward = async()=>{
    try{
        const topUser = await GameDay.aggregate([
            {
              $sort: {
                score: -1,       
                playTime: 1  
              }
            },
            {
              $limit: 1  
            },
            {
              $lookup: {
                from: 'pumpusers',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
              }
            },
            {
              $unwind: '$user'
            },
            {
              $project: {
                _id: 0,
                userId: 1,
                score: 1,
                playTime: 1,
                walletAddress: '$user.walletAddress',
                username: '$user.username'
              }
            }
        ]);
        console.log(topUser, "topuser from cron")
        const constant = await Constants.find({})
        await sendTokens(topUser[0].walletAddress, constant[0].reward)
    }catch(err){
        logger.error(err)
    }   
}

const reset = async()=>{
    try{
        await GameDay.deleteMany({});
        await PumpUser.updateMany({}, { $set: { highestScore: 0, mcPoints: 0 ,tweetVerifiedToday: false} });
        await PumpUser.updateMany(
          { accessType: "paid" },         
          { $set: { accessType: "free" } } 
        );
        await PumpProject.updateMany({},{ $set: { totalPoints :0 } })
    }catch(err){
        logger.err(err)
    }
}

const checAndUpdateTokenHolder = async()=>{
  try{
    const users = await PumpUser.find({ walletAddress: { $exists: true, $ne: null } });
    for (const user of users) {
      const publicKey = new PublicKey(user.walletAddress);
      const isTokenHolder = await getTokenHolder(publicKey)
      if(isTokenHolder) {
        await PumpUser.updateOne(
          { _id: user._id },
          { $set: { accessType: 'token_holder'} }
        );
      }
      else{
        if(user.accessType=='token_holder'){
          await PumpUser.updateOne(
            { _id: user._id },
            { $set: { accessType: 'free'} }
          );
        }
      }
    }
  }catch(err){
    logger.err(err)
  }
}

const scheduleDailyReset = () => {
  cron.schedule('0 0 * * *', async () => {
    const nowEST = moment().tz('America/New_York').format();
    console.log(`🔁 Running daily reset at midnight EST... [${nowEST}]`);

    console.log('Resetting DB...');
    await reset();
    await checAndUpdateTokenHolder();
  }, {
    timezone: 'America/New_York'  // Handles EST/EDT automatically
  });
};

module.exports = scheduleDailyReset;
