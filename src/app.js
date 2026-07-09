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
  elements.resumeScreen.classList.toggle("is-hidden", screenName !== "resume");
  elements.scorerScreen.classList.toggle("is-hidden", screenName !== "scorer");
  elements.setupScreen.classList.toggle("is-hidden", screenName !== "setup");
  elements.groupSetupScreen.classList.toggle("is-hidden", screenName !== "groups");
  elements.eventSummaryScreen.classList.toggle("is-hidden", screenName !== "eventSummary");
  elements.roundScreen.classList.toggle("is-hidden", screenName !== "round");
  elements.summaryScreen.classList.toggle("is-hidden", screenName !== "summary");
  elements.previousRoundsScreen.classList.toggle("is-hidden", screenName !== "previous");
  elements.playerManagementScreen.classList.toggle("is-hidden", screenName !== "players");
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function renderHoleStatus() {
  if (!roundState) return;

  const visibleGroups = commissionerMode
    ? roundSettings.groups.map((group, index) => ({ group, index }))
    : roundSettings.groups
        .map((group, index) => ({ group, index }))
        .filter((item) => roundSettings.groupScorers?.[item.index] === currentScorerId);

  elements.currentHoleStatus.textContent =
    `Current Hole: ${roundState.currentHoleIndex + 1} of ${roundState.totalHoles}`;
  elements.currentGroupStatus.textContent =
    `Group ${currentGroupIndex + 1} of ${roundSettings.groups.length}`;
  elements.groupSwitcher.innerHTML = visibleGroups
    .map(({ group, index }) => {
      const groupHole = groupHoleIndexes[index] ?? 0;
      const completeText = isGroupComplete(index) ? "complete" : `Hole ${groupHole + 1}`;
      return `<option value="${index}"${index === currentGroupIndex ? " selected" : ""}>Group ${index + 1} - ${completeText} - ${group.length} players</option>`;
    })
    .join("");
  elements.previousGroup.disabled = !commissionerMode || currentGroupIndex === 0;
  elements.nextGroup.disabled = !commissionerMode || currentGroupIndex === roundSettings.groups.length - 1;
  elements.groupSwitcher.disabled = !commissionerMode;
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

  return startingIndex;
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
  scrollToTop();
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
  const activePlayers = members.filter((member) => member.active);
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
    scrollToTop();
    return;
  }

  renderScorerSelection();
  elements.scorerAccessStatus.textContent = "Scorers wait here. Commissioner View creates the active event.";
}

function enterCommissioner() {
  if (elements.commissionerPin.value !== scorerStorage.commissionerPin) {
    elements.scorerAccessStatus.textContent = "Wrong PIN.";
    return;
  }

  commissionerMode = true;
  scorerStorage.setCommissionerMode(true);
  elements.commissionerPin.value = "";

  if (roundState) {
    setActiveScreen("round");
    renderApp();
    scrollToTop();
    return;
  }

  if (commissionerMode) {
    setActiveScreen("setup");
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
  autoSaveData.currentHoleIndex = groupHoleIndexes[currentGroupIndex] ?? roundState.currentHoleIndex;
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
  saveCompletedRound();
  setActiveScreen("summary");
  renderFinalSummary(elements, roundState);
  scrollToTop();
}

function reviewScorecard() {
  setActiveScreen("round");
  renderApp();
}

function startFreshRound() {
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

function discardSavedRound() {
  roundStorage.clearUnfinished();
  startFreshRound();
}

function saveRound() {
  saveCompletedRound();
}

async function saveRoundToCloud() {
  if (!roundState || !roundState.isRoundComplete()) {
    elements.cloudSaveStatus.textContent = "Finish the round before saving to cloud.";
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

  const lastSavedHoleIndex = roundState.getLastSavedHoleIndex();

  if (lastSavedHoleIndex < 0) {
    elements.saveStatusMessage.textContent = "No saved holes to undo.";
    return;
  }

  if (completedRoundSaved) {
    roundStorage.remove(roundState.id);
    completedRoundSaved = false;
  }

  window.clearTimeout(statusTimer);
  elements.saveStatusMessage.textContent = "";
  setActiveScreen("round");
  groupHoleIndexes = groupHoleIndexes.map((holeIndex) => Math.min(holeIndex, lastSavedHoleIndex));
  syncRoundStateToCurrentGroup();
  renderApp();
  autoSaveUnfinishedRound();
  scrollToTop();
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
    groups: readGroupAssignments(elements, pendingRoundSettings.players)
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

function beginGroupedRound() {
  if (!roundSettings) return;

  selectedCourse = roundSettings.course;
  selectedPlayers = roundSettings.players;
  roundState = createRoundState(selectedCourse, selectedPlayers, roundSettings);
  currentGroupIndex = 0;
  groupHoleIndexes = roundSettings.groups.map(() => 0);
  completedRoundSaved = false;
  roundStorage.clearUnfinished();

  setActiveScreen("round");
  renderApp();
  autoSaveUnfinishedRound();
  scrollToTop();
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
  scrollToTop();
}

renderSetupView(elements, courses, members);

async function initializeApp() {
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

    if (currentScorerId || commissionerMode) {
      setActiveScreen("round");
      renderApp();
      scrollToTop();
      return;
    }

    renderScorerSelection();
    return;
  }

  if (currentScorerId && !commissionerMode) {
    renderScorerSelection();
    elements.scorerAccessStatus.textContent = "No active event found yet. Ask the commissioner to create one.";
    return;
  }

  setActiveScreen("setup");
}

initializeApp();

elements.startRound.addEventListener("click", continueToGroups);
elements.backToRoundSetup.addEventListener("click", backToRoundSetup);
elements.beginGroupedRound.addEventListener("click", reviewEventSummary);
elements.backToGroupSetup.addEventListener("click", backToGroupSetup);
elements.confirmStartRound.addEventListener("click", beginGroupedRound);
elements.resumeRound.addEventListener("click", resumeSavedRound);
elements.startFreshRound.addEventListener("click", startFreshRound);
elements.discardSavedRound.addEventListener("click", discardSavedRound);
elements.scorerList.addEventListener("click", (event) => {
  const scorerButton = event.target.closest("[data-scorer-id]");

  if (!scorerButton) return;

  enterScorer(scorerButton.dataset.scorerId);
});
elements.enterCommissionerMode.addEventListener("click", enterCommissioner);

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
  const savedHoleIndex = groupHoleIndexes[currentGroupIndex] ?? roundState.currentHoleIndex;
  const savedGroupIndex = currentGroupIndex;
  const isLastHole = savedHoleIndex === roundState.totalHoles - 1;
  roundState.saveCurrentHole(getCurrentGroupPlayers());

  if (roundState.isRoundComplete()) {
    showFinalSummary();
    return;
  }

  if (isLastHole) {
    currentGroupIndex = getNextOpenGroupIndex(savedGroupIndex);
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
  scrollToTop();
});

elements.resetScores.addEventListener("click", () => {
  if (!commissionerMode) {
    renderScorerSelection();
    elements.scorerAccessStatus.textContent = "Only the commissioner can cancel the active event.";
    return;
  }

  roundStorage.clearUnfinished();
  startFreshRound();
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
elements.commissionerView.addEventListener("click", renderScorerSelection);
elements.viewOverallLeaderboard.addEventListener("click", () => {
  elements.leaderboard.scrollIntoView({ behavior: "auto", block: "start" });
});
elements.playerForm.addEventListener("submit", savePlayer);
elements.clearPlayerForm.addEventListener("click", () => {
  clearPlayerForm(elements);
  renderPlayerManagement(elements, members, maxRosterSize);
});
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
