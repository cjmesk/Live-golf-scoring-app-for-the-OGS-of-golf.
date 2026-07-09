window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.rules = window.OGSGolf.rules || {};

window.OGSGolf.rules.getSkinWinner = function getSkinWinner(holeResults) {
  const skinScores = holeResults.map((result) => result.skinScore ?? result.netScore);
  const lowestSkinScore = Math.min(...skinScores);
  const winners = holeResults.filter((result) => (result.skinScore ?? result.netScore) === lowestSkinScore);

  return winners.length === 1 ? winners[0].playerId : null;
};
