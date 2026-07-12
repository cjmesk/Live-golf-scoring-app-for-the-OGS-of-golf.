window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderLeaderboard = function renderLeaderboard(elements, players, roundState) {
  const pointsEnabled = roundState.roundSettings.games.pointsGame.enabled;
  const totalHoles = roundState.totalHoles || 18;

  function isSavedScore(score) {
    const numericScore = Number(score);
    return score !== null
      && score !== undefined
      && score !== ""
      && Number.isFinite(numericScore)
      && numericScore > 0;
  }

  function getScoreToPar(player) {
    const savedScores = roundState.savedScores[player.id] || [];
    const savedHoles = savedScores
      .map((score, index) => ({ score, index }))
      .filter((item) => isSavedScore(item.score));
    const actualStrokes = savedHoles.reduce((total, item) => total + Number(item.score), 0);
    const parForSavedHoles = savedHoles.reduce(
      (total, item) => total + Number(roundState.getHoleForPlayer(player, item.index).par),
      0
    );
    const toPar = actualStrokes - parForSavedHoles;

    return {
      actualStrokes,
      holesCompleted: savedHoles.length,
      display: savedHoles.length === 0
        ? "-"
        : toPar === 0
          ? "Even"
          : `${toPar > 0 ? "+" : ""}${toPar} to par`
    };
  }

  const standings = players
    .map((player) => ({
      player,
      totals: roundState.getPlayerTotals(player),
      pointsResult: roundState.getPointsDifferential(player, "overall")
    }))
    .sort((a, b) => {
      if (pointsEnabled && roundState.isInPoints(a.player) !== roundState.isInPoints(b.player)) {
        return roundState.isInPoints(a.player) ? -1 : 1;
      }

      if (pointsEnabled && b.pointsResult.differential !== a.pointsResult.differential) {
        return b.pointsResult.differential - a.pointsResult.differential;
      }

      if (pointsEnabled && b.totals.points !== a.totals.points) {
        return b.totals.points - a.totals.points;
      }

      return a.totals.gross - b.totals.gross;
    });

  elements.leaderboard.innerHTML = "";

  standings.forEach((standing, index) => {
    const { player, totals } = standing;
    const isDnf = roundState.isPlayerDnf(player);
    const dnfText = roundState.formatDnfStatus(player);
    const frontPointsResult = roundState.getPointsDifferential(player, "front");
    const backPointsResult = roundState.getPointsDifferential(player, "back");
    const overallPointsResult = standing.pointsResult;
    const scoreToPar = getScoreToPar(player);
    const gameStatus = [
      roundState.isInSkins(player) ? "Skins" : "Not in Skins",
      roundState.isInPoints(player) ? "Points" : "Not in Points",
      player.inTeamChallenge === true ? "Team Event" : "Not in Team Event"
    ].join(" | ");
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.innerHTML = `
      <div class="rank">${index + 1}</div>
      <div>
        <div class="player-name">${player.name}</div>
        <div class="player-details">Index ${player.handicap} | Course Handicap ${roundState.courseHandicaps[player.id]} | ${player.tee} tees</div>
        <div class="player-details">${isDnf ? dnfText : `${totals.holesPlayed}/${totalHoles} holes saved`}</div>
        <div class="player-details">${gameStatus}</div>
      </div>
      <div class="leaderboard-totals">
        ${isDnf ? `<span class="points">DNF</span>` : ""}
        ${!isDnf && pointsEnabled && roundState.isInPoints(player) ? `<span class="points">${overallPointsResult.display}</span>` : ""}
        ${!isDnf && pointsEnabled && !roundState.isInPoints(player) ? `<span class="gross">Not in Points</span>` : ""}
        ${!isDnf && pointsEnabled && roundState.isInPoints(player) ? `<span class="gross">Quota ${frontPointsResult.quota} per side / ${overallPointsResult.target} overall</span>` : ""}
        ${!isDnf && pointsEnabled && roundState.isInPoints(player) ? `<span class="gross">${totals.points} pts earned</span>` : ""}
        ${!isDnf && pointsEnabled && roundState.isInPoints(player) ? `<span class="gross">Front ${frontPointsResult.display} | Back ${backPointsResult.display}</span>` : ""}
        <span class="gross">Strokes ${scoreToPar.holesCompleted === 0 ? "-" : scoreToPar.actualStrokes}</span>
        <span class="gross">${scoreToPar.holesCompleted}/${totalHoles} holes</span>
        <span class="gross">${scoreToPar.display}</span>
      </div>
    `;
    elements.leaderboard.appendChild(row);
  });
};
