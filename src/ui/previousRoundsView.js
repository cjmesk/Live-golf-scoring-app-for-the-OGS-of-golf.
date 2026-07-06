window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderPreviousRounds = function renderPreviousRounds(elements, rounds) {
  const sortedRounds = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedRounds.length === 0) {
    elements.previousRoundsList.innerHTML = `
      <div class="empty-state">No completed rounds saved yet.</div>
    `;
    return;
  }

  elements.previousRoundsList.innerHTML = sortedRounds
    .map((round) => {
      const roundDate = new Date(round.date).toLocaleDateString();
      const winners = round.winners;
      const grossWinner = winners.gross.leaders.map((item) => item.player.name).join(", ");
      const pointsWinner = winners.overallPoints.leaders.map((item) => item.player.name).join(", ");
      const maxSkins = Math.max(...round.totals.map((total) => total.skinsWon));
      const skinsWinner = maxSkins > 0
        ? round.totals
            .filter((total) => total.skinsWon === maxSkins)
            .map((total) => total.playerName)
            .join(", ")
        : "No skins";
      const totals = round.totals
        .map((total) => `
          <div class="previous-total-row">
            <span>${total.playerName}</span>
            <small>Gross ${total.gross} | Net ${total.net} | ${total.points} pts | Skins ${total.skinsWon}</small>
          </div>
        `)
        .join("");

      return `
        <article class="previous-round-card">
          <div class="previous-round-header">
            <div>
              <strong>${round.course.name}</strong>
              <span>${roundDate}</span>
            </div>
          </div>
          <div class="player-details">Winner: ${grossWinner}</div>
          <div class="player-details">Points Winner: ${pointsWinner}</div>
          <div class="player-details">Skins Winner: ${skinsWinner}</div>
          <div class="previous-total-list">${totals}</div>
        </article>
      `;
    })
    .join("");
};
