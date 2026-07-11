const { courses, players: defaultPlayers, maxRosterSize } = window.OGSGolf.data;
const { createRoundState, playerStorage, roundStorage, scorerStorage } = window.OGSGolf.state;
const { roundCloudService } = window.OGSGolf.cloud;
const {
  clearPlayerForm,
  fillPlayerForm,
  getElements,
  readSetupSettings,
  readGroupAssignments,
  readGroupPlaySettings,
  readGroupScorers,
  readPlayerForm,
  renderFinalSummary,
  renderEventSummary,
  renderGroupScorerOptions,
  renderGroupSetupView,
  renderHoleView,
  renderLeaderboard,
  renderPlayerManagement,
  renderPointsPayout,
  renderPreviousRounds,
  renderRoundSettingsSummary,
  renderSetupView,
  renderSkinsSummary
} = window.OGSGolf.ui;

const elements = getElements();
let members = playerStorage.getAll(defaultPlayers);
let selectedCourse = courses[0];
let selectedPlayers = [];
let roundSettings = null;
let pendingRoundSettings = null;
let roundState = null;
let statusTimer = null;
let completedRoundSaved = false;
let currentGroupIndex = 0;
let groupHoleIndexes = [];
let currentScorerId = scorerStorage.getScorerId();
let commissionerMode = scorerStorage.isCommissioner();
let viewOnlyMode = false;

function setActiveScreen(screenName) {
  const isScoringScreen = screenName === "round";

  elements.todayScreen.classList.toggle("is-hidden", screenName !== "today");
  elements.resumeScreen.classList.toggle("is-hidden", screenName !== "resume");
  elements.scorerScreen.classList.toggle("is-hidden", screenName !== "scorer");
  elements.setupScreen.classList.toggle("is-hidden", screenName !== "setup");
  elements.groupSetupScreen.classList.toggle("is-hidden", screenName !== "groups");
  elements.eventSummaryScreen.classList.toggle("is-hidden", screenName !== "eventSummary");
  elements.roundScreen.classList.toggle("is-hidden", screenName !== "round");
  elements.summaryScreen.classList.toggle("is-hidden", screenName !== "summary");
  elements.previousRoundsScreen.classList.toggle("is-hidden", screenName !== "previous");
  elements.playerManagementScreen.classList.toggle("is-hidden", screenName !== "players");
  elements.courseInfoScreen.classList.toggle("is-hidden", screenName !== "courseInfo");
  elements.handicapVerifyScreen.classList.toggle("is-hidden", screenName !== "handicapVerify");
  elements.courseManagementScreen.classList.toggle("is-hidden", screenName !== "courses");
  elements.betSettingsScreen.classList.toggle("is-hidden", screenName !== "bets");
  elements.helpScreen.classList.toggle("is-hidden", screenName !== "help");
  elements.aboutScreen.classList.toggle("is-hidden", screenName !== "about");
  document.body.classList.toggle("is-scoring", isScoringScreen);
  elements.modeStatus.classList.toggle("is-hidden", isScoringScreen);
  elements.rosterCloudStatus.classList.toggle("is-hidden", isScoringScreen || screenName === "today");
  renderAccessMode();
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function scrollToScoring() {
  elements.holePlayers.scrollIntoView({ behavior: "auto", block: "start" });
}

function getCurrentScorerName() {
  return members.find((member) => member.id === currentScorerId)?.name || "Scorer";
}

function formatTodayDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function renderTodayRoundScreen() {
  const eventCourseName = roundSettings?.course?.name || selectedCourse?.name || "Twelve Stones Golf Club";
  const playerCount = selectedPlayers.length || roundSettings?.players?.length || 0;
  const groupCount = roundSettings?.groups?.length || 0;
  const startTime = roundSettings?.startTime || roundSettings?.teeTime || "Not set";
  const hasActiveRound = Boolean(roundState);

  elements.todayDate.textContent = formatTodayDate();
  elements.todayCourseName.textContent = eventCourseName;
  elements.todayEventStatus.textContent = hasActiveRound
    ? roundSettings?.eventStatus || "Open"
    : "No active round yet";
  elements.todayPlayerCount.textContent = String(playerCount);
  elements.todayStartTime.textContent = startTime;
  elements.todayGroupCount.textContent = String(groupCount);
  elements.viewLiveMatch.disabled = !hasActiveRound;
  elements.choosePlayerScoring.disabled = !hasActiveRound;
  elements.todayStatus.textContent = hasActiveRound
    ? "Today's match is ready."
    : "No active round yet.";
}

function showTodayRoundScreen() {
  renderTodayRoundScreen();
  setActiveScreen("today");
  scrollToTop();
}

function renderAccessMode() {
  if (!elements.modeStatus) return;

  elements.adminOnlyItems.forEach((item) => {
    item.classList.toggle("is-hidden", !commissionerMode);
  });

  elements.toggleCommissionerMode.textContent = commissionerMode
    ? "Commissioner Mode: On"
    : "Commissioner Mode: Off";
  elements.toggleCommissionerMode.classList.toggle("is-on", commissionerMode);
  elements.menuCommissionerPinLabel.classList.toggle("is-hidden", commissionerMode);

  if (commissionerMode) {
    elements.modeStatus.textContent = "Commissioner View: event setup, player management, reset, and all groups are unlocked.";
    elements.showPlayerManagement.disabled = false;
    return;
  }

  if (viewOnlyMode) {
    elements.modeStatus.textContent = "Viewing live match. Score entry is locked.";
    elements.showPlayerManagement.disabled = true;
    return;
  }

  elements.modeStatus.textContent = currentScorerId
    ? `Scorer View: ${getCurrentScorerName()} can enter scores for their assigned group.`
    : "Scorer View: choose your name, or enter the Commissioner PIN to create/manage an event.";
  elements.showPlayerManagement.disabled = true;
}

function closeMenu() {
  elements.appMenu.classList.add("is-hidden");
  elements.menuToggle.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  const isOpen = elements.appMenu.classList.toggle("is-hidden") === false;
  elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function showAdminRequiredMessage(message) {
  renderScorerSelection();
  elements.scorerAccessStatus.textContent = message || "Turn on Commissioner Mode from the menu to use that tool.";
}

async function openSetupWizard({ focusTeamSetup = false } = {}) {
  if (!commissionerMode) {
    showAdminRequiredMessage("Turn on Commissioner Mode to start the setup wizard.");
    return;
  }

  if (roundSettings?.eventStatus === "Started" || roundSettings?.setupLocked) {
    setActiveScreen("round");
    renderApp();
    elements.modeStatus.textContent = "Round setup is locked because this event has started. Use Edit Round Setup for commissioner-only corrections.";
    scrollToScoring();
    return;
  }

  await loadRosterFromCloud();

  if (roundState || roundStorage.getUnfinished()) {
    await clearRoundCacheForReset();
  }

  roundSettings = null;
  pendingRoundSettings = null;
  roundState = null;
  selectedPlayers = [];
  currentGroupIndex = 0;
  groupHoleIndexes = [];
  completedRoundSaved = false;
  elements.roundDate.value = "";
  elements.roundName.value = "";
  elements.memberSearch.value = "";
  elements.memberList.selectedMemberIds = new Set();
  elements.memberList.teeOverrides = new Map();
  renderSetupView(elements, courses, members);
  setActiveScreen("setup");
  scrollToTop();

  if (focusTeamSetup) {
    elements.gameList.querySelector('[data-game-enabled="teamChallenge"]')?.focus();
  }
}

function showLiveScoring() {
  if (!roundState) {
    if (commissionerMode) {
      openSetupWizard();
      return;
    }

    renderScorerSelection();
    elements.scorerAccessStatus.textContent = "No active round yet. Ask the commissioner to start one.";
    return;
  }

  setActiveScreen("round");
  renderApp();
  showScoreMyGroup();
  scrollToScoring();
}

function showLeaderboard() {
  showLiveScoring();

  if (roundState) {
    showLeaderboardPage();
  }
}

function showSimpleScreen(screenName) {
  setActiveScreen(screenName);
  scrollToTop();
}

function formatRatingValue(value) {
  return value === null || value === undefined ? "Not set" : value;
}

function renderCourseInfo() {
  const course = selectedCourse || courses[0];
  const teeIds = course.teeOrder;
  const teeCards = teeIds
    .map((teeId) => {
      const tee = course.teeRatings[teeId];

      return `
        <div class="summary-card">
          <span>${tee.label}</span>
          <strong>${tee.totalYardage ?? "Not set"} yds</strong>
          <small>Rating ${formatRatingValue(tee.courseRating)} | Slope ${formatRatingValue(tee.slopeRating)}</small>
        </div>
      `;
    })
    .join("");
  const holeRows = course.tees[teeIds[0]]
    .map((hole, index) => `
      <tr>
        <td>${hole.hole}</td>
        <td>${hole.par}</td>
        <td>${hole.handicap}</td>
        ${teeIds.map((teeId) => `<td>${course.tees[teeId][index].yards ?? "Not set"}</td>`).join("")}
      </tr>
    `)
    .join("");

  elements.courseInfoContent.innerHTML = `
    <div class="setup-panel">
      <strong>${course.name}</strong>
      <span class="player-details">Read-only verification. This page uses the same course data source as scoring.</span>
    </div>

    <section class="summary-block">
      <h3>Tee Summary</h3>
      <div class="summary-grid">${teeCards}</div>
    </section>

    <section class="summary-block">
      <h3>Hole-by-Hole Data</h3>
      <div class="course-table-wrap">
        <table class="course-info-table">
          <thead>
            <tr>
              <th>Hole</th>
              <th>Par</th>
              <th>HCP</th>
              ${teeIds.map((teeId) => `<th>${course.teeRatings[teeId].label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${holeRows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function formatHandicapNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "Not available";
}

function getHandicapDetailsFor(player, course, teeId) {
  return window.OGSGolf.rules.getCourseHandicapDetails(
    { ...player, tee: teeId },
    course,
    teeId
  );
}

function renderHandicapVerificationResult() {
  const player = members.find((member) => member.id === elements.handicapVerifyPlayer.value) || members[0];
  const course = courses.find((item) => item.id === elements.handicapVerifyCourse.value) || courses[0];
  const teeId = elements.handicapVerifyTee.value || player?.tee || course.teeOrder[0];

  if (!player || !course) {
    elements.handicapVerifyResult.innerHTML = `<span class="player-details">No player or course available.</span>`;
    return;
  }

  const tee = course.teeRatings[teeId];

  if (!tee || tee.courseRating === null || tee.slopeRating === null) {
    elements.handicapVerifyResult.innerHTML = `<span class="player-details">This tee is missing rating or slope data.</span>`;
    return;
  }

  const details = getHandicapDetailsFor(player, course, teeId);

  elements.handicapVerifyResult.innerHTML = `
    <strong>Player: ${player.name}</strong>
    <span class="player-details">Handicap Index: ${details.handicapIndex}</span>
    <span class="player-details">Course: ${course.name}</span>
    <span class="player-details">Tee: ${tee.label}</span>
    <span class="player-details">Course Rating: ${details.courseRating}</span>
    <span class="player-details">Slope Rating: ${details.slopeRating}</span>
    <span class="player-details">Par: ${details.par}</span>
    <span class="player-details">Unrounded: ${formatHandicapNumber(details.unrounded)}</span>
    <strong>Course Handicap: ${details.courseHandicap}</strong>
  `;
}

function renderHandicapVerificationExamples() {
  const course = courses[0];
  const examplePlayers = members.slice(0, 3);
  const exampleTees = ["white", "silver", "gold"];

  elements.handicapVerifyExamples.innerHTML = examplePlayers
    .map((player, index) => {
      const teeId = exampleTees[index] || player.tee || course.teeOrder[0];
      const tee = course.teeRatings[teeId];
      const details = getHandicapDetailsFor(player, course, teeId);

      return `
        <div class="summary-row">
          <span>${player.name}</span>
          <strong>${tee.label}: CH ${details.courseHandicap}</strong>
          <small>Index ${details.handicapIndex} | Rating ${details.courseRating} | Slope ${details.slopeRating} | Par ${details.par}</small>
          <small>Unrounded ${formatHandicapNumber(details.unrounded)}</small>
        </div>
      `;
    })
    .join("");
}

function renderHandicapVerification() {
  const currentPlayerId = elements.handicapVerifyPlayer.value;
  const currentCourseId = elements.handicapVerifyCourse.value || selectedCourse.id;
  const course = courses.find((item) => item.id === currentCourseId) || selectedCourse || courses[0];
  const player = members.find((member) => member.id === currentPlayerId) || members[0];

  elements.handicapVerifyPlayer.innerHTML = members
    .map((member) => `<option value="${member.id}"${member.id === player?.id ? " selected" : ""}>${member.name}</option>`)
    .join("");
  elements.handicapVerifyCourse.innerHTML = courses
    .map((item) => `<option value="${item.id}"${item.id === course.id ? " selected" : ""}>${item.name}</option>`)
    .join("");
  elements.handicapVerifyTee.innerHTML = course.teeOrder
    .map((teeId) => {
      const tee = course.teeRatings[teeId];
      const selected = teeId === (elements.handicapVerifyTee.value || player?.tee || course.teeOrder[0]);
      return `<option value="${teeId}"${selected ? " selected" : ""}>${tee.label}</option>`;
    })
    .join("");

  renderHandicapVerificationResult();
  renderHandicapVerificationExamples();
}

function setCommissionerMode(isOn) {
  commissionerMode = isOn;
  currentScorerId = isOn ? null : currentScorerId;

  if (isOn) {
    scorerStorage.clearScorerId();
  }

  scorerStorage.setCommissionerMode(isOn);
  renderAccessMode();

  if (!isOn) {
    if (roundState && currentScorerId) {
      currentGroupIndex = getAssignedGroupIndex(currentScorerId);
      setActiveScreen("round");
      renderApp();
      showScoreMyGroup();
      scrollToScoring();
      return;
    }

    renderScorerSelection();
  }
}

function turnOnCommissionerFromMenu() {
  if (elements.menuCommissionerPin.value !== scorerStorage.commissionerPin) {
    elements.modeStatus.textContent = "Wrong Commissioner PIN. Admin tools stayed locked.";
    elements.menuCommissionerPin.value = "";
    elements.menuCommissionerPin.focus();
    return false;
  }

  elements.menuCommissionerPin.value = "";
  setCommissionerMode(true);
  return true;
}

async function handleMenuAction(action) {
  closeMenu();

  if (action === "setup") {
    await openSetupWizard();
    return;
  }

  if (action === "editSetup") {
    if (!commissionerMode) {
      showAdminRequiredMessage("Turn on Commissioner Mode to edit round setup.");
      return;
    }

    if (!roundState) {
      await openSetupWizard();
      return;
    }

    setActiveScreen("round");
    renderApp();
    elements.modeStatus.textContent = "Edit Round Setup is commissioner-only. Setup is locked for scorers; make beta corrections from Commissioner View.";
    scrollToScoring();
    return;
  }

  if (action === "scoring") {
    showLiveScoring();
    return;
  }

  if (action === "leaderboard") {
    showLeaderboard();
    return;
  }

  if (action === "courseInfo") {
    renderCourseInfo();
    showSimpleScreen("courseInfo");
    return;
  }

  if (action === "handicapVerify") {
    if (!commissionerMode) {
      showAdminRequiredMessage("Turn on Commissioner Mode to verify course handicaps.");
      return;
    }

    renderHandicapVerification();
    showSimpleScreen("handicapVerify");
    return;
  }

  if (action === "players") {
    showPlayerManagement();
    return;
  }

  if (action === "courses") {
    if (!commissionerMode) {
      showAdminRequiredMessage("Turn on Commissioner Mode to manage courses.");
      return;
    }

    showSimpleScreen("courses");
    return;
  }

  if (action === "bets") {
    if (!commissionerMode) {
      showAdminRequiredMessage("Turn on Commissioner Mode to edit bet settings.");
      return;
    }

    showSimpleScreen("bets");
    return;
  }

  if (action === "teams") {
    await openSetupWizard({ focusTeamSetup: true });
    return;
  }

  if (action === "previous") {
    showPreviousRounds();
    return;
  }

  if (action === "help" || action === "about") {
    showSimpleScreen(action);
  }
}

function showRosterCloudStatus(message) {
  if (!elements.rosterCloudStatus) return;

  elements.rosterCloudStatus.textContent = message;

  const shouldShowRosterStatus = commissionerMode
    || !elements.setupScreen.classList.contains("is-hidden")
    || !elements.playerManagementScreen.classList.contains("is-hidden");
  elements.rosterCloudStatus.classList.toggle("is-hidden", !shouldShowRosterStatus);
}

function mergeRoster(localPlayers, cloudPlayers) {
  const mergedById = new Map();

  localPlayers.forEach((player) => {
    mergedById.set(player.id, player);
  });

  cloudPlayers.forEach((player) => {
    mergedById.set(player.id, player);
  });

  return Array.from(mergedById.values()).sort((firstPlayer, secondPlayer) =>
    firstPlayer.name.localeCompare(secondPlayer.name)
  );
}

async function loadRosterFromCloud({ manual = false } = {}) {
  if (manual && elements.playerManagementStatus) {
    elements.playerManagementStatus.textContent = "Loading roster from Supabase...";
  }

  const result = await roundCloudService.loadPlayers();

  if (result.ok && result.players.length > 0) {
    members = mergeRoster(playerStorage.getAll(defaultPlayers), result.players);
    playerStorage.saveAll(members);
    renderSetupView(elements, courses, members);

    if (!elements.playerManagementScreen.classList.contains("is-hidden")) {
      renderPlayerManagement(elements, members, maxRosterSize);
    }

    if (manual && elements.playerManagementStatus) {
      elements.playerManagementStatus.textContent = result.message;
    }

    showRosterCloudStatus(result.message);
    return true;
  }

  const failureMessage = "Cloud roster failed, using default roster.";

  if (!playerStorage.hasSavedRoster()) {
    members = defaultPlayers;
    renderSetupView(elements, courses, members);
  }

  if (manual && elements.playerManagementStatus) {
    elements.playerManagementStatus.textContent = failureMessage;
  }

  showRosterCloudStatus(failureMessage);
  return false;
}

function renderHoleStatus() {
  if (!roundState) return;

  const visibleGroups = commissionerMode
    ? roundSettings.groups.map((group, index) => ({ group, index }))
    : [{ group: roundSettings.groups[currentGroupIndex], index: currentGroupIndex }];
  const canEdit = canEditCurrentGroup();
  const groupComplete = isGroupComplete(currentGroupIndex);

  elements.roundNameStatus.textContent = roundSettings.roundName || "OG's Golf";
  elements.courseNameStatus.textContent = roundSettings.course?.name || selectedCourse.name;
  elements.commissionerViewBadge.classList.toggle("is-hidden", !commissionerMode);
  elements.currentHoleStatus.textContent =
    groupComplete
      ? `Group ${currentGroupIndex + 1} complete`
      : `Hole ${roundState.currentHoleIndex + 1} of ${roundState.totalHoles}`;
  elements.currentGroupStatus.textContent =
    `Group ${currentGroupIndex + 1}`;
  elements.groupSwitcher.innerHTML = visibleGroups
    .map(({ group, index }) => {
      const groupRecord = getGroupRecord(index);
      const completeText = isGroupComplete(index) ? "complete" : `Hole ${groupRecord.currentHole}`;
      return `<option value="${index}"${index === currentGroupIndex ? " selected" : ""}>Group ${index + 1} - ${completeText} - ${group.length} players</option>`;
    })
    .join("");
  const sequence = getGroupHoleSequence(currentGroupIndex);
  elements.holeSelector.innerHTML = getValidHoleNumbers()
    .map((holeNumber) => {
      const isRequired = sequence.includes(holeNumber);
      const label = isRequired ? `Hole ${holeNumber}` : `Hole ${holeNumber} (extra)`;
      return `<option value="${holeNumber}"${holeNumber === roundState.currentHoleIndex + 1 ? " selected" : ""}>${label}</option>`;
    })
    .join("");
  elements.holeSelector.disabled = !canEdit;
  elements.commissionerGroupControls.classList.toggle("is-hidden", !commissionerMode);
  elements.previousGroup.classList.add("is-hidden");
  elements.nextGroup.classList.add("is-hidden");
  elements.previousGroup.disabled = true;
  elements.nextGroup.disabled = true;
  elements.groupSwitcher.disabled = !commissionerMode;
  elements.roundScreen.classList.toggle("is-group-complete", groupComplete);
  elements.saveHole.classList.toggle("is-hidden", groupComplete);
  elements.saveHole.disabled = !canEdit || groupComplete;
  elements.previousHole.disabled = !canEdit;
  elements.nextHole.classList.add("is-hidden");
  elements.undoLastHole.classList.add("is-hidden");
  elements.nextHole.disabled = true;
  elements.undoLastHole.disabled = !canEdit;
  elements.holePlayers.querySelectorAll("button[data-player-id]").forEach((button) => {
    button.disabled = !canEdit;
  });
  if (groupComplete) {
    renderCompletedGroupPage();
  } else {
    elements.completedGroupPanel.classList.add("is-hidden");
    renderGroupCompletionSummary();
  }
}

function renderCurrentHole() {
  if (isGroupComplete(currentGroupIndex)) {
    syncRoundStateToCurrentGroup();
  } else {
    renderHoleView(elements, selectedCourse, getCurrentGroupPlayers(), roundState);
  }
  renderHoleStatus();
}

function getCurrentGroupPlayers() {
  const groupIds = roundSettings?.groups?.[currentGroupIndex] || selectedPlayers.slice(0, 4).map((player) => player.id);
  return selectedPlayers.filter((player) => groupIds.includes(player.id));
}

function getGroupPlayers(groupIndex) {
  const groupIds = roundSettings?.groups?.[groupIndex] || [];
  return selectedPlayers.filter((player) => groupIds.includes(player.id));
}

function getValidHoleNumbers() {
  const courseHoleCount = selectedCourse?.tees?.[selectedCourse.teeOrder?.[0]]?.length || 18;
  return Array.from({ length: roundState?.totalHoles || courseHoleCount }, (_, index) => index + 1);
}

function buildHoleSequence(startingHole = 1, holesToPlay = 18) {
  const totalHoles = roundState?.totalHoles || 18;
  const start = Math.max(1, Math.min(totalHoles, Number(startingHole) || 1));
  const count = Math.max(1, Math.min(totalHoles, Number(holesToPlay) || totalHoles));

  return Array.from({ length: count }, (_, index) =>
    ((start - 1 + index) % totalHoles) + 1
  );
}

function getGroupRecord(groupIndex = currentGroupIndex) {
  if (!roundSettings) return null;

  roundSettings.groupRecords = roundSettings.groupRecords || [];
  if (!roundSettings.groupRecords[groupIndex]) {
    roundSettings.groupRecords[groupIndex] = {
      id: `group-${groupIndex + 1}`,
      label: `Group ${groupIndex + 1}`,
      playerIds: roundSettings.groups[groupIndex] || [],
      scorekeeperId: roundSettings.groupScorers?.[groupIndex] || "",
      startingHole: (groupHoleIndexes[groupIndex] ?? 0) + 1,
      currentHole: (groupHoleIndexes[groupIndex] ?? 0) + 1,
      holesToPlay: roundState?.totalHoles || 18,
      completedHoleNumbers: [],
      status: "in_progress"
    };
  }

  const record = roundSettings.groupRecords[groupIndex];
  record.playerIds = roundSettings.groups[groupIndex] || record.playerIds || [];
  record.scorekeeperId = roundSettings.groupScorers?.[groupIndex] || record.scorekeeperId || "";
  record.startingHole = Number(record.startingHole || 1);
  record.currentHole = Number(record.currentHole || record.startingHole || 1);
  record.holesToPlay = Number(record.holesToPlay || roundState?.totalHoles || 18);
  record.completedHoleNumbers = Array.from(new Set((record.completedHoleNumbers || []).map(Number))).sort((a, b) => a - b);
  record.status = record.completedHoleNumbers.length >= record.holesToPlay ? "completed" : (record.status || "in_progress");

  return record;
}

function getGroupHoleSequence(groupIndex = currentGroupIndex) {
  const record = getGroupRecord(groupIndex);
  return buildHoleSequence(record?.startingHole || 1, record?.holesToPlay || 18);
}

function setCurrentHoleForGroup(groupIndex, holeNumber) {
  const validHoleNumbers = getValidHoleNumbers();
  const nextHoleNumber = validHoleNumbers.includes(Number(holeNumber))
    ? Number(holeNumber)
    : validHoleNumbers[0];
  const record = getGroupRecord(groupIndex);

  record.currentHole = nextHoleNumber;
  groupHoleIndexes[groupIndex] = nextHoleNumber - 1;
}

function markGroupHoleComplete(groupIndex, holeNumber) {
  const record = getGroupRecord(groupIndex);
  const sequence = getGroupHoleSequence(groupIndex);

  if (!sequence.includes(holeNumber)) return;

  record.completedHoleNumbers = Array.from(new Set([
    ...(record.completedHoleNumbers || []),
    holeNumber
  ])).sort((a, b) => a - b);
  record.status = record.completedHoleNumbers.length >= record.holesToPlay
    ? "completed"
    : "in_progress";
}

function getGroupGrossRows(groupIndex = currentGroupIndex) {
  const record = getGroupRecord(groupIndex);
  const sequence = getGroupHoleSequence(groupIndex);
  const isNineHoleRound = Number(record.holesToPlay) === 9;
  const nineLabel = sequence.every((holeNumber) => holeNumber <= 9)
    ? "Front"
    : sequence.every((holeNumber) => holeNumber >= 10)
      ? "Back"
      : "Nine";

  return getGroupPlayers(groupIndex).map((player) => {
    const front = sequence
      .filter((holeNumber) => holeNumber <= 9)
      .reduce((total, holeNumber) => total + Number(roundState.savedScores[player.id][holeNumber - 1] || 0), 0);
    const back = sequence
      .filter((holeNumber) => holeNumber >= 10)
      .reduce((total, holeNumber) => total + Number(roundState.savedScores[player.id][holeNumber - 1] || 0), 0);
    const gross = sequence.reduce((total, holeNumber) =>
      total + Number(roundState.savedScores[player.id][holeNumber - 1] || 0), 0
    );

    return {
      player,
      holes: sequence.length,
      front,
      back,
      gross,
      isNineHoleRound,
      nineLabel
    };
  });
}

function renderGroupCompletionSummary() {
  if (!isGroupComplete(currentGroupIndex)) {
    elements.groupCompletionSummary.classList.add("is-hidden");
    elements.groupCompletionSummary.textContent = "";
    return;
  }

  const record = getGroupRecord(currentGroupIndex);
  const summaryRows = getGroupGrossRows(currentGroupIndex)
    .map((row) => `${row.player.name}: Gross ${row.gross}`)
    .join(" | ");

  elements.groupCompletionSummary.classList.remove("is-hidden");
  elements.groupCompletionSummary.textContent =
    `Group ${currentGroupIndex + 1} complete: ${record.completedHoleNumbers.length} of ${record.holesToPlay} required holes saved. ${summaryRows}`;
}

function renderCompletedGroupPage() {
  const record = getGroupRecord(currentGroupIndex);
  const rows = getGroupGrossRows(currentGroupIndex);
  const firstRow = rows[0];
  const isNineHoleRound = firstRow?.isNineHoleRound;
  const nineLabel = firstRow?.nineLabel || "Nine";
  const headerCells = isNineHoleRound
    ? `<th>Player</th><th>Holes</th><th>${nineLabel}</th><th>Gross</th>`
    : `<th>Player</th><th>Holes</th><th>Front</th><th>Back</th><th>Gross</th>`;
  const bodyRows = rows.map((row) => isNineHoleRound
    ? `
      <tr>
        <td>${row.player.name}</td>
        <td>${row.holes}</td>
        <td>${row.gross}</td>
        <td>${row.gross}</td>
      </tr>
    `
    : `
      <tr>
        <td>${row.player.name}</td>
        <td>${row.holes}</td>
        <td>${row.front}</td>
        <td>${row.back}</td>
        <td>${row.gross}</td>
      </tr>
    `).join("");

  elements.completedGroupTitle.textContent = `Group ${currentGroupIndex + 1} Round Complete`;
  elements.completedGroupMessage.textContent =
    `Group ${currentGroupIndex + 1} has completed all required holes. All gross scores have been saved.`;
  elements.completedGroupGrossSummary.innerHTML = `
    <table class="course-info-table completed-score-table">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
  elements.completedGroupStatus.textContent = areAllGroupsComplete()
    ? "All groups have completed the round. The commissioner may now review and close the event."
    : "Waiting for the remaining groups to finish.";
  elements.activeRoundManagement.classList.toggle("is-hidden", !commissionerMode);
  elements.groupScoreReview.classList.add("is-hidden");
  elements.groupScoreReview.innerHTML = "";
  elements.completedGroupPanel.classList.remove("is-hidden");
}

function renderGroupScoreReview() {
  const sequence = getGroupHoleSequence(currentGroupIndex);
  const players = getCurrentGroupPlayers();
  const holeRows = sequence.map((holeNumber) => {
    const scores = players
      .map((player) => `<td>${roundState.savedScores[player.id][holeNumber - 1] ?? "-"}</td>`)
      .join("");

    return `<tr><td>Hole ${holeNumber}</td>${scores}</tr>`;
  }).join("");
  const playerHeaders = players.map((player) => `<th>${player.name}</th>`).join("");
  const grossRows = getGroupGrossRows(currentGroupIndex);
  const firstRow = grossRows[0];
  const isNineHoleRound = firstRow?.isNineHoleRound;
  const nineLabel = firstRow?.nineLabel || "Nine";
  const frontTotals = players.map((player) => {
    const row = grossRows.find((grossRow) => grossRow.player.id === player.id);
    return `<td>${row?.front || "-"}</td>`;
  }).join("");
  const backTotals = players.map((player) => {
    const row = grossRows.find((grossRow) => grossRow.player.id === player.id);
    return `<td>${row?.back || "-"}</td>`;
  }).join("");
  const grossTotals = players.map((player) => {
    const row = grossRows.find((grossRow) => grossRow.player.id === player.id);
    return `<td>${row?.gross ?? "-"}</td>`;
  }).join("");
  const nineTotals = players.map((player) => {
    const row = grossRows.find((grossRow) => grossRow.player.id === player.id);
    return `<td>${row?.gross ?? "-"}</td>`;
  }).join("");

  elements.groupScoreReview.innerHTML = `
    <h3>Review Group ${currentGroupIndex + 1} Scores</h3>
    <div class="course-table-wrap">
      <table class="course-info-table completed-score-table">
        <thead>
          <tr><th>Hole</th>${playerHeaders}</tr>
        </thead>
        <tbody>
          ${holeRows}
          ${isNineHoleRound
            ? `<tr><td><strong>${nineLabel} Gross</strong></td>${nineTotals}</tr>`
            : `
              <tr><td><strong>Front Gross</strong></td>${frontTotals}</tr>
              <tr><td><strong>Back Gross</strong></td>${backTotals}</tr>
            `}
          <tr><td><strong>Total Gross</strong></td>${grossTotals}</tr>
        </tbody>
      </table>
    </div>
  `;
  elements.groupScoreReview.classList.toggle("is-hidden");
}

function showActiveRoundManagement() {
  if (!commissionerMode) return;

  elements.completedGroupStatus.textContent =
    "Commissioner Mode: use the main menu to manage the active round or select another group.";
}

function getNextUncompletedHole(groupIndex) {
  const record = getGroupRecord(groupIndex);
  const completed = new Set(record.completedHoleNumbers || []);
  return getGroupHoleSequence(groupIndex).find((holeNumber) => !completed.has(holeNumber)) || null;
}

function isGroupComplete(groupIndex) {
  if (!roundState || !roundSettings?.groups?.[groupIndex]) return false;

  const record = getGroupRecord(groupIndex);
  return record.status === "completed" || record.completedHoleNumbers.length >= record.holesToPlay;
}

function getNextOpenGroupIndex(startingIndex) {
  if (!roundSettings) return 0;

  for (let offset = 1; offset <= roundSettings.groups.length; offset += 1) {
    const nextIndex = (startingIndex + offset) % roundSettings.groups.length;

    if (!isGroupComplete(nextIndex)) {
      return nextIndex;
    }
  }

  return null;
}

function areAllGroupsComplete() {
  if (!roundSettings?.groups?.length) return false;

  return roundSettings.groups.every((group, index) => isGroupComplete(index));
}

function syncRoundStateToCurrentGroup() {
  if (!roundState) return;

  const record = getGroupRecord(currentGroupIndex);
  roundState.goToHole(Math.max(0, Number(record.currentHole || 1) - 1));
}

function goToGroup(nextGroupIndex) {
  if (!roundSettings) return;
  if (!commissionerMode && roundSettings.groupScorers?.[nextGroupIndex] !== currentScorerId) return;

  currentGroupIndex = Math.max(0, Math.min(roundSettings.groups.length - 1, nextGroupIndex));
  syncRoundStateToCurrentGroup();
  renderApp();
  scrollToScoring();
}

function goToHoleForCurrentGroup(nextHoleIndex) {
  if (!roundState) return;

  setCurrentHoleForGroup(currentGroupIndex, Math.max(1, Math.min(roundState.totalHoles, nextHoleIndex + 1)));
  syncRoundStateToCurrentGroup();
  renderCurrentHole();
}

function renderApp() {
  renderRoundSettingsSummary(elements, roundSettings);
  renderCurrentHole();
  renderLeaderboard(elements, selectedPlayers, roundState);
  elements.roundSettingsSummary.closest(".round-settings-section").classList.add("is-hidden");
  elements.pointsPayout.closest(".points-payout-section").classList.add("is-hidden");
  elements.skinsSummary.closest(".skins-section").classList.add("is-hidden");
}

function showScoreMyGroup() {
  if (!roundState) return;

  if (!commissionerMode && !viewOnlyMode && currentScorerId) {
    currentGroupIndex = getAssignedGroupIndex(currentScorerId);
    syncRoundStateToCurrentGroup();
    renderCurrentHole();
  }

  elements.roundScreen.classList.remove("is-leaderboard-view");
  scrollToScoring();
}

function showLeaderboardPage() {
  if (!roundState) return;

  renderLeaderboard(elements, selectedPlayers, roundState);
  elements.roundScreen.classList.add("is-leaderboard-view");
  scrollToTop();
}

function getAssignedGroupIndex(playerId) {
  if (!roundSettings?.groupScorers) return 0;
  const groupIndex = roundSettings.groupScorers.findIndex((scorerId) => scorerId === playerId);
  return groupIndex >= 0 ? groupIndex : 0;
}

function getPlayerGroupIndex(playerId) {
  if (!roundSettings?.groups) return 0;
  const groupIndex = roundSettings.groups.findIndex((group) => group.includes(playerId));
  return groupIndex >= 0 ? groupIndex : 0;
}

function canEditCurrentGroup() {
  if (!roundState) return false;
  if (commissionerMode) return true;
  if (viewOnlyMode) return false;
  return Boolean(currentScorerId && roundSettings?.groupScorers?.[currentGroupIndex] === currentScorerId);
}

function renderScorerSelection() {
  const activePlayers = selectedPlayers.length
    ? selectedPlayers
    : members.filter((member) => member.active);
  elements.scorerList.innerHTML = activePlayers
    .map((player) => `
      <button type="button" class="secondary-button" data-scorer-id="${player.id}">
        ${player.name}
      </button>
    `)
    .join("");
  elements.scorerAccessStatus.textContent = "";
  setActiveScreen("scorer");
  scrollToTop();
}

function continueFromTodayRound() {
  viewOnlyMode = false;
  if (roundState) {
    if (commissionerMode) {
      setActiveScreen("round");
      renderApp();
      showScoreMyGroup();
      scrollToScoring();
      return;
    }

    if (currentScorerId) {
      if (roundSettings.groupScorers && !roundSettings.groupScorers.includes(currentScorerId)) {
        scorerStorage.clearScorerId();
        currentScorerId = null;
        renderScorerSelection();
        elements.scorerAccessStatus.textContent = "Choose the scorer assigned to this group.";
        return;
      }

      currentGroupIndex = getAssignedGroupIndex(currentScorerId);
      syncRoundStateToCurrentGroup();
      setActiveScreen("round");
      renderApp();
      showScoreMyGroup();
      scrollToScoring();
      return;
    }

    renderScorerSelection();
    return;
  }

  if (commissionerMode) {
    setActiveScreen("setup");
    scrollToTop();
    return;
  }

  renderScorerSelection();
  elements.scorerAccessStatus.textContent = "No active event found yet. Ask the commissioner to create one.";
}

function viewLiveMatch() {
  if (!roundState) {
    showTodayRoundScreen();
    elements.todayStatus.textContent = "No active round yet.";
    return;
  }

  viewOnlyMode = true;
  setActiveScreen("round");
  renderApp();
  showLeaderboardPage();
}

function choosePlayerOrScorer() {
  if (!roundState) {
    showTodayRoundScreen();
    elements.todayStatus.textContent = "No active round yet.";
    return;
  }

  if (currentScorerId) {
    enterScorer(currentScorerId);
    return;
  }

  renderScorerSelection();
}

function openCommissionerFromToday() {
  if (commissionerMode) {
    if (roundState) {
      setActiveScreen("round");
      renderApp();
      showScoreMyGroup();
      scrollToScoring();
      return;
    }

    openSetupWizard();
    return;
  }

  elements.todayStatus.textContent = "Open the menu, enter the Commissioner PIN, then tap Commissioner Mode.";
  elements.menuCommissionerPin.focus();
}

function enterScorer(playerId) {
  currentScorerId = playerId;
  commissionerMode = false;
  viewOnlyMode = false;
  scorerStorage.saveScorerId(playerId);
  scorerStorage.setCommissionerMode(false);

  if (roundState) {
    if (roundSettings.groupScorers && !roundSettings.groupScorers.includes(playerId)) {
      viewOnlyMode = true;
      currentGroupIndex = getPlayerGroupIndex(playerId);
      syncRoundStateToCurrentGroup();
      setActiveScreen("round");
      renderApp();
      showLeaderboardPage();
      return;
    }

    currentGroupIndex = getAssignedGroupIndex(playerId);
    syncRoundStateToCurrentGroup();
    setActiveScreen("round");
    renderApp();
    showScoreMyGroup();
    scrollToScoring();
    return;
  }

  renderScorerSelection();
  elements.scorerAccessStatus.textContent = "Scorers wait here. Commissioner View creates the active event.";
}

function showSaveStatus(savedHoleIndex, savedGroupIndex) {
  window.clearTimeout(statusTimer);
  elements.saveStatusMessage.innerHTML =
    `&#10003; Hole ${savedHoleIndex + 1} Group ${savedGroupIndex + 1} Saved`;

  statusTimer = window.setTimeout(() => {
    elements.saveStatusMessage.textContent = "";
  }, 2000);
}

function mergeActiveRound(localRound, cloudRound, savedGroupIndex, savedHoleIndex) {
  if (!cloudRound || cloudRound.id !== localRound.id || savedGroupIndex === undefined || savedHoleIndex === undefined) {
    return localRound;
  }

  const mergedRound = {
    ...cloudRound,
    roundSettings: {
      ...(cloudRound.roundSettings || {}),
      ...(localRound.roundSettings || {}),
      groupRecords: localRound.roundSettings?.groupRecords || cloudRound.roundSettings?.groupRecords || []
    },
    currentGroupIndex: localRound.currentGroupIndex,
    currentHoleIndex: localRound.currentHoleIndex,
    currentHole: localRound.currentHole,
    groupHoleIndexes: [...(cloudRound.groupHoleIndexes || localRound.groupHoleIndexes || [])],
    savedScores: {
      ...(cloudRound.savedScores || {})
    },
    savedHoleResults: [...(cloudRound.savedHoleResults || localRound.savedHoleResults || [])]
  };
  const savedPlayerIds = new Set(roundSettings.groups[savedGroupIndex] || []);

  mergedRound.groupHoleIndexes[savedGroupIndex] = localRound.groupHoleIndexes[savedGroupIndex];

  savedPlayerIds.forEach((playerId) => {
    mergedRound.savedScores[playerId] = [
      ...((cloudRound.savedScores || localRound.savedScores)[playerId] || localRound.savedScores[playerId])
    ];
    mergedRound.savedScores[playerId][savedHoleIndex] = localRound.savedScores[playerId][savedHoleIndex];
  });

  const cloudHoleResults = mergedRound.savedHoleResults[savedHoleIndex] || [];
  const localHoleResults = localRound.savedHoleResults[savedHoleIndex] || [];
  mergedRound.savedHoleResults[savedHoleIndex] = [
    ...cloudHoleResults.filter((result) => !savedPlayerIds.has(result.playerId)),
    ...localHoleResults.filter((result) => savedPlayerIds.has(result.playerId))
  ];
  mergedRound.skinResults = cloudRound.skinResults || localRound.skinResults;

  return mergedRound;
}

async function autoSaveUnfinishedRound(savedGroupIndex, savedHoleIndex) {
  if (!roundState || completedRoundSaved) return;

  const autoSaveData = roundState.getAutoSaveExport();
  autoSaveData.groupHoleIndexes = groupHoleIndexes;
  autoSaveData.currentGroupIndex = currentGroupIndex;
  autoSaveData.currentHoleIndex = Math.min(
    groupHoleIndexes[currentGroupIndex] ?? roundState.currentHoleIndex,
    roundState.totalHoles - 1
  );
  autoSaveData.currentHole = autoSaveData.currentHoleIndex + 1;
  const cloudResult = await roundCloudService.loadActiveRound();
  const mergedData = mergeActiveRound(autoSaveData, cloudResult.round, savedGroupIndex, savedHoleIndex);
  roundStorage.saveUnfinished(mergedData);
  await roundCloudService.saveActiveRound(mergedData);
  return mergedData;
}

function saveCompletedRound() {
  if (!roundState || completedRoundSaved) return;

  roundStorage.save(roundState.getRoundExport());
  roundStorage.clearUnfinished();
  completedRoundSaved = true;
}

function showFinalSummary() {
  setActiveScreen("summary");
  renderFinalSummary(elements, roundState);
  elements.cloudSaveStatus.textContent = completedRoundSaved
    ? "Final scores recorded."
    : "Review scores, then tap Confirm Final Scores.";
  scrollToTop();
}

function reviewScorecard() {
  setActiveScreen("round");
  renderApp();
  showScoreMyGroup();
}

function startFreshRound({ clearSavedRound = false } = {}) {
  if (!commissionerMode) {
    renderScorerSelection();
    elements.scorerAccessStatus.textContent = "Enter Commissioner View to start a new event.";
    return;
  }

  if (clearSavedRound) {
    clearRoundCacheForReset().then((result) => {
      elements.modeStatus.textContent = result.ok
        ? "Commissioner View: old saved round cleared."
        : "Commissioner View: local saved round cleared. Cloud active round could not be cleared.";
    });
  }

  roundSettings = null;
  pendingRoundSettings = null;
  roundState = null;
  selectedCourse = courses[0];
  selectedPlayers = [];
  currentGroupIndex = 0;
  groupHoleIndexes = [];
  completedRoundSaved = false;
  elements.saveStatusMessage.textContent = "";
  setActiveScreen("setup");
  renderSetupView(elements, courses, members);
}

function startNewRound() {
  roundStorage.clearUnfinished();
  startFreshRound();
}

async function clearRoundCacheForReset() {
  roundStorage.clearUnfinished();
  scorerStorage.clearScorerId();
  currentScorerId = null;
  return roundCloudService.clearActiveRound();
}

function discardSavedRound() {
  roundStorage.clearUnfinished();
  startFreshRound({ clearSavedRound: true });
}

function saveRound() {
  saveCompletedRound();
  elements.cloudSaveStatus.textContent = "Final scores recorded on this device.";
  renderFinalSummary(elements, roundState);
}

async function saveRoundToCloud() {
  if (!roundState || !roundState.isRoundComplete()) {
    elements.cloudSaveStatus.textContent = "Finish the round before saving to cloud.";
    return;
  }

  if (!completedRoundSaved) {
    elements.cloudSaveStatus.textContent = "Confirm final scores before saving to cloud.";
    return;
  }

  elements.cloudSaveStatus.textContent = "Saving to cloud...";
  const result = await roundCloudService.saveCompletedRound(roundState.getRoundExport());
  elements.cloudSaveStatus.textContent = result.message;
}

async function loadPreviousRoundsFromCloud() {
  elements.previousRoundsStatus.textContent = "Loading cloud rounds...";

  const result = await roundCloudService.loadCompletedRounds();

  if (result.ok) {
    renderPreviousRounds(elements, result.rounds);
    elements.previousRoundsStatus.textContent = "Loaded rounds from cloud";
    return;
  }

  renderPreviousRounds(elements, roundStorage.getAll());
  elements.previousRoundsStatus.textContent = "Cloud load failed, showing local rounds";
}

function showPreviousRounds() {
  loadPreviousRoundsFromCloud();
  setActiveScreen("previous");
  scrollToTop();
}

function showPlayerManagement() {
  if (!commissionerMode) {
    renderScorerSelection();
    elements.scorerAccessStatus.textContent = "Enter Commissioner View to manage players.";
    return;
  }

  renderPlayerManagement(elements, members, maxRosterSize);
  elements.playerManagementStatus.textContent = "Roster changes are saved on this device first.";
  setActiveScreen("players");
  scrollToTop();
}

function returnFromPlayerManagement() {
  renderSetupView(elements, courses, members);

  if (roundState && roundState.isRoundComplete()) {
    setActiveScreen("summary");
    renderFinalSummary(elements, roundState);
    return;
  }

  if (roundState) {
    setActiveScreen("round");
    renderApp();
    return;
  }

  setActiveScreen("setup");
}

function returnFromPreviousRounds() {
  if (roundState && roundState.isRoundComplete()) {
    setActiveScreen("summary");
    renderFinalSummary(elements, roundState);
    return;
  }

  if (roundState) {
    setActiveScreen("round");
    renderApp();
    return;
  }

  setActiveScreen("setup");
}

function getUniquePlayerId(playerId) {
  let uniqueId = playerId || `player-${Date.now()}`;
  let counter = 2;

  while (members.some((player) => player.id === uniqueId)) {
    uniqueId = `${playerId}-${counter}`;
    counter += 1;
  }

  return uniqueId;
}

function getAvailableTeeIds() {
  return new Set((selectedCourse || courses[0]).teeOrder);
}

function findDuplicatePlayer(formPlayer, editingId) {
  const normalizedName = formPlayer.name.trim().toLowerCase();
  const normalizedGhin = formPlayer.ghin.trim().toLowerCase();

  return members.find((player) => {
    if (player.id === editingId) return false;
    const sameName = player.name.trim().toLowerCase() === normalizedName;
    const sameGhin = normalizedGhin && (player.ghin || "").trim().toLowerCase() === normalizedGhin;
    return sameName || sameGhin;
  });
}

function savePlayer(event) {
  event.preventDefault();

  const formResult = readPlayerForm(elements);

  if (formResult.error) {
    elements.playerManagementStatus.textContent = formResult.error;
    return;
  }

  const formPlayer = formResult.player;
  const editingId = elements.editingPlayerId.value;
  const availableTeeIds = getAvailableTeeIds();

  if (!availableTeeIds.has(formPlayer.tee)) {
    elements.playerManagementStatus.textContent = "Default tee must match an available tee for this course.";
    return;
  }

  const duplicatePlayer = findDuplicatePlayer(formPlayer, editingId);

  if (duplicatePlayer) {
    elements.playerManagementStatus.textContent = `Possible duplicate: ${duplicatePlayer.name}. Edit that player instead of creating a new record.`;
    return;
  }

  if (!editingId && members.length >= maxRosterSize) {
    elements.playerManagementStatus.textContent = "The roster already has 50 members.";
    return;
  }

  if (editingId) {
    if (!members.some((player) => player.id === editingId)) {
      elements.playerManagementStatus.textContent = "Could not find the existing player record to update.";
      return;
    }

    members = members.map((player) => (player.id === editingId ? formPlayer : player));
  } else {
    members = [...members, { ...formPlayer, id: getUniquePlayerId(formPlayer.id) }];
  }

  playerStorage.saveAll(members);
  clearPlayerForm(elements);
  renderPlayerManagement(elements, members, maxRosterSize);
  elements.playerManagementStatus.textContent = formPlayer.active
    ? "Player saved on this device."
    : "Player marked inactive. Historical round data is preserved.";
}

function exportRosterBackup() {
  const backup = {
    exportedAt: new Date().toISOString(),
    source: "OGS Golf Player Management",
    playerCount: members.length,
    players: members
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `ogs-golf-roster-backup-${dateStamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  elements.playerManagementStatus.textContent = `Roster backup exported with ${members.length} players.`;
}

async function saveRosterToCloud() {
  playerStorage.saveAll(members);
  elements.playerManagementStatus.textContent = "Saving roster to Supabase...";

  const result = await roundCloudService.savePlayers(members);
  elements.playerManagementStatus.textContent = result.message;
}

function undoLastHole() {
  if (!roundState) return;
  if (!canEditCurrentGroup()) return;

  const currentGroupPlayers = getCurrentGroupPlayers();
  const lastSavedHoleIndex = roundState.getLastSavedHoleIndexForPlayers(currentGroupPlayers);

  if (lastSavedHoleIndex < 0) {
    elements.saveStatusMessage.textContent = "No saved holes to undo for this group.";
    return;
  }

  roundState.clearHoleForPlayers(lastSavedHoleIndex, currentGroupPlayers);
  groupHoleIndexes[currentGroupIndex] = lastSavedHoleIndex;

  if (completedRoundSaved) {
    roundStorage.remove(roundState.id);
    completedRoundSaved = false;
  }

  window.clearTimeout(statusTimer);
  elements.saveStatusMessage.textContent = `Hole ${lastSavedHoleIndex + 1} undone for Group ${currentGroupIndex + 1}.`;
  setActiveScreen("round");
  syncRoundStateToCurrentGroup();
  renderApp();
  autoSaveUnfinishedRound();
  scrollToScoring();
}

function continueToGroups() {
  if (!commissionerMode) {
    renderScorerSelection();
    elements.scorerAccessStatus.textContent = "Commissioner View creates events.";
    return;
  }

  pendingRoundSettings = readSetupSettings(elements, courses, members);

  if (!pendingRoundSettings.course || !pendingRoundSettings.date) {
    elements.modeStatus.textContent = "Choose a course and date before continuing.";
    return;
  }

  if (pendingRoundSettings.players.length === 0) {
    elements.modeStatus.textContent = "Select at least one active player before continuing.";
    return;
  }

  renderGroupSetupView(elements, pendingRoundSettings);
  setActiveScreen("groups");
  scrollToTop();
}

function backToRoundSetup() {
  setActiveScreen("setup");
  scrollToTop();
}

function updateGroupCount(amount) {
  if (!pendingRoundSettings) return;

  const currentGroups = readGroupAssignments(elements, pendingRoundSettings.players);
  const currentCount = elements.groupSetupList.groupCount || Math.max(1, currentGroups.length);
  const nextCount = Math.max(1, currentCount + amount);
  pendingRoundSettings.groups = currentGroups;
  pendingRoundSettings.groupCount = nextCount;
  renderGroupSetupView(elements, pendingRoundSettings);
}

function refreshScorekeeperChoices() {
  if (!pendingRoundSettings) return;

  const groups = readGroupAssignments(elements, pendingRoundSettings.players);
  renderGroupScorerOptions(elements, pendingRoundSettings.players, groups);
}

function createGroupRecords(groups, groupScorers, groupPlaySettings = []) {
  return groups.map((group, index) => ({
    id: `group-${index + 1}`,
    label: `Group ${index + 1}`,
    playerIds: group,
    scorekeeperId: groupScorers[index],
    startingHole: groupPlaySettings[index]?.startingHole || 1,
    currentHole: groupPlaySettings[index]?.startingHole || 1,
    holesToPlay: groupPlaySettings[index]?.holesToPlay || 18,
    completedHoleNumbers: [],
    status: "in_progress"
  }));
}

function validateGroupSetup(groups, groupScorers, players) {
  const selectedPlayerIds = players.map((player) => player.id);
  const assignedPlayerIds = groups.flat();
  const assignedSet = new Set(assignedPlayerIds);

  if (groups.length === 0) {
    return "Create at least one group.";
  }

  if (assignedPlayerIds.length !== selectedPlayerIds.length || assignedSet.size !== selectedPlayerIds.length) {
    return "Every selected player must be assigned to exactly one group.";
  }

  const missingPlayer = selectedPlayerIds.find((playerId) => !assignedSet.has(playerId));
  if (missingPlayer) {
    return "Every selected player must be assigned to a group.";
  }

  const groupWithoutScorer = groups.findIndex((group, index) => {
    const scorerId = groupScorers[index];
    return !scorerId || !group.includes(scorerId);
  });

  if (groupWithoutScorer >= 0) {
    return `Choose a scorekeeper from Group ${groupWithoutScorer + 1}.`;
  }

  return "";
}

function reviewEventSummary() {
  if (!pendingRoundSettings) return;

  const groups = readGroupAssignments(elements, pendingRoundSettings.players);
  const groupScorers = readGroupScorers(elements, groups);
  const groupPlaySettings = readGroupPlaySettings(elements, groups);
  const validationMessage = validateGroupSetup(groups, groupScorers, pendingRoundSettings.players);

  if (validationMessage) {
    elements.groupSetupStatus.textContent = validationMessage;
    return;
  }

  roundSettings = {
    ...pendingRoundSettings,
    groups,
    groupScorers,
    groupRecords: createGroupRecords(groups, groupScorers, groupPlaySettings),
    eventStatus: "Pre-Round Review",
    setupLocked: false,
    preRoundReviewComplete: false
  };
  renderEventSummary(elements, roundSettings);
  setActiveScreen("eventSummary");
  scrollToTop();
}

function backToGroupSetup() {
  setActiveScreen("groups");
  scrollToTop();
}

async function beginGroupedRound() {
  if (!roundSettings) return;

  roundSettings = {
    ...roundSettings,
    groupRecords: roundSettings.groupRecords,
    startingHole: roundSettings.groupRecords?.[0]?.startingHole || 1,
    currentHole: roundSettings.groupRecords?.[0]?.currentHole || 1,
    eventStatus: "Started",
    setupLocked: true,
    preRoundReviewComplete: true,
    startedAt: new Date().toISOString()
  };
  selectedCourse = roundSettings.course;
  selectedPlayers = roundSettings.players;
  roundState = createRoundState(selectedCourse, selectedPlayers, roundSettings);
  currentGroupIndex = 0;
  groupHoleIndexes = roundSettings.groups.map((group, index) =>
    Math.max(0, (getGroupRecord(index).currentHole || 1) - 1)
  );
  completedRoundSaved = false;
  roundStorage.clearUnfinished();

  setActiveScreen("round");
  renderApp();
  await autoSaveUnfinishedRound();
  scrollToScoring();
}

function loadSavedRoundIntoState(savedRound) {
  selectedCourse = courses.find((course) => course.id === savedRound.course.id) || courses[0];
  selectedPlayers = savedRound.players.map((player) => ({
    ...player,
    handicap: player.handicapIndex ?? player.handicap
  }));
  roundSettings = {
    ...savedRound.roundSettings,
    course: selectedCourse,
    players: selectedPlayers
  };
  roundState = createRoundState(selectedCourse, selectedPlayers, roundSettings, savedRound);
  currentGroupIndex = savedRound.currentGroupIndex || 0;
  roundSettings.groupRecords = roundSettings.groupRecords || savedRound.roundSettings?.groupRecords || [];
  groupHoleIndexes = savedRound.groupHoleIndexes || roundSettings.groups.map((group, index) =>
    Math.max(0, (getGroupRecord(index).currentHole || savedRound.currentHole || 1) - 1)
  );

  if (!commissionerMode && currentScorerId) {
    currentGroupIndex = getAssignedGroupIndex(currentScorerId);
  }

  syncRoundStateToCurrentGroup();
  completedRoundSaved = false;
}

function showResumePrompt(savedRound) {
  elements.resumeCourseName.textContent = savedRound.course.name;
  const groupText = savedRound.currentGroupIndex !== undefined
    ? `Group ${savedRound.currentGroupIndex + 1}, `
    : "";
  elements.resumeHoleStatus.textContent = `${groupText}Current Hole: ${savedRound.currentHole} of 18`;
  setActiveScreen("resume");
}

function resumeSavedRound() {
  const savedRound = roundStorage.getUnfinished();

  if (!savedRound) {
    setActiveScreen("setup");
    return;
  }

  loadSavedRoundIntoState(savedRound);

  setActiveScreen("round");
  renderApp();
  scrollToScoring();
}

async function initializeApp() {
  await loadRosterFromCloud();
  renderSetupView(elements, courses, members);

  const localRound = roundStorage.getUnfinished();
  let activeRound = localRound;

  if (!activeRound) {
    const cloudResult = await roundCloudService.loadActiveRound();
    activeRound = cloudResult.round;

    if (activeRound) {
      roundStorage.saveUnfinished(activeRound);
    }
  }

  if (activeRound) {
    loadSavedRoundIntoState(activeRound);
    showTodayRoundScreen();
    return;
  }

  showTodayRoundScreen();
}

initializeApp();

elements.menuToggle.addEventListener("click", toggleMenu);
elements.toggleCommissionerMode.addEventListener("click", () => {
  const changed = commissionerMode
    ? (setCommissionerMode(false), true)
    : turnOnCommissionerFromMenu();

  if (!changed) return;

  closeMenu();

  if (commissionerMode && !roundState) {
    setActiveScreen("setup");
    return;
  }

  if (commissionerMode && roundState) {
    setActiveScreen("round");
    renderApp();
    scrollToScoring();
  }
});
elements.appMenu.addEventListener("click", (event) => {
  const menuButton = event.target.closest("[data-menu-action]");

  if (!menuButton) return;

  handleMenuAction(menuButton.dataset.menuAction);
});
elements.startRound.addEventListener("click", continueToGroups);
elements.backToRoundSetup.addEventListener("click", backToRoundSetup);
elements.addGroup.addEventListener("click", () => updateGroupCount(1));
elements.removeGroup.addEventListener("click", () => updateGroupCount(-1));
elements.groupSetupList.addEventListener("change", refreshScorekeeperChoices);
elements.beginGroupedRound.addEventListener("click", reviewEventSummary);
elements.backToGroupSetup.addEventListener("click", backToGroupSetup);
elements.confirmStartRound.addEventListener("click", beginGroupedRound);
elements.resumeRound.addEventListener("click", resumeSavedRound);
elements.startFreshRound.addEventListener("click", () => startFreshRound({ clearSavedRound: true }));
elements.discardSavedRound.addEventListener("click", discardSavedRound);
elements.viewLiveMatch.addEventListener("click", viewLiveMatch);
elements.choosePlayerScoring.addEventListener("click", choosePlayerOrScorer);
elements.todayCommissionerMode.addEventListener("click", openCommissionerFromToday);
elements.scorerList.addEventListener("click", (event) => {
  const scorerButton = event.target.closest("[data-scorer-id]");

  if (!scorerButton) return;

  enterScorer(scorerButton.dataset.scorerId);
});
elements.holePlayers.addEventListener("click", (event) => {
  if (!roundState) return;
  if (!canEditCurrentGroup()) return;

  const button = event.target.closest("button[data-player-id]");

  if (!button) return;

  const amount = button.dataset.action === "increase" ? 1 : -1;
  roundState.changeDraftScore(button.dataset.playerId, amount);
  renderCurrentHole();
});

elements.previousHole.addEventListener("click", () => {
  if (!roundState) return;
  if (!canEditCurrentGroup()) return;

  const sequence = getGroupHoleSequence(currentGroupIndex);
  const currentHoleNumber = roundState.currentHoleIndex + 1;
  const currentSequenceIndex = sequence.indexOf(currentHoleNumber);
  const previousSequenceIndex = currentSequenceIndex > 0
    ? currentSequenceIndex - 1
    : Math.max(0, sequence.length - 1);
  setCurrentHoleForGroup(currentGroupIndex, sequence[previousSequenceIndex] || currentHoleNumber);
  syncRoundStateToCurrentGroup();
  renderCurrentHole();
});

elements.nextHole.addEventListener("click", () => {
  if (!roundState) return;
  if (!canEditCurrentGroup()) return;

  goToHoleForCurrentGroup((groupHoleIndexes[currentGroupIndex] ?? 0) + 1);
});

elements.previousGroup.addEventListener("click", () => {
  goToGroup(currentGroupIndex - 1);
});

elements.nextGroup.addEventListener("click", () => {
  goToGroup(currentGroupIndex + 1);
});

elements.groupSwitcher.addEventListener("change", () => {
  if (!commissionerMode) return;
  goToGroup(Number(elements.groupSwitcher.value));
});

elements.holeSelector.addEventListener("change", () => {
  if (!roundState) return;
  if (!canEditCurrentGroup()) return;

  setCurrentHoleForGroup(currentGroupIndex, Number(elements.holeSelector.value));
  syncRoundStateToCurrentGroup();
  renderCurrentHole();
});

elements.saveHole.addEventListener("click", async () => {
  if (!roundState) return;
  if (!canEditCurrentGroup()) return;

  syncRoundStateToCurrentGroup();
  const groupPlayers = getCurrentGroupPlayers();
  const hasInvalidScore = groupPlayers.some((player) => {
    const score = roundState.draftScores[player.id];
    return !Number.isFinite(Number(score)) || Number(score) < 1;
  });

  if (hasInvalidScore) {
    elements.saveStatusMessage.textContent = "Enter a gross score for every player in this group.";
    return;
  }

  const savedHoleIndex = roundState.currentHoleIndex;
  const savedHoleNumber = savedHoleIndex + 1;
  const savedGroupIndex = currentGroupIndex;

  try {
    roundState.saveCurrentHole(groupPlayers);
  } catch (error) {
    elements.saveStatusMessage.textContent = "Save failed. Scores were not advanced.";
    return;
  }

  markGroupHoleComplete(savedGroupIndex, savedHoleNumber);
  const nextHoleNumber = getNextUncompletedHole(savedGroupIndex);

  if (nextHoleNumber === null) {
    getGroupRecord(savedGroupIndex).status = "completed";
    groupHoleIndexes[savedGroupIndex] = savedHoleIndex;
  } else {
    setCurrentHoleForGroup(savedGroupIndex, nextHoleNumber);
  }

  currentGroupIndex = savedGroupIndex;

  syncRoundStateToCurrentGroup();
  let mergedRound = null;
  try {
    mergedRound = await autoSaveUnfinishedRound(savedGroupIndex, savedHoleIndex);
  } catch (error) {
    const localSave = roundState.getAutoSaveExport();
    localSave.groupHoleIndexes = groupHoleIndexes;
    localSave.currentGroupIndex = currentGroupIndex;
    localSave.currentHoleIndex = Math.min(
      groupHoleIndexes[currentGroupIndex] ?? roundState.currentHoleIndex,
      roundState.totalHoles - 1
    );
    localSave.currentHole = localSave.currentHoleIndex + 1;
    roundStorage.saveUnfinished(localSave);
    elements.saveStatusMessage.textContent = "Saved on this device. Cloud backup did not finish.";
  }

  if (mergedRound) {
    loadSavedRoundIntoState(mergedRound);
  }
  renderApp();
  if (mergedRound) {
    showSaveStatus(savedHoleIndex, savedGroupIndex);
  }
  scrollToScoring();
});

elements.resetScores.addEventListener("click", async () => {
  if (!commissionerMode) {
    renderScorerSelection();
    elements.scorerAccessStatus.textContent = "Only the commissioner can cancel the active event.";
    return;
  }

  const resetResult = await clearRoundCacheForReset();
  startFreshRound();
  elements.modeStatus.textContent = resetResult.ok
    ? "Commissioner View: reset complete. In-progress round cache cleared."
    : "Commissioner View: local cache cleared. Cloud active round could not be cleared.";
  scrollToTop();
});

elements.reviewScorecard.addEventListener("click", reviewScorecard);
elements.undoLastHole.addEventListener("click", undoLastHole);
elements.summaryUndoLastHole.addEventListener("click", undoLastHole);
elements.startNewRound.addEventListener("click", startNewRound);
elements.saveRound.addEventListener("click", saveRound);
elements.saveRoundCloud.addEventListener("click", saveRoundToCloud);
elements.showPreviousRounds.addEventListener("click", showPreviousRounds);
elements.refreshCloudRounds.addEventListener("click", loadPreviousRoundsFromCloud);
elements.backFromPreviousRounds.addEventListener("click", returnFromPreviousRounds);
elements.showPlayerManagement.addEventListener("click", showPlayerManagement);
elements.changeScorer.addEventListener("click", () => {
  scorerStorage.clearScorerId();
  scorerStorage.setCommissionerMode(false);
  currentScorerId = null;
  commissionerMode = false;
  renderScorerSelection();
});
elements.scoreMyGroup.addEventListener("click", showScoreMyGroup);
elements.viewOverallLeaderboard.addEventListener("click", showLeaderboardPage);
elements.changeScorerLeaderboard.addEventListener("click", showLeaderboardPage);
elements.completedViewLeaderboard.addEventListener("click", showLeaderboardPage);
elements.reviewGroupScores.addEventListener("click", renderGroupScoreReview);
elements.activeRoundManagement.addEventListener("click", showActiveRoundManagement);
elements.playerForm.addEventListener("submit", savePlayer);
elements.handicapVerifyPlayer.addEventListener("change", renderHandicapVerificationResult);
elements.handicapVerifyCourse.addEventListener("change", renderHandicapVerification);
elements.handicapVerifyTee.addEventListener("change", renderHandicapVerificationResult);
elements.clearPlayerForm.addEventListener("click", () => {
  clearPlayerForm(elements);
  renderPlayerManagement(elements, members, maxRosterSize);
});
elements.loadRosterCloud.addEventListener("click", () => loadRosterFromCloud({ manual: true }));
elements.exportRosterBackup.addEventListener("click", exportRosterBackup);
elements.saveRosterCloud.addEventListener("click", saveRosterToCloud);
elements.backFromPlayerManagement.addEventListener("click", returnFromPlayerManagement);
elements.playerManagementList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-player]");

  if (!editButton) return;

  const player = members.find((member) => member.id === editButton.dataset.editPlayer);

  if (!player) return;

  fillPlayerForm(elements, player);
  renderPlayerManagement(elements, members, maxRosterSize);
  elements.playerManagementStatus.textContent = `Editing ${player.name}.`;
  elements.playerForm.scrollIntoView({ behavior: "auto", block: "start" });
});
