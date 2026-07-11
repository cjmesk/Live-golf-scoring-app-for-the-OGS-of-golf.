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
        <small>${result.display} (${result.points} pts / ${result.target})</small>
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
    .map((item) => {
      const frontGrossText = roundState.formatGrossTotal(item.totals, "front");
      const backGrossText = roundState.formatGrossTotal(item.totals, "back");
      const overallGrossText = roundState.formatGrossTotal(item.totals, "overall");

      return `
        <div class="summary-row">
          <span>${item.player.name}</span>
          <strong>${overallGrossText}</strong>
          <small>${frontGrossText} | ${backGrossText}</small>
          <small>${roundState.isInPoints(item.player) ? `Points ${roundState.getPointsDifferential(item.player, "overall").display} (${item.totals.points}/${item.totals.overallPointsTarget})` : "Not in Points"} | Net ${item.totals.net}</small>
        </div>
      `;
    })
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

window.OGSGolf.ui.renderCompletedScorecard = function renderCompletedScorecard(elements, roundState) {
  const summary = roundState.getFinalSummary();
  const players = summary.playerTotals.map((item) => item.player);

  function getBaseInitials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function getUniquePlayerLabels() {
    const usedLabels = new Set();

    return players.map((player) => {
      const nameParts = player.name.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || player.name;
      const lastName = nameParts[nameParts.length - 1] || "";
      const candidates = [
        getBaseInitials(player.name),
        `${firstName[0] || ""}${lastName.slice(0, 2)}`.toUpperCase(),
        `${firstName.slice(0, 2)}${lastName[0] || ""}`.toUpperCase(),
        player.name.slice(0, 4).toUpperCase()
      ].filter(Boolean);
      let label = candidates.find((candidate) => !usedLabels.has(candidate));
      let extraLetterCount = 3;

      while (!label) {
        const candidate = `${firstName[0] || ""}${lastName.slice(0, extraLetterCount)}`.toUpperCase();
        if (!usedLabels.has(candidate)) {
          label = candidate;
        }
        extraLetterCount += 1;
      }

      usedLabels.add(label);
      return {
        player,
        label
      };
    });
  }

  function getScore(player, holeIndex) {
    return roundState.savedScores[player.id]?.[holeIndex] ?? "-";
  }

  function getTotal(player, startIndex, endIndex) {
    return Array.from({ length: endIndex - startIndex + 1 }, (_, offset) => startIndex + offset)
      .reduce((total, holeIndex) => {
        const score = roundState.savedScores[player.id]?.[holeIndex];
        return score === null || score === undefined ? total : total + Number(score);
      }, 0);
  }

  const playerLabels = getUniquePlayerLabels();
  const headerCells = playerLabels
    .map(({ label, player }) => `<th title="${player.name}">${label}</th>`)
    .join("");
  const holeRows = Array.from({ length: roundState.totalHoles }, (_, holeIndex) => `
    <tr>
      <th scope="row">${holeIndex + 1}</th>
      ${players.map((player) => `<td>${getScore(player, holeIndex)}</td>`).join("")}
    </tr>
  `).join("");
  const frontRow = players.map((player) => `<td>${getTotal(player, 0, 8)}</td>`).join("");
  const backRow = players.map((player) => `<td>${getTotal(player, 9, 17)}</td>`).join("");
  const totalRow = players.map((player) => `<td>${getTotal(player, 0, roundState.totalHoles - 1)}</td>`).join("");
  const legend = playerLabels
    .map(({ label, player }) => `<span><strong>${label}</strong> ${player.name}</span>`)
    .join("");

  elements.finalSummary.innerHTML = `
    <section class="summary-block">
      <h3>Scorecard</h3>
      <div class="scorecard-legend">${legend}</div>
      <div class="scorecard-table-wrap">
        <table class="mobile-scorecard-table">
          <thead>
            <tr>
              <th scope="col">H</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${holeRows}
            <tr class="scorecard-total-row"><th scope="row">F</th>${frontRow}</tr>
            <tr class="scorecard-total-row"><th scope="row">B</th>${backRow}</tr>
            <tr class="scorecard-total-row"><th scope="row">T</th>${totalRow}</tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
};
