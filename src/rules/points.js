window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.rules = window.OGSGolf.rules || {};

window.OGSGolf.rules.getPoints = function getPoints(score, par) {
  if (score === null || score === undefined) return 0;

  const difference = Number(score) - par;

  if (difference <= -3) return 16;
  if (difference === -2) return 8;
  if (difference === -1) return 4;
  if (difference === 0) return 2;
  if (difference === 1) return 1;
  return 0;
};

window.OGSGolf.rules.getHoleResult = function getHoleResult(strokes, par) {
  const difference = Number(strokes) - Number(par);

  if (!Number.isFinite(difference)) return "";
  if (difference <= -4) return "Condor";
  if (difference === -3) return "Albatross";
  if (difference === -2) return "Eagle";
  if (difference === -1) return "Birdie";
  if (difference === 0) return "Par";
  if (difference === 1) return "Bogey";
  if (difference === 2) return "Double Bogey";
  if (difference === 3) return "Triple Bogey";
  if (difference === 4) return "Quadruple Bogey";
  return `+${difference}`;
};
