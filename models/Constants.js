const mongoose = require('mongoose');

const constantsSchema = new mongoose.Schema(
  {
    adminTgId: {
      type: String,
      required: true,
    },
    sponsor:{
        type: String,
        required:false
    },
    reward: {
      type: Number,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    adminUserName: {
      type: String,
      required: true
    },
    freePlays: {
      type: Number,
      required: true,
    },
    tweetFreePlays: {
      type: Number,
      requied:true,
    },
    buyAmount: {
      type: Number,
      required: true
    },
    sponsorImageUrl: {
      type: String,
      required: true,
    },
    tokenHolderAmount: {
      type:Number,
      required:true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Constant = mongoose.model('Constant', constantsSchema);

module.exports = Constant;
