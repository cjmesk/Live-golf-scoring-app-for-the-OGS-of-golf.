window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.rules = window.OGSGolf.rules || {};

window.OGSGolf.rules.getPoints = function getPoints(score, par) {
  if (score === null || score === undefined) return 0;

  const difference = Number(score) - par;

  if (difference <= -2) return 6;
  if (difference === -1) return 4;
  if (difference === 0) return 2;
  if (difference === 1) return 1;
  return 0;
};
