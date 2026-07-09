const { courses, players: defaultPlayers, maxRosterSize } = window.OGSGolf.data;
const { createRoundState, playerStorage, roundStorage } = window.OGSGolf.state;
const { roundCloudService } = window.OGSGolf.cloud;
const {
  clearPlayerForm,
  fillPlayerForm,
  getElements,
  readSetupSettings,
  readPlayerForm,
  renderFinalSummary,
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
let roundState = null;
let statusTimer = null;
let completedRoundSaved = false;
let currentGroupIndex = 0;

function setActiveScreen(screenName) {
  elements.resumeScreen.classList.toggle("is-hidden", screenName !== "resume");
  elements.setupScreen.classList.toggle("is-hidden", screenName !== "setup");
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

  elements.currentHoleStatus.textContent =
    `Current Hole: ${roundState.currentHoleIndex + 1} of ${roundState.totalHoles}`;
}

function renderCurrentHole() {
  renderHoleView(elements, selectedCourse, getCurrentGroupPlayers(), roundState);
  renderHoleStatus();
}

function getCurrentGroupPlayers() {
  const groupIds = roundSettings?.groups?.[currentGroupIndex] || selectedPlayers.slice(0, 4).map((player) => player.id);
  return selectedPlayers.filter((player) => groupIds.includes(player.id));
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

function showSaveStatus(savedHoleIndex) {
  window.clearTimeout(statusTimer);
  elements.saveStatusMessage.innerHTML = `&#10003; Hole ${savedHoleIndex + 1} Saved`;

  statusTimer = window.setTimeout(() => {
    elements.saveStatusMessage.textContent = "";
  }, 2000);
}

function autoSaveUnfinishedRound() {
  if (!roundState || completedRoundSaved) return;

  roundStorage.saveUnfinished(roundState.getAutoSaveExport());
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
  roundState = null;
  selectedCourse = courses[0];
  selectedPlayers = [];
  currentGroupIndex = 0;
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
  roundState.goToHole(lastSavedHoleIndex);
  renderApp();
  autoSaveUnfinishedRound();
  scrollToTop();
}

function startRound() {
  roundSettings = readSetupSettings(elements, courses, members);

  if (roundSettings.players.length === 0) return;

  selectedCourse = roundSettings.course;
  selectedPlayers = roundSettings.players;
  roundState = createRoundState(selectedCourse, selectedPlayers, roundSettings);
  currentGroupIndex = 0;
  completedRoundSaved = false;
  roundStorage.clearUnfinished();

  setActiveScreen("round");
  renderApp();
  scrollToTop();
}

function showResumePrompt(savedRound) {
  elements.resumeCourseName.textContent = savedRound.course.name;
  elements.resumeHoleStatus.textContent = `Current Hole: ${savedRound.currentHole} of 18`;
  setActiveScreen("resume");
}

function resumeSavedRound() {
  const savedRound = roundStorage.getUnfinished();

  if (!savedRound) {
    setActiveScreen("setup");
    return;
  }

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
  currentGroupIndex = 0;
  completedRoundSaved = false;

  setActiveScreen("round");
  renderApp();
  scrollToTop();
}

renderSetupView(elements, courses, members);

const unfinishedRound = roundStorage.getUnfinished();

if (unfinishedRound) {
  showResumePrompt(unfinishedRound);
} else {
  setActiveScreen("setup");
}

elements.startRound.addEventListener("click", startRound);
elements.resumeRound.addEventListener("click", resumeSavedRound);
elements.startFreshRound.addEventListener("click", startFreshRound);
elements.discardSavedRound.addEventListener("click", discardSavedRound);

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

  roundState.goToHole(roundState.currentHoleIndex - 1);
  renderCurrentHole();
});

elements.nextHole.addEventListener("click", () => {
  if (!roundState) return;

  roundState.goToHole(roundState.currentHoleIndex + 1);
  renderCurrentHole();
});

elements.saveHole.addEventListener("click", () => {
  if (!roundState) return;

  const savedHoleIndex = roundState.currentHoleIndex;
  const isLastHole = savedHoleIndex === roundState.totalHoles - 1;
  roundState.saveCurrentHole(getCurrentGroupPlayers());

  if (isLastHole && roundState.isRoundComplete()) {
    showFinalSummary();
    return;
  }

  roundState.goToHole(savedHoleIndex + 1);
  renderApp();
  autoSaveUnfinishedRound();
  showSaveStatus(savedHoleIndex);
  scrollToTop();
});

elements.resetScores.addEventListener("click", () => {
  if (!roundState) return;

  roundState.resetScores();
  roundStorage.clearUnfinished();
  renderApp();
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
