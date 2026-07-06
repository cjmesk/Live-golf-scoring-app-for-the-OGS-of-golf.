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
      if (b.totals.points !== a.totals.points) {
        return b.totals.points - a.totals.points;
      }

      return a.totals.gross - b.totals.gross;
    });

  elements.leaderboard.innerHTML = "";

  standings.forEach((standing, index) => {
    const { player, totals } = standing;
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.innerHTML = `
      <div class="rank">${index + 1}</div>
      <div>
        <div class="player-name">${player.name}</div>
        <div class="player-details">${player.tee} tees | ${totals.holesPlayed}/18 holes saved</div>
      </div>
      <div class="leaderboard-totals">
        ${pointsEnabled ? `<span class="points">${totals.points} pts</span>` : ""}
        ${pointsEnabled ? `<span class="gross">F9 ${totals.frontPoints} | B9 ${totals.backPoints}</span>` : ""}
        <span class="gross">Gross ${totals.gross || "-"}</span>
        <span class="gross">Net ${totals.net || "-"}</span>
      </div>
    `;
    elements.leaderboard.appendChild(row);
  });
};
