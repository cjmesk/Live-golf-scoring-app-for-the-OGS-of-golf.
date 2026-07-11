window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderHoleView = function renderHoleView(elements, course, players, roundState) {
  const currentHoleIndex = roundState.currentHoleIndex;
  const firstPlayer = players[0];
  const currentHole = firstPlayer
    ? roundState.getHoleForPlayer(firstPlayer)
    : course.tees.white[currentHoleIndex];

  elements.holeTitle.textContent = `Hole ${currentHoleIndex + 1}`;
  elements.holeDetails.innerHTML = `
    <span>Par ${currentHole.par}</span>
    <span>HCP ${currentHole.handicap}</span>
  `;

  elements.previousHole.disabled = currentHoleIndex === 0;
  elements.nextHole.disabled = currentHoleIndex === roundState.totalHoles - 1;
  elements.holePlayers.innerHTML = "";

  players.forEach((player) => {
    const score = roundState.draftScores[player.id];
    const playerRow = document.createElement("article");
    playerRow.className = "hole-player scorekeeper-player";
    playerRow.innerHTML = `
      <div class="hole-player-info">
        <div class="player-name">${player.name}</div>
      </div>
      <div class="score-stepper" aria-label="${player.name} gross score controls">
        <button type="button" class="step-button" data-action="decrease" data-player-id="${player.id}" aria-label="Decrease ${player.name} score">-</button>
        <output class="score-value" id="${player.id}-score">${score}</output>
        <button type="button" class="step-button" data-action="increase" data-player-id="${player.id}" aria-label="Increase ${player.name} score">+</button>
      </div>
    `;

    elements.holePlayers.appendChild(playerRow);
  });
};
