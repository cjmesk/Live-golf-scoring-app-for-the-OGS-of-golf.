window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderEventSummary = function renderEventSummary(elements, roundSettings) {
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
          <small>Scorekeeper: ${scorer?.name || "Not assigned"}</small>
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
          <strong>${roundSettings.date}</strong>
        </div>
        <div class="summary-card">
          <span>Round Name</span>
          <strong>${roundSettings.roundName}</strong>
        </div>
        <div class="summary-card">
          <span>Total Players</span>
          <strong>${roundSettings.players.length}</strong>
        </div>
        <div class="summary-card">
          <span>Total Groups</span>
          <strong>${roundSettings.groups.length}</strong>
        </div>
      </div>
    </section>

    <section class="summary-block">
      <h3>Groups and Scorekeepers</h3>
      <div class="summary-list">${groupRows}</div>
    </section>
  `;
};
