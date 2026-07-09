window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderFinalSummary = function renderFinalSummary(elements, roundState) {
  const summary = roundState.getFinalSummary();

  function formatWinner(result, label) {
    const names = result.leaders.map((item) => item.player.name).join(", ");
    return `
      <div class="summary-card">
        <span>${label}</span>
        <strong>${names}</strong>
        <small>${result.score}</small>
      </div>
    `;
  }

  function formatPointsWinner(result, label) {
    if (!result.leaders.length) {
      return `
        <div class="summary-card">
          <span>${label}</span>
          <strong>No players</strong>
          <small>Points Game</small>
        </div>
      `;
    }

    const names = result.leaders.map((item) => item.player.name).join(", ");
    return `
      <div class="summary-card">
        <span>${label}</span>
        <strong>${names}</strong>
        <small>${result.points} pts</small>
      </div>
    `;
  }

  const skinsRows = summary.playerTotals
    .map((item) => {
      const holes = item.skins.holesWon.length ? item.skins.holesWon.join(", ") : "-";
      const skinsText = roundState.isInSkins(item.player) ? `Holes ${holes}` : "Not in Skins";
      return `
        <div class="summary-row">
          <span>${item.player.name}</span>
          <strong>${roundState.isInSkins(item.player) ? item.skins.totalSkins : "-"}</strong>
          <small>${skinsText}</small>
        </div>
      `;
    })
    .join("");

  const totalRows = summary.playerTotals
    .map((item) => `
      <div class="summary-row">
        <span>${item.player.name}</span>
        <strong>${roundState.isInPoints(item.player) ? `${item.totals.points} pts` : "Not in Points"}</strong>
        <small>Gross ${item.totals.gross} | Net ${item.totals.net}</small>
      </div>
    `)
    .join("");

  elements.finalSummary.innerHTML = `
    <div class="summary-grid">
      ${formatWinner(summary.grossWinner, "Gross Winner")}
      ${formatWinner(summary.netWinner, "Net Winner")}
      ${formatPointsWinner(summary.points.front, "Front 9 Points Winner")}
      ${formatPointsWinner(summary.points.back, "Back 9 Points Winner")}
      ${formatPointsWinner(summary.points.overall, "Overall Points Winner")}
    </div>

    <section class="summary-block">
      <h3>Total Points, Gross, and Net</h3>
      <div class="summary-list">${totalRows}</div>
    </section>

    <section class="summary-block">
      <h3>Net Skins Winners</h3>
      <div class="summary-list">${skinsRows}</div>
    </section>
  `;
};
