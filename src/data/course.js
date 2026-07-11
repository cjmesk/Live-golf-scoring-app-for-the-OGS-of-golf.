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

function buildTeeSummary(label, yardages, courseRating, slopeRating, status = "verified", genderRatings = {}) {
  return {
    label,
    par: twelveStonesParByHole.reduce((total, par) => total + par, 0),
    totalYardage: getTotalYardage(yardages),
    courseRating,
    slopeRating,
    genderRatings,
    status
  };
}

const blackYardages = [424, 203, 537, 375, 295, 228, 534, 367, 395, 539, 434, 388, 319, 589, 165, 407, 192, 436];
const silverYardages = [396, 183, 520, 352, 245, 198, 512, 330, 371, 515, 404, 362, 291, 549, 153, 398, 178, 401];
const whiteYardages = [364, 155, 454, 331, 201, 184, 485, 304, 363, 474, 378, 338, 267, 492, 142, 376, 167, 367];
const goldYardages = [331, 131, 437, 324, 195, 164, 442, 263, 324, 444, 373, 315, 237, 448, 136, 351, 161, 338];
const redYardages = [287, 107, 419, 290, 188, 139, 400, 229, 319, 418, 322, 271, 221, 441, 109, 311, 147, 309];

window.OGSGolf.data.courses = [
  {
    id: "twelve-stones",
    name: "Twelve Stones Crossing Golf Club",
    par: 72,
    teeOrder: ["black", "silver", "white", "gold", "red"],
    teeRatings: {
      black: buildTeeSummary("Black", blackYardages, 73.3, 145, "Men's rating and slope confirmed", {
        men: { courseRating: 73.3, slopeRating: 145 }
      }),
      silver: buildTeeSummary("Silver", silverYardages, 71.3, 141, "Men's rating and slope confirmed", {
        men: { courseRating: 71.3, slopeRating: 141 }
      }),
      white: buildTeeSummary("White", whiteYardages, 69.1, 132, "Men's and women's rating and slope confirmed", {
        men: { courseRating: 69.1, slopeRating: 132 },
        women: { courseRating: 75.2, slopeRating: 137 }
      }),
      gold: buildTeeSummary("Gold", goldYardages, 67.5, 122, "Men's rating and slope confirmed", {
        men: { courseRating: 67.5, slopeRating: 122 }
      }),
      red: buildTeeSummary("Red", redYardages, 70.2, 125, "Women's rating and slope confirmed", {
        women: { courseRating: 70.2, slopeRating: 125 }
      })
    },
    tees: {
      black: buildTeeHoles(blackYardages),
      silver: buildTeeHoles(silverYardages),
      white: buildTeeHoles(whiteYardages),
      gold: buildTeeHoles(goldYardages),
      red: buildTeeHoles(redYardages)
    }
  }
];

window.OGSGolf.data.course = window.OGSGolf.data.courses[0];
