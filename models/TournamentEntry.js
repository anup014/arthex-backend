const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  startingCapital: Number,
  currentValue: Number,
  returnPercent: Number,
});

module.exports = mongoose.model("TournamentEntry", entrySchema);