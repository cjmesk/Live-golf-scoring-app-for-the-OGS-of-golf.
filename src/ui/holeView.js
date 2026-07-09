window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderHoleView = function renderHoleView(elements, course, players, roundState) {
  const { getPlayerMeta } = window.OGSGolf.ui;
  const currentHoleIndex = roundState.currentHoleIndex;
  const teeDetails = course.teeOrder.map((teeId) => {
    const tee = course.teeRatings[teeId];
    const hole = course.tees[teeId][currentHoleIndex];
    const yards = hole.yards === null ? "TODO yds" : `${hole.yards} yds`;

    return `<span>${tee.label}: Par ${hole.par} | ${yards} | HCP ${hole.handicap}</span>`;
  });

  elements.holeTitle.textContent = `Hole ${currentHoleIndex + 1}`;
  elements.holeDetails.innerHTML = teeDetails.join("");

  elements.previousHole.disabled = currentHoleIndex === 0;
  elements.nextHole.disabled = currentHoleIndex === roundState.totalHoles - 1;
  elements.holePlayers.innerHTML = "";

  players.forEach((player) => {
    const hole = roundState.getHoleForPlayer(player);
    const score = roundState.draftScores[player.id];
    const savedScore = roundState.savedScores[player.id][currentHoleIndex];
    const strokesReceived = roundState.getStrokesForPlayerOnHole(player);
    const savedResult = roundState.getPlayerHoleResult(player);
    const statusText = savedScore === null ? "Not saved" : `Saved ${savedScore}`;
    const netText = savedResult ? `Net ${savedResult.netScore}` : "Net after save";
    const playerRow = document.createElement("article");
    playerRow.className = "hole-player";
    playerRow.innerHTML = `
      <div class="hole-player-info">
        <div class="player-name">${player.name}</div>
        <div class="player-details">${getPlayerMeta(player)} | CH ${roundState.courseHandicaps[player.id]}</div>
        <div class="player-details">Par ${hole.par} | ${hole.yards === null ? "TODO yds" : `${hole.yards} yds`} | HCP ${hole.handicap}</div>
        <div class="player-details">Strokes ${strokesReceived} | ${statusText} | ${netText}</div>
      </div>
      <div class="score-stepper" aria-label="${player.name} score controls">
        <button type="button" class="step-button" data-action="decrease" data-player-id="${player.id}" aria-label="Decrease ${player.name} score">-</button>
        <output class="score-value" id="${player.id}-score">${score}</output>
        <button type="button" class="step-button" data-action="increase" data-player-id="${player.id}" aria-label="Increase ${player.name} score">+</button>
      </div>
    `;

    elements.holePlayers.appendChild(playerRow);
  });
};
