# OG's Golf Architecture

OG's Golf is currently a plain HTML, CSS, and JavaScript app. The structure below keeps it simple while making room for league features later.

## Folder Structure

```text
index.html
src/
  app.js
  data/
    course.js
    players.js
  rules/
    handicap.js
    points.js
    skins.js
  state/
    roundState.js
    roundStorage.js
  cloud/
    supabaseConfig.js
    supabaseClient.js
    roundCloudService.js
  ui/
    dom.js
    formatters.js
    setupView.js
    holeView.js
    leaderboardView.js
    pointsPayoutView.js
    skinsView.js
    finalSummaryView.js
  styles/
    main.css
docs/
  ARCHITECTURE.md
```

## Why It Is Organized This Way

`index.html` is the page shell. It should stay small and only contain the permanent places where the app renders content.

`src/app.js` starts the app. It connects data, state, rules, and UI together.

`src/data/course.js` stores course facts: tees, pars, hole handicap rankings, and yardages.

`src/data/players.js` stores player facts: names, GHIN numbers, handicaps, tee choices, and active status.

The master member roster is designed to grow up to 50 active/inactive players. Round setup selects only the players who are playing today.

`src/rules/points.js` stores the points system. League scoring rules belong here so they can be changed without touching the screen layout.

`src/rules/handicap.js` stores Course Handicap, stroke allocation, and net score logic.

`src/rules/skins.js` stores net skins winner logic.

`src/state/roundState.js` stores the current round in progress: current hole, saved scores, draft scores, and score totals.

`src/state/roundStorage.js` keeps localStorage saves. It remains the primary backup even after cloud backup is added.

`src/cloud/supabaseConfig.js` stores the Supabase project URL and anon key.

`src/cloud/supabaseClient.js` creates the Supabase browser client when Supabase is configured and online.

`src/cloud/roundCloudService.js` saves completed rounds to Supabase. It does not do live scoring yet.

`src/ui/dom.js` finds the page elements that JavaScript needs.

`src/ui/formatters.js` holds small display helpers, such as how player details should be shown.

`src/ui/setupView.js` renders the commissioner setup screen and reads the selected course, players, tee overrides, enabled games, and dollar amounts.

Selected round players are grouped in foursomes. The current scoring screen renders one group at a time so a large roster never loads into the scoring view all at once.

`src/ui/holeView.js` renders the one-hole score entry screen.

`src/ui/leaderboardView.js` renders the leaderboard.

`src/ui/pointsPayoutView.js` renders front 9, back 9, and overall points leaders.

`src/ui/skinsView.js` renders total net skins, skin holes by player, and hole-by-hole skin winners.

`src/ui/finalSummaryView.js` renders the end-of-round summary after Hole 18 is saved.

`src/styles/main.css` contains the visual design and mobile layout.

`src/data/course.js` also contains tee Course Rating and Slope Rating. The online scorecard image used for hole data does not display those two values, so they are isolated there for easy correction when confirmed.

## Future Feature Homes

League schedule, seasons, flights, and events should go in `src/data/` first while the app is local-only.

Handicap calculations, skins, net scoring, match play, and tie breakers should go in `src/rules/`.

Saved rounds, local storage, and future database syncing should grow from `src/state/`.

New screens such as league standings, player profiles, and event setup should go in `src/ui/`.
