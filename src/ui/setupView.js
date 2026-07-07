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

  const selectedMemberIds = new Set(members.filter((member) => member.active).map((member) => member.id));
  const teeOverrides = new Map();
  elements.memberList.selectedMemberIds = selectedMemberIds;
  elements.memberList.teeOverrides = teeOverrides;

  function updateSelectedCount() {
    elements.selectedPlayerCount.textContent = `${selectedMemberIds.size} selected`;
  }

  function renderMemberRows() {
    const searchText = elements.memberSearch.value.trim().toLowerCase();
    const visibleMembers = members.filter((member) => {
      if (!member.active) return false;
      if (!searchText) return true;

      return `${member.name} ${member.ghin || ""}`.toLowerCase().includes(searchText);
    });

  elements.memberList.innerHTML = "";

  visibleMembers.forEach((member) => {
    const row = document.createElement("div");
    row.className = "member-row";
    row.innerHTML = `
      <label class="member-check">
        <input type="checkbox" data-member-id="${member.id}"${selectedMemberIds.has(member.id) ? " checked" : ""}>
        <span>
          <strong>${member.name}</strong>
          <span>${member.ghin ? `GHIN ${member.ghin}` : "No GHIN"} | Index ${member.handicap}</span>
        </span>
      </label>
      <label class="tee-select-label">
        <span>Tees</span>
        <select class="field-control" data-tee-for="${member.id}">
          <option value="white"${(teeOverrides.get(member.id) || member.tee) === "white" ? " selected" : ""}>White</option>
          <option value="silver"${(teeOverrides.get(member.id) || member.tee) === "silver" ? " selected" : ""}>Silver</option>
        </select>
      </label>
    `;
    elements.memberList.appendChild(row);
  });
  }

  renderMemberRows();
  updateSelectedCount();

  elements.memberSearch.oninput = renderMemberRows;
  elements.memberList.onchange = (event) => {
    const checkbox = event.target.closest("[data-member-id]");
    const teeSelect = event.target.closest("[data-tee-for]");

    if (checkbox?.checked) {
      selectedMemberIds.add(checkbox.dataset.memberId);
    } else if (checkbox) {
      selectedMemberIds.delete(checkbox.dataset.memberId);
    }

    if (teeSelect) {
      teeOverrides.set(teeSelect.dataset.teeFor, teeSelect.value);
    }

    updateSelectedCount();
  };

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
  const selectedMemberIds = elements.memberList.selectedMemberIds || new Set();
  const teeOverrides = elements.memberList.teeOverrides || new Map();
  const selectedPlayers = members
    .filter((member) => selectedMemberIds.has(member.id))
    .map((member) => {
      return {
        ...member,
        tee: teeOverrides.get(member.id) || member.tee
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
    groups: selectedPlayers.reduce((groups, player, index) => {
      const groupIndex = Math.floor(index / 4);
      groups[groupIndex] = groups[groupIndex] || [];
      groups[groupIndex].push(player.id);
      return groups;
    }, []),
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
        <span>${roundSettings.players.length} players | ${roundSettings.groups.length} group${roundSettings.groups.length === 1 ? "" : "s"}</span>
      </div>
      <div>${gamesText}</div>
    </div>
  `;
};
