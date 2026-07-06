window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.data = window.OGSGolf.data || {};

window.OGSGolf.data.courses = [
{
  id: "twelve-stones",
  name: "Twelve Stones Crossing Golf Club",
  par: 72,
  teeRatings: {
    // The official scorecard image available online does not show rating/slope.
    // Keep these values here so they can be corrected in one place when confirmed.
    white: {
      courseRating: 72,
      slopeRating: 113
    },
    silver: {
      courseRating: 72,
      slopeRating: 113
    }
  },
  tees: {
    silver: [
      { hole: 1, par: 4, handicap: 6, yards: 396 },
      { hole: 2, par: 3, handicap: 4, yards: 183 },
      { hole: 3, par: 5, handicap: 8, yards: 520 },
      { hole: 4, par: 4, handicap: 14, yards: 352 },
      { hole: 5, par: 4, handicap: 18, yards: 245 },
      { hole: 6, par: 3, handicap: 12, yards: 198 },
      { hole: 7, par: 5, handicap: 2, yards: 512 },
      { hole: 8, par: 4, handicap: 16, yards: 330 },
      { hole: 9, par: 4, handicap: 10, yards: 371 },
      { hole: 10, par: 5, handicap: 9, yards: 515 },
      { hole: 11, par: 4, handicap: 7, yards: 404 },
      { hole: 12, par: 4, handicap: 5, yards: 362 },
      { hole: 13, par: 4, handicap: 13, yards: 291 },
      { hole: 14, par: 5, handicap: 3, yards: 549 },
      { hole: 15, par: 3, handicap: 17, yards: 153 },
      { hole: 16, par: 4, handicap: 11, yards: 398 },
      { hole: 17, par: 3, handicap: 15, yards: 178 },
      { hole: 18, par: 4, handicap: 1, yards: 401 }
    ],
    white: [
      { hole: 1, par: 4, handicap: 6, yards: 364 },
      { hole: 2, par: 3, handicap: 4, yards: 155 },
      { hole: 3, par: 5, handicap: 8, yards: 454 },
      { hole: 4, par: 4, handicap: 14, yards: 331 },
      { hole: 5, par: 4, handicap: 18, yards: 201 },
      { hole: 6, par: 3, handicap: 12, yards: 184 },
      { hole: 7, par: 5, handicap: 2, yards: 485 },
      { hole: 8, par: 4, handicap: 16, yards: 304 },
      { hole: 9, par: 4, handicap: 10, yards: 363 },
      { hole: 10, par: 5, handicap: 9, yards: 474 },
      { hole: 11, par: 4, handicap: 7, yards: 378 },
      { hole: 12, par: 4, handicap: 5, yards: 338 },
      { hole: 13, par: 4, handicap: 13, yards: 267 },
      { hole: 14, par: 5, handicap: 3, yards: 492 },
      { hole: 15, par: 3, handicap: 17, yards: 142 },
      { hole: 16, par: 4, handicap: 11, yards: 376 },
      { hole: 17, par: 3, handicap: 15, yards: 167 },
      { hole: 18, par: 4, handicap: 1, yards: 367 }
    ]
  }
}
];

window.OGSGolf.data.course = window.OGSGolf.data.courses[0];
