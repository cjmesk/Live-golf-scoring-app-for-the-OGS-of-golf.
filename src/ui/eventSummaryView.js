window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderEventSummary = function renderEventSummary(elements, roundSettings) {
  const { getCourseHandicap } = window.OGSGolf.rules;
  const eventDate = new Date().toLocaleDateString();
  function getPointsQuota(courseHandicap) {
    return Math.ceil((36 - (courseHandicap * 2)) * 2) / 2;
  }

  const playerRows = roundSettings.players
    .map((player) => {
      const courseHandicap = getCourseHandicap(player, roundSettings.course);
      const quota = getPointsQuota(courseHandicap);

      return `
        <div class="summary-row">
          <span>${player.name}</span>
          <strong>${player.tee} tees</strong>
          <small>Index ${player.handicap} | Course Handicap ${courseHandicap}</small>
          <small>Points Quota: ${quota} per side / ${quota * 2} overall</small>
        </div>
      `;
    })
    .join("");
  const groupRows = roundSettings.groups
    .map((group, index) => {
      const playerNames = group
        .map((playerId) => roundSettings.players.find((player) => player.id === playerId)?.name)
        .filter(Boolean)
        .join(", ");
      const scorer = roundSettings.players.find((player) => player.id === roundSettings.groupScorers?.[index]);

      return `
        <div class="summary-row">
          <span>Group ${index + 1}</span>
          <strong>${group.length} players</strong>
          <small>${playerNames}</small>
          <small>Scorer: ${scorer?.name || "Not assigned"}</small>
        </div>
      `;
    })
    .join("");

  const gameRows = [
    {
      key: "pointsGame",
      label: "Points",
      players: roundSettings.players.filter((player) => player.inPoints).length
    },
    {
      key: "netSkins",
      label: "Skins",
      players: roundSettings.players.filter((player) => player.inSkins).length
    },
    {
      key: "teamChallenge",
      label: "Team Challenge",
      players: roundSettings.players.length
    },
    {
      key: "closestToPin",
      label: "Closest to Pin",
      players: roundSettings.players.filter((player) => player.inClosestToPin).length
    },
    {
      key: "longDrive",
      label: "Long Drive",
      players: roundSettings.players.filter((player) => player.inLongDrive).length
    }
  ];
  let estimatedPurse = 0;
  const teamRows = Object.entries(roundSettings.teamAssignments || {})
    .reduce((teams, [playerId, teamId]) => {
      teams[teamId] = teams[teamId] || [];
      const playerName = roundSettings.players.find((player) => player.id === playerId)?.name;

      if (playerName) {
        teams[teamId].push(playerName);
      }

      return teams;
    }, {});
  const teamAssignmentRows = Object.entries(teamRows)
    .sort(([firstTeam], [secondTeam]) => firstTeam.localeCompare(secondTeam))
    .map(([teamId, playerNames]) => `
      <div class="summary-row">
        <span>${teamId.replace("team-", "Team ")}</span>
        <strong>${playerNames.length} players</strong>
        <small>${playerNames.join(", ")}</small>
      </div>
    `)
    .join("");
  const activeGameRows = gameRows
    .filter((game) => roundSettings.games[game.key]?.enabled)
    .map((game) => {
      const amount = Number(roundSettings.games[game.key]?.amount || 0);
      const purse = game.players * amount;
      const extraText = game.key === "netSkins"
        ? ` | ${roundSettings.games.netSkins.skinsHandicapMode === "full" ? "Full Handicap" : "Half Handicap"}`
        : "";
      estimatedPurse += purse;

      return `
        <div class="summary-row">
          <span>${game.label}</span>
          <strong>$${amount}</strong>
          <small>${game.players} players | Estimated purse $${purse}${extraText}</small>
        </div>
      `;
    })
    .join("");

  elements.eventSummary.innerHTML = `
    <section class="summary-block">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Course</span>
          <strong>${roundSettings.course.name}</strong>
        </div>
        <div class="summary-card">
          <span>Date</span>
          <strong>${eventDate}</strong>
        </div>
        <div class="summary-card">
          <span>Players</span>
          <strong>${roundSettings.players.length}</strong>
        </div>
        <div class="summary-card">
          <span>Estimated Total Purse</span>
          <strong>$${estimatedPurse}</strong>
          <small>Final payouts not calculated yet</small>
        </div>
      </div>
    </section>

    <section class="summary-block">
      <h3>Groups</h3>
      <div class="summary-list">${groupRows}</div>
    </section>

    <section class="summary-block">
      <h3>Players, Tees, Handicaps, and Quotas</h3>
      <div class="summary-list">${playerRows}</div>
    </section>

    <section class="summary-block">
      <h3>Active Games and Buy-ins</h3>
      <div class="summary-list">
        ${activeGameRows || `<p class="empty-state">No games enabled.</p>`}
      </div>
    </section>

    ${roundSettings.games.teamChallenge?.enabled ? `
      <section class="summary-block">
        <h3>Team Challenge Teams</h3>
        <div class="summary-list">
          ${teamAssignmentRows || `<p class="empty-state">No teams assigned yet.</p>`}
        </div>
      </section>
    ` : ""}
  `;
};
