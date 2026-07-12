window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderLeaderboard = function renderLeaderboard(elements, players, roundState) {
  const pointsEnabled = roundState.roundSettings.games.pointsGame.enabled;
  const totalHoles = roundState.totalHoles || 18;
  const standings = players
    .map((player) => ({
      player,
      totals: roundState.getPlayerTotals(player),
      pointsResult: roundState.getPointsDifferential(player, "overall")
    }))
    .sort((a, b) => {
      if (pointsEnabled && roundState.isInPoints(a.player) !== roundState.isInPoints(b.player)) {
        return roundState.isInPoints(a.player) ? -1 : 1;
      }

      if (pointsEnabled && b.pointsResult.differential !== a.pointsResult.differential) {
        return b.pointsResult.differential - a.pointsResult.differential;
      }

      if (pointsEnabled && b.totals.points !== a.totals.points) {
        return b.totals.points - a.totals.points;
      }

      return a.totals.gross - b.totals.gross;
    });

  elements.leaderboard.innerHTML = "";

  standings.forEach((standing, index) => {
    const { player, totals } = standing;
    const isDnf = roundState.isPlayerDnf(player);
    const dnfText = roundState.formatDnfStatus(player);
    const frontPointsResult = roundState.getPointsDifferential(player, "front");
    const backPointsResult = roundState.getPointsDifferential(player, "back");
    const overallPointsResult = standing.pointsResult;
    const frontGrossText = roundState.formatGrossTotal(totals, "front");
    const backGrossText = roundState.formatGrossTotal(totals, "back");
    const overallGrossText = roundState.formatGrossTotal(totals, "overall");
    const gameStatus = [
      roundState.isInSkins(player) ? "Skins" : "Not in Skins",
      roundState.isInPoints(player) ? "Points" : "Not in Points",
      player.inTeamChallenge === true ? "Team Event" : "Not in Team Event"
    ].join(" | ");
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.innerHTML = `
      <div class="rank">${index + 1}</div>
      <div>
        <div class="player-name">${player.name}</div>
        <div class="player-details">Index ${player.handicap} | Course Handicap ${roundState.courseHandicaps[player.id]} | ${player.tee} tees</div>
        <div class="player-details">${isDnf ? dnfText : `${totals.holesPlayed}/${totalHoles} holes saved`}</div>
        <div class="player-details">${gameStatus}</div>
      </div>
      <div class="leaderboard-totals">
        ${isDnf ? `<span class="points">DNF</span>` : ""}
        ${!isDnf && pointsEnabled && roundState.isInPoints(player) ? `<span class="points">${overallPointsResult.display}</span>` : ""}
        ${!isDnf && pointsEnabled && !roundState.isInPoints(player) ? `<span class="gross">Not in Points</span>` : ""}
        ${!isDnf && pointsEnabled && roundState.isInPoints(player) ? `<span class="gross">Quota ${frontPointsResult.quota} per side / ${overallPointsResult.target} overall</span>` : ""}
        ${!isDnf && pointsEnabled && roundState.isInPoints(player) ? `<span class="gross">${totals.points} pts earned</span>` : ""}
        ${!isDnf && pointsEnabled && roundState.isInPoints(player) ? `<span class="gross">Front ${frontPointsResult.display} | Back ${backPointsResult.display}</span>` : ""}
        <span class="gross">${overallGrossText}</span>
        <span class="gross">${frontGrossText} | ${backGrossText}</span>
        <span class="gross">${isDnf ? "Excluded from full-round results" : `Net ${totals.net || "-"}`}</span>
      </div>
    `;
    elements.leaderboard.appendChild(row);
  });
};
