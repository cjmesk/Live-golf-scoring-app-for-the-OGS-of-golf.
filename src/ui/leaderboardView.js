window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderLeaderboard = function renderLeaderboard(elements, players, roundState) {
  const pointsEnabled = roundState.roundSettings.games.pointsGame.enabled;
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
    const frontPointsResult = roundState.getPointsDifferential(player, "front");
    const backPointsResult = roundState.getPointsDifferential(player, "back");
    const overallPointsResult = standing.pointsResult;
    const frontGrossText = roundState.formatGrossTotal(totals, "front");
    const backGrossText = roundState.formatGrossTotal(totals, "back");
    const overallGrossText = roundState.formatGrossTotal(totals, "overall");
    const gameStatus = [
      roundState.isInSkins(player) ? "Skins" : "Not in Skins",
      roundState.isInPoints(player) ? "Points" : "Not in Points",
      player.inClosestToPin !== false ? "CTP" : "Not in CTP",
      player.inLongDrive !== false ? "Long Drive" : "Not in Long Drive"
    ].join(" | ");
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.innerHTML = `
      <div class="rank">${index + 1}</div>
      <div>
        <div class="player-name">${player.name}</div>
        <div class="player-details">Index ${player.handicap} | Course Handicap ${roundState.courseHandicaps[player.id]} | ${player.tee} tees</div>
        <div class="player-details">${totals.holesPlayed}/18 holes saved</div>
        <div class="player-details">${gameStatus}</div>
      </div>
      <div class="leaderboard-totals">
        ${pointsEnabled && roundState.isInPoints(player) ? `<span class="points">${overallPointsResult.display}</span>` : ""}
        ${pointsEnabled && !roundState.isInPoints(player) ? `<span class="gross">Not in Points</span>` : ""}
        ${pointsEnabled && roundState.isInPoints(player) ? `<span class="gross">Quota ${frontPointsResult.quota} per side / ${overallPointsResult.target} overall</span>` : ""}
        ${pointsEnabled && roundState.isInPoints(player) ? `<span class="gross">${totals.points} pts earned</span>` : ""}
        ${pointsEnabled && roundState.isInPoints(player) ? `<span class="gross">Front ${frontPointsResult.display} | Back ${backPointsResult.display}</span>` : ""}
        <span class="gross">${overallGrossText}</span>
        <span class="gross">${frontGrossText} | ${backGrossText}</span>
        <span class="gross">Net ${totals.net || "-"}</span>
      </div>
    `;
    elements.leaderboard.appendChild(row);
  });
};
