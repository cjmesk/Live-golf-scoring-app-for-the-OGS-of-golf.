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

  const selectedMemberIds = new Set();
  const teeOverrides = new Map();
  const skinsMemberIds = new Set(selectedMemberIds);
  const pointsMemberIds = new Set(selectedMemberIds);
  const closestToPinMemberIds = new Set(selectedMemberIds);
  const longDriveMemberIds = new Set(selectedMemberIds);
  const teamAssignments = new Map();
  elements.memberList.selectedMemberIds = selectedMemberIds;
  elements.memberList.teeOverrides = teeOverrides;
  elements.memberList.skinsMemberIds = skinsMemberIds;
  elements.memberList.pointsMemberIds = pointsMemberIds;
  elements.memberList.closestToPinMemberIds = closestToPinMemberIds;
  elements.memberList.longDriveMemberIds = longDriveMemberIds;
  elements.memberList.teamAssignments = teamAssignments;

  function updateSelectedCount() {
    elements.selectedPlayerCount.textContent = `${selectedMemberIds.size} selected`;
  }

  function isTeamChallengeEnabled() {
    return Boolean(elements.gameList.querySelector('[data-game-enabled="teamChallenge"]')?.checked);
  }

  function renderTeamAssignments() {
    const isEnabled = isTeamChallengeEnabled();
    elements.teamAssignmentPanel.classList.toggle("is-hidden", !isEnabled);

    if (!isEnabled) {
      elements.teamAssignmentList.innerHTML = "";
      return;
    }

    const playingMembers = members.filter((member) => selectedMemberIds.has(member.id));

    if (playingMembers.length === 0) {
      elements.teamAssignmentList.innerHTML = `<div class="empty-state">Check players as playing today, then assign teams.</div>`;
      return;
    }

    elements.teamAssignmentList.innerHTML = playingMembers
      .map((member) => {
        const selectedTeam = teamAssignments.get(member.id) || "";

        return `
          <div class="team-assignment-row">
            <div>
              <strong>${member.name}</strong>
              <span class="player-details">Playing checked | Team Event checked</span>
            </div>
            <label class="tee-select-label">
              <span>Team</span>
              <select class="field-control" data-team-for="${member.id}">
                <option value=""${selectedTeam === "" ? " selected" : ""}>Auto</option>
                <option value="team-1"${selectedTeam === "team-1" ? " selected" : ""}>Team 1</option>
                <option value="team-2"${selectedTeam === "team-2" ? " selected" : ""}>Team 2</option>
                <option value="team-3"${selectedTeam === "team-3" ? " selected" : ""}>Team 3</option>
                <option value="team-4"${selectedTeam === "team-4" ? " selected" : ""}>Team 4</option>
              </select>
            </label>
          </div>
        `;
      })
      .join("");
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
    const isPlayingToday = selectedMemberIds.has(member.id);
    const row = document.createElement("div");
    row.className = "member-row";
    row.innerHTML = `
      <label class="member-check">
        <input type="checkbox" data-member-id="${member.id}"${isPlayingToday ? " checked" : ""}>
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
          <input type="checkbox" data-skins-member-id="${member.id}"${skinsMemberIds.has(member.id) ? " checked" : ""}${isPlayingToday ? "" : " disabled"}>
          <span>In Skins</span>
        </label>
        <label class="game-toggle">
          <input type="checkbox" data-points-member-id="${member.id}"${pointsMemberIds.has(member.id) ? " checked" : ""}${isPlayingToday ? "" : " disabled"}>
          <span>In Points Game</span>
        </label>
        <label class="game-toggle">
          <input type="checkbox" data-closest-member-id="${member.id}"${closestToPinMemberIds.has(member.id) ? " checked" : ""}${isPlayingToday ? "" : " disabled"}>
          <span>In Closest to Pin</span>
        </label>
        <label class="game-toggle">
          <input type="checkbox" data-long-drive-member-id="${member.id}"${longDriveMemberIds.has(member.id) ? " checked" : ""}${isPlayingToday ? "" : " disabled"}>
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
    } else if (checkbox) {
      selectedMemberIds.delete(checkbox.dataset.memberId);
      skinsMemberIds.delete(checkbox.dataset.memberId);
      pointsMemberIds.delete(checkbox.dataset.memberId);
      closestToPinMemberIds.delete(checkbox.dataset.memberId);
      longDriveMemberIds.delete(checkbox.dataset.memberId);
      teamAssignments.delete(checkbox.dataset.memberId);
    }

    if (checkbox) {
      updateSelectedCount();
      renderMemberRows();
      renderTeamAssignments();
      return;
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

  elements.gameList.onchange = (event) => {
    if (event.target.closest('[data-game-enabled="teamChallenge"]')) {
      renderTeamAssignments();
    }
  };

  elements.teamAssignmentList.onchange = (event) => {
    const teamSelect = event.target.closest("[data-team-for]");

    if (!teamSelect) return;

    if (teamSelect.value) {
      teamAssignments.set(teamSelect.dataset.teamFor, teamSelect.value);
      return;
    }

    teamAssignments.delete(teamSelect.dataset.teamFor);
  };

  renderTeamAssignments();
};

window.OGSGolf.ui.readSetupSettings = function readSetupSettings(elements, courses, members) {
  const course = courses.find((item) => item.id === elements.courseSelect.value) || courses[0];
  const selectedMemberIds = elements.memberList.selectedMemberIds || new Set();
  const teeOverrides = elements.memberList.teeOverrides || new Map();
  const skinsMemberIds = elements.memberList.skinsMemberIds || new Set();
  const pointsMemberIds = elements.memberList.pointsMemberIds || new Set();
  const closestToPinMemberIds = elements.memberList.closestToPinMemberIds || new Set();
  const longDriveMemberIds = elements.memberList.longDriveMemberIds || new Set();
  const teamAssignments = elements.memberList.teamAssignments || new Map();
  const teamChallengeEnabled = Boolean(elements.gameList.querySelector('[data-game-enabled="teamChallenge"]')?.checked);
  const selectedPlayers = members
    .filter((member) => selectedMemberIds.has(member.id))
    .map((member) => {
      const teamId = teamChallengeEnabled ? teamAssignments.get(member.id) || "" : "";

      return {
        ...member,
        tee: teeOverrides.get(member.id) || member.tee,
        inSkins: skinsMemberIds.has(member.id),
        inPoints: pointsMemberIds.has(member.id),
        inClosestToPin: closestToPinMemberIds.has(member.id),
        inLongDrive: longDriveMemberIds.has(member.id),
        inTeamChallenge: teamChallengeEnabled && Boolean(teamId),
        teamId
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
    teamAssignments: teamChallengeEnabled
      ? selectedPlayers.reduce((assignments, player) => {
          if (player.teamId) {
            assignments[player.id] = player.teamId;
          }

          return assignments;
        }, {})
      : {},
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
  const teamCount = new Set(
    roundSettings.players
      .map((player) => player.teamId)
      .filter(Boolean)
  ).size;
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
      <div>Team Challenge: ${roundSettings.games.teamChallenge?.enabled ? `${teamCount} assigned team${teamCount === 1 ? "" : "s"}` : "Off"}</div>
      <div>${skinsMode}</div>
      <div>${gamesText}</div>
    </div>
  `;
};
