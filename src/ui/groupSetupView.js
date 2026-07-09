window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

function getDefaultGroupCount(playerCount) {
  if (playerCount <= 4) return 1;
  return Math.ceil(playerCount / 4);
}

function getDefaultGroupNumber(index, playerCount) {
  const groupCount = getDefaultGroupCount(playerCount);
  const baseSize = Math.floor(playerCount / groupCount);
  const largerGroups = playerCount % groupCount;
  let runningTotal = 0;

  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const groupSize = baseSize + (groupIndex < largerGroups ? 1 : 0);
    runningTotal += groupSize;

    if (index < runningTotal) {
      return groupIndex + 1;
    }
  }

  return groupCount;
}

window.OGSGolf.ui.renderGroupSetupView = function renderGroupSetupView(elements, roundSettings) {
  const players = roundSettings.players;
  const groupCount = getDefaultGroupCount(players.length);

  elements.groupSetupCount.textContent =
    `${players.length} player${players.length === 1 ? "" : "s"} | ${groupCount} group${groupCount === 1 ? "" : "s"}`;
  elements.groupSetupStatus.textContent = players.length === 8 && groupCount === 2
    ? "Beta setup: 2 groups of 4. Assign one scorer per group."
    : "Assign each player to a group and assign one scorer per group.";
  elements.groupSetupList.innerHTML = players
    .map((player, index) => {
      const currentGroup = getDefaultGroupNumber(index, players.length);
      const options = Array.from({ length: groupCount }, (_, groupIndex) => groupIndex + 1)
        .map((groupNumber) => `
          <option value="${groupNumber}"${groupNumber === currentGroup ? " selected" : ""}>Group ${groupNumber}</option>
        `)
        .join("");

      return `
        <div class="member-row">
          <div>
            <strong>${player.name}</strong>
            <span class="player-details">${player.tee} tees | Handicap ${player.handicap}</span>
          </div>
          <label class="tee-select-label">
            <span>Group</span>
            <select class="field-control" data-group-player="${player.id}">
              ${options}
            </select>
          </label>
        </div>
      `;
    })
    .join("");

  const scorerOptions = players
    .map((player) => `<option value="${player.id}">${player.name}</option>`)
    .join("");
  elements.groupScorerList.innerHTML = Array.from({ length: groupCount }, (_, index) => {
    const defaultScorer = players.find((player, playerIndex) =>
      getDefaultGroupNumber(playerIndex, players.length) === index + 1
    );

    return `
      <div class="member-row">
        <div>
          <strong>Group ${index + 1} Scorer</strong>
          <span class="player-details">Only this scorer needs the app for Group ${index + 1}.</span>
        </div>
        <label class="tee-select-label">
          <span>Scorer</span>
          <select class="field-control" data-group-scorer="${index}">
            ${scorerOptions.replace(`value="${defaultScorer?.id}"`, `value="${defaultScorer?.id}" selected`)}
          </select>
        </label>
      </div>
    `;
  }).join("");
};

window.OGSGolf.ui.readGroupAssignments = function readGroupAssignments(elements, players) {
  const groupsByNumber = {};

  players.forEach((player) => {
    const select = elements.groupSetupList.querySelector(`[data-group-player="${player.id}"]`);
    const groupNumber = Number(select?.value || 1);
    groupsByNumber[groupNumber] = groupsByNumber[groupNumber] || [];
    groupsByNumber[groupNumber].push(player.id);
  });

  return Object.keys(groupsByNumber)
    .sort((a, b) => Number(a) - Number(b))
    .map((groupNumber) => groupsByNumber[groupNumber])
    .filter((group) => group.length > 0);
};

window.OGSGolf.ui.readGroupScorers = function readGroupScorers(elements, groups) {
  return groups.map((group, index) => {
    const select = elements.groupScorerList.querySelector(`[data-group-scorer="${index}"]`);
    return select?.value || group[0];
  });
};
