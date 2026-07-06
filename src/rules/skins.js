window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.rules = window.OGSGolf.rules || {};

window.OGSGolf.rules.getSkinWinner = function getSkinWinner(holeResults) {
  const netScores = holeResults.map((result) => result.netScore);
  const lowestNetScore = Math.min(...netScores);
  const winners = holeResults.filter((result) => result.netScore === lowestNetScore);

  return winners.length === 1 ? winners[0].playerId : null;
};
