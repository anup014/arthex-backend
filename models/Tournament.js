const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  type: {
    type: String,
    enum: ["daily", "weekly"],
    required: true,
    lowercase: true,   // 🔥 automatically converts to lowercase
  },

  startTime: {
    type: Date,
    required: true,
  },

  endTime: {
    type: Date,
    required: true,
  },

  maxParticipants: {
    type: Number,
    default: 100,
  },

  startingCapital: {
    type: Number,
    default: 100000,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Tournament", tournamentSchema);