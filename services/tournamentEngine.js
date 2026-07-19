async function updateLeaderboard(tournamentId) {
  const entries = await TournamentEntry.find({ tournamentId });

  for (let entry of entries) {
    const portfolioValue = await calculatePortfolio(entry.userId);

    entry.currentValue = portfolioValue;

    entry.returnPercent =
      ((portfolioValue - entry.startingCapital) /
        entry.startingCapital) * 100;

    await entry.save();
  }

  const leaderboard = await TournamentEntry.find({ tournamentId })
    .sort({ returnPercent: -1 })
    .limit(10);

  io.emit("leaderboard-update", leaderboard);
}