window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.gameOptions = [
  { id: "netSkins", label: "Net Skins", defaultEnabled: true, defaultAmount: 5 },
  { id: "pointsGame", label: "Points Game", defaultEnabled: true, defaultAmount: 5 },
  { id: "teamChallenge", label: "Team Challenge", defaultEnabled: false, defaultAmount: 5 },
  { id: "closestToPin", label: "Closest to the Pin", defaultEnabled: false, defaultAmount: 2 },
  { id: "longDrive", label: "Long Drive", defaultEnabled: false, defaultAmount: 2 }
];

window.OGSGolf.ui.renderSetupView = function renderSetupView(elements, courses, members) {
  elements.courseSelect.innerHTML = courses
    .map((course) => `<option value="${course.id}">${course.name}</option>`)
    .join("");

  const selectedMemberIds = new Set(members.filter((member) => member.active).map((member) => member.id));
  const teeOverrides = new Map();
  const skinsMemberIds = new Set(selectedMemberIds);
  const pointsMemberIds = new Set(selectedMemberIds);
  const closestToPinMemberIds = new Set(selectedMemberIds);
  const longDriveMemberIds = new Set(selectedMemberIds);
  elements.memberList.selectedMemberIds = selectedMemberIds;
  elements.memberList.teeOverrides = teeOverrides;
  elements.memberList.skinsMemberIds = skinsMemberIds;
  elements.memberList.pointsMemberIds = pointsMemberIds;
  elements.memberList.closestToPinMemberIds = closestToPinMemberIds;
  elements.memberList.longDriveMemberIds = longDriveMemberIds;

  function updateSelectedCount() {
    elements.selectedPlayerCount.textContent = `${selectedMemberIds.size} selected`;
  }

  function renderMemberRows() {
    const selectedCourse = courses.find((course) => course.id === elements.courseSelect.value) || courses[0];
    const teeOptions = selectedCourse.teeOrder.map((teeId) => {
      const tee = selectedCourse.teeRatings[teeId];
      return {
        id: teeId,
        label: tee.label
      };
    });
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
          <span>Playing today | ${member.ghin ? `GHIN ${member.ghin}` : "No GHIN"} | Index ${member.handicap}</span>
        </span>
      </label>
      <label class="tee-select-label">
        <span>Tees</span>
        <select class="field-control" data-tee-for="${member.id}">
          ${teeOptions.map((tee) => `
            <option value="${tee.id}"${(teeOverrides.get(member.id) || member.tee) === tee.id ? " selected" : ""}>${tee.label}</option>
          `).join("")}
        </select>
      </label>
      <div class="member-game-options">
        <label class="game-toggle">
          <input type="checkbox" data-skins-member-id="${member.id}"${skinsMemberIds.has(member.id) ? " checked" : ""}>
          <span>In Skins</span>
        </label>
        <label class="game-toggle">
          <input type="checkbox" data-points-member-id="${member.id}"${pointsMemberIds.has(member.id) ? " checked" : ""}>
          <span>In Points Game</span>
        </label>
        <label class="game-toggle">
          <input type="checkbox" data-closest-member-id="${member.id}"${closestToPinMemberIds.has(member.id) ? " checked" : ""}>
          <span>In Closest to Pin</span>
        </label>
        <label class="game-toggle">
          <input type="checkbox" data-long-drive-member-id="${member.id}"${longDriveMemberIds.has(member.id) ? " checked" : ""}>
          <span>In Long Drive</span>
        </label>
      </div>
    `;
    elements.memberList.appendChild(row);
  });
  }

  renderMemberRows();
  updateSelectedCount();

  elements.courseSelect.onchange = renderMemberRows;
  elements.memberSearch.oninput = renderMemberRows;
  elements.memberList.onchange = (event) => {
    const checkbox = event.target.closest("[data-member-id]");
    const teeSelect = event.target.closest("[data-tee-for]");
    const skinsCheckbox = event.target.closest("[data-skins-member-id]");
    const pointsCheckbox = event.target.closest("[data-points-member-id]");
    const closestCheckbox = event.target.closest("[data-closest-member-id]");
    const longDriveCheckbox = event.target.closest("[data-long-drive-member-id]");

    if (checkbox?.checked) {
      selectedMemberIds.add(checkbox.dataset.memberId);
      skinsMemberIds.add(checkbox.dataset.memberId);
      pointsMemberIds.add(checkbox.dataset.memberId);
      closestToPinMemberIds.add(checkbox.dataset.memberId);
      longDriveMemberIds.add(checkbox.dataset.memberId);
    } else if (checkbox) {
      selectedMemberIds.delete(checkbox.dataset.memberId);
      skinsMemberIds.delete(checkbox.dataset.memberId);
      pointsMemberIds.delete(checkbox.dataset.memberId);
      closestToPinMemberIds.delete(checkbox.dataset.memberId);
      longDriveMemberIds.delete(checkbox.dataset.memberId);
    }

    if (teeSelect) {
      teeOverrides.set(teeSelect.dataset.teeFor, teeSelect.value);
    }

    if (skinsCheckbox?.checked) {
      skinsMemberIds.add(skinsCheckbox.dataset.skinsMemberId);
    } else if (skinsCheckbox) {
      skinsMemberIds.delete(skinsCheckbox.dataset.skinsMemberId);
    }

    if (pointsCheckbox?.checked) {
      pointsMemberIds.add(pointsCheckbox.dataset.pointsMemberId);
    } else if (pointsCheckbox) {
      pointsMemberIds.delete(pointsCheckbox.dataset.pointsMemberId);
    }

    if (closestCheckbox?.checked) {
      closestToPinMemberIds.add(closestCheckbox.dataset.closestMemberId);
    } else if (closestCheckbox) {
      closestToPinMemberIds.delete(closestCheckbox.dataset.closestMemberId);
    }

    if (longDriveCheckbox?.checked) {
      longDriveMemberIds.add(longDriveCheckbox.dataset.longDriveMemberId);
    } else if (longDriveCheckbox) {
      longDriveMemberIds.delete(longDriveCheckbox.dataset.longDriveMemberId);
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

  const skinsModeRow = document.createElement("div");
  skinsModeRow.className = "game-row";
  skinsModeRow.innerHTML = `
    <label class="field-label" for="skinsHandicapMode">
      Net Skins Handicap
    </label>
    <select id="skinsHandicapMode" class="field-control">
      <option value="half" selected>Half Handicap Skins</option>
      <option value="full">Full Handicap Skins</option>
    </select>
  `;
  elements.gameList.appendChild(skinsModeRow);
};

window.OGSGolf.ui.readSetupSettings = function readSetupSettings(elements, courses, members) {
  const course = courses.find((item) => item.id === elements.courseSelect.value) || courses[0];
  const selectedMemberIds = elements.memberList.selectedMemberIds || new Set();
  const teeOverrides = elements.memberList.teeOverrides || new Map();
  const skinsMemberIds = elements.memberList.skinsMemberIds || new Set();
  const pointsMemberIds = elements.memberList.pointsMemberIds || new Set();
  const closestToPinMemberIds = elements.memberList.closestToPinMemberIds || new Set();
  const longDriveMemberIds = elements.memberList.longDriveMemberIds || new Set();
  const selectedPlayers = members
    .filter((member) => selectedMemberIds.has(member.id))
    .map((member) => {
      return {
        ...member,
        tee: teeOverrides.get(member.id) || member.tee,
        inSkins: skinsMemberIds.has(member.id),
        inPoints: pointsMemberIds.has(member.id),
        inClosestToPin: closestToPinMemberIds.has(member.id),
        inLongDrive: longDriveMemberIds.has(member.id)
      };
    });

  const games = {};

  window.OGSGolf.ui.gameOptions.forEach((game) => {
    const enabledInput = elements.gameList.querySelector(`[data-game-enabled="${game.id}"]`);
    const amountInput = elements.gameList.querySelector(`[data-game-amount="${game.id}"]`);
    games[game.id] = {
      label: game.label,
      enabled: Boolean(enabledInput?.checked),
      amount: Number(amountInput?.value || 0),
      skinsHandicapMode: game.id === "netSkins"
        ? elements.gameList.querySelector("#skinsHandicapMode")?.value || "half"
        : undefined
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
  const groupsText = roundSettings.groups
    .map((group, index) => `Group ${index + 1}: ${group.length}`)
    .join(" | ");
  const skinsCount = roundSettings.players.filter((player) => player.inSkins).length;
  const pointsCount = roundSettings.players.filter((player) => player.inPoints).length;
  const closestCount = roundSettings.players.filter((player) => player.inClosestToPin).length;
  const longDriveCount = roundSettings.players.filter((player) => player.inLongDrive).length;
  const skinsMode = roundSettings.games.netSkins?.skinsHandicapMode === "full"
    ? "Full Handicap Skins"
    : "Half Handicap Skins";

  elements.roundSettingsSummary.innerHTML = `
    <div class="settings-card">
      <div>
        <strong>${roundSettings.course.name}</strong>
        <span>${roundSettings.players.length} players | ${roundSettings.groups.length} group${roundSettings.groups.length === 1 ? "" : "s"}</span>
      </div>
      <div>${groupsText}</div>
      <div>Skins: ${skinsCount} | Points: ${pointsCount} | CTP: ${closestCount} | Long Drive: ${longDriveCount}</div>
      <div>${skinsMode}</div>
      <div>${gamesText}</div>
    </div>
  `;
};
