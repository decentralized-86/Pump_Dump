const mongoose = require('mongoose');

const memeSchema = new mongoose.Schema(
  {
    candleType: {
        type: String,
        enum: ['green', 'red', 'moving'],
        required: true,
    },
    text:{
        type: String,
        required:false
    },
    what: {
      type: String,
      required: false,
    },
    pos: {
        type: String,
        required: false,
    },
    image: {
      type: String,
      required: false
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Meme = mongoose.model('Meme', memeSchema);

module.exports = Meme;
