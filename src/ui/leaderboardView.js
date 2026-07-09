window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderLeaderboard = function renderLeaderboard(elements, players, roundState) {
  const pointsEnabled = roundState.roundSettings.games.pointsGame.enabled;
  const standings = players
    .map((player) => ({
      player,
      totals: roundState.getPlayerTotals(player)
    }))
    .sort((a, b) => {
      if (pointsEnabled && roundState.isInPoints(a.player) !== roundState.isInPoints(b.player)) {
        return roundState.isInPoints(a.player) ? -1 : 1;
      }

      if (pointsEnabled && b.totals.points !== a.totals.points) {
        return b.totals.points - a.totals.points;
      }

      return a.totals.gross - b.totals.gross;
    });

  elements.leaderboard.innerHTML = "";

  standings.forEach((standing, index) => {
    const { player, totals } = standing;
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
        <div class="player-details">${player.tee} tees | ${totals.holesPlayed}/18 holes saved</div>
        <div class="player-details">${gameStatus}</div>
      </div>
      <div class="leaderboard-totals">
        ${pointsEnabled && roundState.isInPoints(player) ? `<span class="points">${totals.points} pts</span>` : ""}
        ${pointsEnabled && !roundState.isInPoints(player) ? `<span class="gross">Not in Points</span>` : ""}
        ${pointsEnabled && roundState.isInPoints(player) ? `<span class="gross">F9 ${totals.frontPoints} | B9 ${totals.backPoints}</span>` : ""}
        <span class="gross">Gross ${totals.gross || "-"}</span>
        <span class="gross">Net ${totals.net || "-"}</span>
      </div>
    `;
    elements.leaderboard.appendChild(row);
  });
};
