const { courses, players: defaultPlayers, maxRosterSize } = window.OGSGolf.data;
const { createRoundState, playerStorage, roundStorage, scorerStorage } = window.OGSGolf.state;
const { roundCloudService } = window.OGSGolf.cloud;
const {
  clearPlayerForm,
  fillPlayerForm,
  getElements,
  readSetupSettings,
  readGroupAssignments,
  readGroupScorers,
  readPlayerForm,
  renderFinalSummary,
  renderEventSummary,
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
  elements.courseManagementScreen.classList.toggle("is-hidden", screenName !== "courses");
  elements.betSettingsScreen.classList.toggle("is-hidden", screenName !== "bets");
  elements.helpScreen.classList.toggle("is-hidden", screenName !== "help");
  elements.aboutScreen.classList.toggle("is-hidden", screenName !== "about");
  document.body.classList.toggle("is-scoring", isScoringScreen);
  elements.modeStatus.classList.toggle("is-hidden", isScoringScreen);
  elements.rosterCloudStatus.classList.toggle("is-hidden", isScoringScreen);
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
  const startTime = roundSettings?.startTime || roundSettings?.teeTime || "Not set";

  elements.todayDate.textContent = formatTodayDate();
  elements.todayCourseName.textContent = eventCourseName;
  elements.todayEventStatus.textContent = roundSettings?.eventStatus || "Open";
  elements.todayPlayerCount.textContent = String(playerCount);
  elements.todayStartTime.textContent = startTime;
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
  scrollToScoring();
}

function showLeaderboard() {
  showLiveScoring();

  if (roundState) {
    elements.leaderboard.scrollIntoView({ behavior: "auto", block: "start" });
  }
}

function showSimpleScreen(screenName) {
  setActiveScreen(screenName);
  scrollToTop();
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
  elements.rosterCloudStatus.classList.remove("is-hidden");
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
    : roundSettings.groups
        .map((group, index) => ({ group, index }))
        .filter((item) => roundSettings.groupScorers?.[item.index] === currentScorerId);

  elements.currentHoleStatus.textContent =
    isGroupComplete(currentGroupIndex)
      ? `Group ${currentGroupIndex + 1} complete`
      : `Current Hole: ${roundState.currentHoleIndex + 1} of ${roundState.totalHoles}`;
  elements.currentGroupStatus.textContent =
    `Group ${currentGroupIndex + 1} of ${roundSettings.groups.length}`;
  elements.groupSwitcher.innerHTML = visibleGroups
    .map(({ group, index }) => {
      const groupHole = groupHoleIndexes[index] ?? 0;
      const completeText = isGroupComplete(index) ? "complete" : `Hole ${Math.min(groupHole + 1, roundState.totalHoles)}`;
      return `<option value="${index}"${index === currentGroupIndex ? " selected" : ""}>Group ${index + 1} - ${completeText} - ${group.length} players</option>`;
    })
    .join("");
  elements.previousGroup.disabled = !commissionerMode || currentGroupIndex === 0;
  elements.nextGroup.disabled = !commissionerMode || currentGroupIndex === roundSettings.groups.length - 1;
  elements.groupSwitcher.disabled = !commissionerMode;
  elements.saveHole.disabled = isGroupComplete(currentGroupIndex) && !commissionerMode;
  elements.nextHole.disabled = isGroupComplete(currentGroupIndex) && !commissionerMode;
}

function renderCurrentHole() {
  renderHoleView(elements, selectedCourse, getCurrentGroupPlayers(), roundState);
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

function isGroupComplete(groupIndex) {
  if (!roundState || !roundSettings?.groups?.[groupIndex]) return false;

  return getGroupPlayers(groupIndex).every((player) =>
    roundState.savedScores[player.id].every((score) => score !== null)
  );
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

  const groupHoleIndex = groupHoleIndexes[currentGroupIndex] ?? 0;
  roundState.goToHole(groupHoleIndex);
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

  groupHoleIndexes[currentGroupIndex] = Math.max(0, Math.min(roundState.totalHoles - 1, nextHoleIndex));
  syncRoundStateToCurrentGroup();
  renderCurrentHole();
}

function renderApp() {
  renderRoundSettingsSummary(elements, roundSettings);
  renderCurrentHole();
  renderLeaderboard(elements, selectedPlayers, roundState);

  if (roundSettings.games.pointsGame.enabled) {
    elements.pointsPayout.closest(".points-payout-section").classList.remove("is-hidden");
    renderPointsPayout(elements, roundState);
  } else {
    elements.pointsPayout.closest(".points-payout-section").classList.add("is-hidden");
  }

  if (roundSettings.games.netSkins.enabled) {
    elements.skinsSummary.closest(".skins-section").classList.remove("is-hidden");
    renderSkinsSummary(elements, selectedPlayers, roundState);
  } else {
    elements.skinsSummary.closest(".skins-section").classList.add("is-hidden");
  }
}

function getAssignedGroupIndex(playerId) {
  if (!roundSettings?.groupScorers) return 0;
  const groupIndex = roundSettings.groupScorers.findIndex((scorerId) => scorerId === playerId);
  return groupIndex >= 0 ? groupIndex : 0;
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
  if (roundState) {
    if (commissionerMode) {
      setActiveScreen("round");
      renderApp();
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

function enterScorer(playerId) {
  currentScorerId = playerId;
  commissionerMode = false;
  scorerStorage.saveScorerId(playerId);
  scorerStorage.setCommissionerMode(false);

  if (roundState) {
    if (roundSettings.groupScorers && !roundSettings.groupScorers.includes(playerId)) {
      scorerStorage.clearScorerId();
      currentScorerId = null;
      renderScorerSelection();
      elements.scorerAccessStatus.textContent = "You are not assigned as a scorer for this event.";
      return;
    }

    currentGroupIndex = getAssignedGroupIndex(playerId);
    syncRoundStateToCurrentGroup();
    setActiveScreen("round");
    renderApp();
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

function savePlayer(event) {
  event.preventDefault();

  const formPlayer = readPlayerForm(elements);

  if (!formPlayer) {
    elements.playerManagementStatus.textContent = "Enter a name and handicap before saving.";
    return;
  }

  const editingId = elements.editingPlayerId.value;

  if (!editingId && members.length >= maxRosterSize) {
    elements.playerManagementStatus.textContent = "The roster already has 50 members.";
    return;
  }

  if (editingId) {
    members = members.map((player) => (player.id === editingId ? formPlayer : player));
  } else {
    members = [...members, { ...formPlayer, id: getUniquePlayerId(formPlayer.id) }];
  }

  playerStorage.saveAll(members);
  clearPlayerForm(elements);
  renderPlayerManagement(elements, members, maxRosterSize);
  elements.playerManagementStatus.textContent = "Player saved on this device.";
}

async function saveRosterToCloud() {
  playerStorage.saveAll(members);
  elements.playerManagementStatus.textContent = "Saving roster to Supabase...";

  const result = await roundCloudService.savePlayers(members);
  elements.playerManagementStatus.textContent = result.message;
}

function undoLastHole() {
  if (!roundState) return;

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

  if (pendingRoundSettings.players.length === 0) return;

  renderGroupSetupView(elements, pendingRoundSettings);
  setActiveScreen("groups");
  scrollToTop();
}

function backToRoundSetup() {
  setActiveScreen("setup");
  scrollToTop();
}

function reviewEventSummary() {
  if (!pendingRoundSettings) return;

  roundSettings = {
    ...pendingRoundSettings,
    groups: readGroupAssignments(elements, pendingRoundSettings.players),
    eventStatus: "Pre-Round Review",
    setupLocked: false,
    preRoundReviewComplete: false
  };
  roundSettings.groupScorers = readGroupScorers(elements, roundSettings.groups);
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
    eventStatus: "Started",
    setupLocked: true,
    preRoundReviewComplete: true,
    startedAt: new Date().toISOString()
  };
  selectedCourse = roundSettings.course;
  selectedPlayers = roundSettings.players;
  roundState = createRoundState(selectedCourse, selectedPlayers, roundSettings);
  currentGroupIndex = 0;
  groupHoleIndexes = roundSettings.groups.map(() => 0);
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
  groupHoleIndexes = savedRound.groupHoleIndexes || roundSettings.groups.map(() => savedRound.currentHoleIndex || 0);

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

    if (roundSettings?.eventStatus === "Started" || roundSettings?.setupLocked) {
      if (commissionerMode || currentScorerId) {
        if (!commissionerMode && roundSettings.groupScorers && !roundSettings.groupScorers.includes(currentScorerId)) {
          scorerStorage.clearScorerId();
          currentScorerId = null;
          renderScorerSelection();
          elements.scorerAccessStatus.textContent = "Choose the scorer assigned to this event.";
          return;
        }

        if (!commissionerMode) {
          currentGroupIndex = getAssignedGroupIndex(currentScorerId);
          syncRoundStateToCurrentGroup();
        }

        setActiveScreen("round");
        renderApp();
        scrollToScoring();
        return;
      }

      renderScorerSelection();
      return;
    }

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
elements.beginGroupedRound.addEventListener("click", reviewEventSummary);
elements.backToGroupSetup.addEventListener("click", backToGroupSetup);
elements.confirmStartRound.addEventListener("click", beginGroupedRound);
elements.resumeRound.addEventListener("click", resumeSavedRound);
elements.startFreshRound.addEventListener("click", () => startFreshRound({ clearSavedRound: true }));
elements.discardSavedRound.addEventListener("click", discardSavedRound);
elements.continueToRound.addEventListener("click", continueFromTodayRound);
elements.scorerList.addEventListener("click", (event) => {
  const scorerButton = event.target.closest("[data-scorer-id]");

  if (!scorerButton) return;

  enterScorer(scorerButton.dataset.scorerId);
});
elements.holePlayers.addEventListener("click", (event) => {
  if (!roundState) return;

  const button = event.target.closest("button[data-player-id]");

  if (!button) return;

  const amount = button.dataset.action === "increase" ? 1 : -1;
  roundState.changeDraftScore(button.dataset.playerId, amount);
  renderCurrentHole();
});

elements.previousHole.addEventListener("click", () => {
  if (!roundState) return;

  goToHoleForCurrentGroup((groupHoleIndexes[currentGroupIndex] ?? 0) - 1);
});

elements.nextHole.addEventListener("click", () => {
  if (!roundState) return;

  goToHoleForCurrentGroup((groupHoleIndexes[currentGroupIndex] ?? 0) + 1);
});

elements.previousGroup.addEventListener("click", () => {
  goToGroup(currentGroupIndex - 1);
});

elements.nextGroup.addEventListener("click", () => {
  goToGroup(currentGroupIndex + 1);
});

elements.groupSwitcher.addEventListener("change", () => {
  goToGroup(Number(elements.groupSwitcher.value));
});

elements.saveHole.addEventListener("click", async () => {
  if (!roundState) return;

  syncRoundStateToCurrentGroup();
  const savedHoleIndex = Math.min(
    groupHoleIndexes[currentGroupIndex] ?? roundState.currentHoleIndex,
    roundState.totalHoles - 1
  );
  const savedGroupIndex = currentGroupIndex;
  const isLastHole = savedHoleIndex === roundState.totalHoles - 1;
  roundState.saveCurrentHole(getCurrentGroupPlayers());

  if (isLastHole) {
    groupHoleIndexes[savedGroupIndex] = roundState.totalHoles;
  }

  if (roundState.isRoundComplete() || areAllGroupsComplete()) {
    showFinalSummary();
    return;
  }

  if (isLastHole) {
    const nextOpenGroupIndex = commissionerMode ? getNextOpenGroupIndex(savedGroupIndex) : null;

    if (nextOpenGroupIndex !== null) {
      currentGroupIndex = nextOpenGroupIndex;
    }
  } else {
    groupHoleIndexes[savedGroupIndex] = savedHoleIndex + 1;
  }

  syncRoundStateToCurrentGroup();
  const mergedRound = await autoSaveUnfinishedRound(savedGroupIndex, savedHoleIndex);
  if (mergedRound) {
    loadSavedRoundIntoState(mergedRound);
  }
  renderApp();
  showSaveStatus(savedHoleIndex, savedGroupIndex);
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
elements.viewOverallLeaderboard.addEventListener("click", () => {
  elements.leaderboard.scrollIntoView({ behavior: "auto", block: "start" });
});
elements.playerForm.addEventListener("submit", savePlayer);
elements.clearPlayerForm.addEventListener("click", () => {
  clearPlayerForm(elements);
  renderPlayerManagement(elements, members, maxRosterSize);
});
elements.loadRosterCloud.addEventListener("click", () => loadRosterFromCloud({ manual: true }));
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
