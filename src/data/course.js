window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.data = window.OGSGolf.data || {};

const twelveStonesParByHole = [4, 3, 5, 4, 4, 3, 5, 4, 4, 5, 4, 4, 4, 5, 3, 4, 3, 4];
const twelveStonesHandicapByHole = [6, 4, 8, 14, 18, 12, 2, 16, 10, 9, 7, 5, 13, 3, 17, 11, 15, 1];

function buildTeeHoles(yardages, status = "verified") {
  return twelveStonesParByHole.map((par, index) => ({
    hole: index + 1,
    par,
    handicap: twelveStonesHandicapByHole[index],
    yards: yardages[index],
    status
  }));
}

function getTotalYardage(yardages) {
  if (yardages.some((yards) => yards === null)) {
    return null;
  }

  return yardages.reduce((total, yards) => total + yards, 0);
}

function buildTeeSummary(label, yardages, courseRating, slopeRating, status = "verified") {
  return {
    label,
    par: twelveStonesParByHole.reduce((total, par) => total + par, 0),
    totalYardage: getTotalYardage(yardages),
    courseRating,
    slopeRating,
    status
  };
}

const blackYardages = Array(18).fill(null);
const silverYardages = [396, 183, 520, 352, 245, 198, 512, 330, 371, 515, 404, 362, 291, 549, 153, 398, 178, 401];
const whiteYardages = [364, 155, 454, 331, 201, 184, 485, 304, 363, 474, 378, 338, 267, 492, 142, 376, 167, 367];
const goldYardages = Array(18).fill(null);
const redYardages = Array(18).fill(null);

window.OGSGolf.data.courses = [
  {
    id: "twelve-stones",
    name: "Twelve Stones Crossing Golf Club",
    par: 72,
    teeOrder: ["black", "silver", "white", "gold", "red"],
    teeRatings: {
      black: buildTeeSummary("Black", blackYardages, 72, 113, "TODO: confirm official yardages, course rating, and slope rating"),
      silver: buildTeeSummary("Silver", silverYardages, 72, 113, "TODO: confirm official course rating and slope rating"),
      white: buildTeeSummary("White", whiteYardages, 72, 113, "TODO: confirm official course rating and slope rating"),
      gold: buildTeeSummary("Gold", goldYardages, 72, 113, "TODO: confirm official yardages, course rating, and slope rating"),
      red: buildTeeSummary("Red", redYardages, 72, 113, "TODO: confirm official yardages, course rating, and slope rating")
    },
    tees: {
      black: buildTeeHoles(blackYardages, "TODO: confirm official Black tee yardage"),
      silver: buildTeeHoles(silverYardages),
      white: buildTeeHoles(whiteYardages),
      gold: buildTeeHoles(goldYardages, "TODO: confirm official Gold tee yardage"),
      red: buildTeeHoles(redYardages, "TODO: confirm official Red tee yardage")
    }
  }
];

window.OGSGolf.data.course = window.OGSGolf.data.courses[0];
