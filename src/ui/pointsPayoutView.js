window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderPointsPayout = function renderPointsPayout(elements, roundState) {
  const summary = roundState.getPointsSummary();

  function formatLeaders(result) {
    if (!result.leaders.length) {
      return "No players in Points Game";
    }

    const names = result.leaders.map((leader) => leader.player.name).join(", ");
    return `${names} (${result.display})`;
  }

  elements.pointsPayout.innerHTML = `
    <div class="payout-row">
      <span>Front 9 Leader:</span>
      <strong>${formatLeaders(summary.front)}</strong>
    </div>
    <div class="payout-row">
      <span>Back 9 Leader:</span>
      <strong>${formatLeaders(summary.back)}</strong>
    </div>
    <div class="payout-row">
      <span>Overall Leader:</span>
      <strong>${formatLeaders(summary.overall)}</strong>
    </div>
  `;
};
