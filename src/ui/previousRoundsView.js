window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

function getLeaderNames(winner) {
  if (!winner || !winner.leaders || winner.leaders.length === 0) {
    return "Not available";
  }

  return winner.leaders.map((item) => item.player.name).join(", ");
}

function getSkinsWinner(round) {
  if (!round.totals || round.totals.length === 0) {
    return "Not available";
  }

  const maxSkins = Math.max(...round.totals.map((total) => total.skinsWon || 0));

  if (maxSkins === 0) {
    return "No skins";
  }

  return round.totals
    .filter((total) => total.skinsWon === maxSkins)
    .map((total) => total.playerName)
    .join(", ");
}

function formatPreviousGross(total) {
  const holesPlayed = total.holesPlayed || 18;
  const grossText = holesPlayed >= 18
    ? `Gross ${total.gross}`
    : `Gross ${total.gross} through ${holesPlayed} holes`;
  const frontText = total.frontGrossHoles && total.frontGrossHoles < 9
    ? `Front ${total.frontGross} through ${total.frontGrossHoles}`
    : `Front ${total.frontGross ?? "-"}`;
  const backText = total.backGrossHoles && total.backGrossHoles < 9
    ? `Back ${total.backGross} through ${total.backGrossHoles}`
    : `Back ${total.backGross ?? "-"}`;

  return `${grossText} | ${frontText} | ${backText}`;
}

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
      const courseName = round.course?.name || "Unknown course";
      const playerNames = (round.players || []).map((player) => player.name).join(", ") || "Not available";
      const grossWinner = getLeaderNames(round.winners?.gross);
      const netWinner = getLeaderNames(round.winners?.net);
      const skinsWinner = getSkinsWinner(round);
      const totals = (round.totals || [])
        .map((total) => `
          <div class="previous-total-row">
            <span>${total.playerName}</span>
            <small>${formatPreviousGross(total)} | Net ${total.net} | ${total.points} pts | Skins ${total.skinsWon}</small>
          </div>
        `)
        .join("");

      return `
        <article class="previous-round-card">
          <div class="previous-round-header">
            <div>
              <strong>${courseName}</strong>
              <span>${roundDate}</span>
            </div>
          </div>
          <div class="player-details">Players: ${playerNames}</div>
          <div class="player-details">Gross Winner: ${grossWinner}</div>
          <div class="player-details">Net Winner: ${netWinner}</div>
          <div class="player-details">Skins Winner: ${skinsWinner}</div>
          <div class="previous-total-list">${totals}</div>
        </article>
      `;
    })
    .join("");
};
