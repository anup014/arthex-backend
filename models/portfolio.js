const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  averagePrice: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Portfolio", portfolioSchema);