window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.gameOptions = [
  { id: "netSkins", label: "Net Skins", defaultEnabled: true, defaultAmount: 5 },
  { id: "pointsGame", label: "Points Game", defaultEnabled: true, defaultAmount: 5 },
  { id: "closestToPin", label: "Closest to the Pin", defaultEnabled: false, defaultAmount: 2 },
  { id: "longDrive", label: "Long Drive", defaultEnabled: false, defaultAmount: 2 }
];

window.OGSGolf.ui.renderSetupView = function renderSetupView(elements, courses, members) {
  elements.courseSelect.innerHTML = courses
    .map((course) => `<option value="${course.id}">${course.name}</option>`)
    .join("");

  elements.memberList.innerHTML = "";

  members.forEach((member) => {
    const row = document.createElement("div");
    row.className = "member-row";
    row.innerHTML = `
      <label class="member-check">
        <input type="checkbox" data-member-id="${member.id}" checked>
        <span>
          <strong>${member.name}</strong>
          <span>${member.ghin ? `GHIN ${member.ghin}` : "No GHIN"} | Index ${member.handicap}</span>
        </span>
      </label>
      <label class="tee-select-label">
        <span>Tees</span>
        <select class="field-control" data-tee-for="${member.id}">
          <option value="white"${member.tee === "white" ? " selected" : ""}>White</option>
          <option value="silver"${member.tee === "silver" ? " selected" : ""}>Silver</option>
        </select>
      </label>
    `;
    elements.memberList.appendChild(row);
  });

  elements.gameList.innerHTML = "";

  window.OGSGolf.ui.gameOptions.forEach((game) => {
    const row = document.createElement("div");
    row.className = "game-row";
    row.innerHTML = `
      <label class="game-toggle">
        <input type="checkbox" data-game-enabled="${game.id}"${game.defaultEnabled ? " checked" : ""}>
        <span>${game.label}</span>
      </label>
      <label class="amount-field">
        <span>$</span>
        <input class="field-control" type="number" min="0" step="1" value="${game.defaultAmount}" data-game-amount="${game.id}">
      </label>
    `;
    elements.gameList.appendChild(row);
  });
};

window.OGSGolf.ui.readSetupSettings = function readSetupSettings(elements, courses, members) {
  const course = courses.find((item) => item.id === elements.courseSelect.value) || courses[0];
  const selectedPlayers = members
    .filter((member) => {
      const checkbox = elements.memberList.querySelector(`[data-member-id="${member.id}"]`);
      return checkbox?.checked;
    })
    .map((member) => {
      const teeSelect = elements.memberList.querySelector(`[data-tee-for="${member.id}"]`);
      return {
        ...member,
        tee: teeSelect?.value || member.tee
      };
    });

  const games = {};

  window.OGSGolf.ui.gameOptions.forEach((game) => {
    const enabledInput = elements.gameList.querySelector(`[data-game-enabled="${game.id}"]`);
    const amountInput = elements.gameList.querySelector(`[data-game-amount="${game.id}"]`);
    games[game.id] = {
      label: game.label,
      enabled: Boolean(enabledInput?.checked),
      amount: Number(amountInput?.value || 0)
    };
  });

  return {
    course,
    players: selectedPlayers,
    games
  };
};

window.OGSGolf.ui.renderRoundSettingsSummary = function renderRoundSettingsSummary(elements, roundSettings) {
  const enabledGames = Object.values(roundSettings.games).filter((game) => game.enabled);
  const gamesText = enabledGames.length
    ? enabledGames.map((game) => `${game.label}: $${game.amount}`).join(" | ")
    : "No games enabled";

  elements.roundSettingsSummary.innerHTML = `
    <div class="settings-card">
      <div>
        <strong>${roundSettings.course.name}</strong>
        <span>${roundSettings.players.length} players</span>
      </div>
      <div>${gamesText}</div>
    </div>
  `;
};
