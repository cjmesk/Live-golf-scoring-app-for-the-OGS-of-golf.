window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.state = window.OGSGolf.state || {};

window.OGSGolf.state.createRoundState = function createRoundState(
  course,
  players,
  roundSettings,
  savedRound
) {
  const {
    getCourseHandicap,
    getNetScore,
    getPoints,
    getSkinWinner,
    getStrokesOnHole
  } = window.OGSGolf.rules;
  const totalHoles = course.tees.white.length;
  const savedScores = {};
  const courseHandicaps = {};
  const draftScores = {};
  const roundId = savedRound?.id || `round-${new Date().toISOString()}`;
  let savedHoleResults = savedRound?.savedHoleResults || Array(totalHoles).fill(null);
  let skinResults = savedRound?.skinResults || Array(totalHoles).fill(null);
  let currentHoleIndex = savedRound?.currentHoleIndex || 0;

  players.forEach((player) => {
    savedScores[player.id] = savedRound?.savedScores?.[player.id] || Array(totalHoles).fill(null);
    courseHandicaps[player.id] = getCourseHandicap(player, course);
  });

  function isInSkins(player) {
    return player.inSkins !== false;
  }

  function isInPoints(player) {
    return player.inPoints !== false;
  }

  function getSkinsPlayers() {
    return players.filter(isInSkins);
  }

  function getPointsPlayers() {
    return players.filter(isInPoints);
  }

  function getHoleForPlayer(player, holeIndex = currentHoleIndex) {
    return course.tees[player.tee][holeIndex];
  }

  function loadDraftScores() {
    players.forEach((player) => {
      const savedScore = savedScores[player.id][currentHoleIndex];
      const par = getHoleForPlayer(player).par;
      draftScores[player.id] = savedScore ?? par;
    });
  }

  function getPlayerTotals(player) {
    return savedScores[player.id].reduce(
      (totals, score, index) => {
        if (score !== null) {
          const par = getHoleForPlayer(player, index).par;
          const points = getPoints(score, par);
          const holeResult = savedHoleResults[index]?.find(
            (result) => result.playerId === player.id
          );
          totals.gross += Number(score);
          totals.net += holeResult?.netScore ?? Number(score);
          totals.holesPlayed += 1;
          if (isInPoints(player)) {
            totals.points += points;
            if (index < 9) {
              totals.frontPoints += points;
            } else {
              totals.backPoints += points;
            }
          }
        }

        return totals;
      },
      { gross: 0, net: 0, points: 0, frontPoints: 0, backPoints: 0, holesPlayed: 0 }
    );
  }

  function getPointsLeaders(section) {
    const pointKey = {
      front: "frontPoints",
      back: "backPoints",
      overall: "points"
    }[section];
    const pointsPlayers = getPointsPlayers();
    const totals = pointsPlayers.map((player) => ({
      player,
      points: getPlayerTotals(player)[pointKey]
    }));
    if (totals.length === 0) {
      return {
        points: 0,
        leaders: []
      };
    }
    const highScore = Math.max(...totals.map((item) => item.points));
    const leaders = totals.filter((item) => item.points === highScore);

    return {
      points: highScore,
      leaders
    };
  }

  function getPointsSummary() {
    return {
      front: getPointsLeaders("front"),
      back: getPointsLeaders("back"),
      overall: getPointsLeaders("overall")
    };
  }

  function getLeaderboardStandings() {
    return players
      .map((player) => ({
        player,
        totals: getPlayerTotals(player)
      }))
      .sort((a, b) => {
        if (b.totals.points !== a.totals.points) {
          return b.totals.points - a.totals.points;
        }

        return a.totals.gross - b.totals.gross;
      });
  }

  function getLowestScoreLeaders(scoreKey) {
    const totals = players.map((player) => ({
      player,
      score: getPlayerTotals(player)[scoreKey]
    }));
    const lowScore = Math.min(...totals.map((item) => item.score));

    return {
      score: lowScore,
      leaders: totals.filter((item) => item.score === lowScore)
    };
  }

  function getPlayerHoleResult(player, holeIndex = currentHoleIndex) {
    return savedHoleResults[holeIndex]?.find((result) => result.playerId === player.id) ?? null;
  }

  function getHolePointsResults(holeIndex) {
    return players.map((player) => {
      const grossScore = savedScores[player.id][holeIndex];
      const par = getHoleForPlayer(player, holeIndex).par;

        return {
          player,
          points: grossScore === null || !isInPoints(player) ? 0 : getPoints(grossScore, par)
        };
      });
  }

  function getSkinForHole(holeIndex) {
    return skinResults[holeIndex] ?? null;
  }

  function getStrokesForPlayerOnHole(player, holeIndex = currentHoleIndex) {
    const hole = getHoleForPlayer(player, holeIndex);
    return getStrokesOnHole(courseHandicaps[player.id], hole.handicap);
  }

  function recalculateSkins() {
    const skinsPlayers = getSkinsPlayers();

    skinResults = savedHoleResults.map((holeResults, index) => {
      if (!holeResults) return null;
      const skinHoleResults = holeResults.filter((result) =>
        skinsPlayers.some((player) => player.id === result.playerId)
      );
      const hasEveryPlayer = skinsPlayers.length > 0 && skinsPlayers.every((player) =>
        holeResults.some((result) => result.playerId === player.id)
      );

      if (!hasEveryPlayer) {
        return {
          hole: index + 1,
          winnerId: null,
          holeResults: skinHoleResults
        };
      }

      const winnerId = getSkinWinner(skinHoleResults);

      return {
        hole: index + 1,
        winnerId,
        holeResults: skinHoleResults
      };
    });
  }

  function getSkinSummary() {
    const summary = {};

    getSkinsPlayers().forEach((player) => {
      summary[player.id] = {
        player,
        totalSkins: 0,
        holesWon: []
      };
    });

    skinResults.forEach((skin) => {
      if (!skin?.winnerId) return;
      if (!summary[skin.winnerId]) return;

      summary[skin.winnerId].totalSkins += 1;
      summary[skin.winnerId].holesWon.push(skin.hole);
    });

    return summary;
  }

  function isRoundComplete() {
    return players.every((player) => savedScores[player.id].every((score) => score !== null));
  }

  function getLastSavedHoleIndex() {
    for (let index = totalHoles - 1; index >= 0; index -= 1) {
      const isSaved = players.every((player) => savedScores[player.id][index] !== null);

      if (isSaved) return index;
    }

    return -1;
  }

  function getFinalSummary() {
    return {
      grossWinner: getLowestScoreLeaders("gross"),
      netWinner: getLowestScoreLeaders("net"),
      points: getPointsSummary(),
      skins: getSkinSummary(),
      playerTotals: players.map((player) => ({
        player,
        totals: getPlayerTotals(player),
        skins: getSkinSummary()[player.id] || {
          player,
          totalSkins: 0,
          holesWon: []
        }
      }))
    };
  }

  function getRoundExport() {
    const completedAt = new Date().toISOString();
    const holeByHole = Array.from({ length: totalHoles }, (_, holeIndex) => ({
      hole: holeIndex + 1,
      scores: players.map((player) => {
        const hole = getHoleForPlayer(player, holeIndex);
        const result = getPlayerHoleResult(player, holeIndex);

        return {
          playerId: player.id,
          playerName: player.name,
          tee: player.tee,
          par: hole.par,
          handicap: hole.handicap,
          yards: hole.yards,
          gross: savedScores[player.id][holeIndex],
          strokesReceived: result?.strokesReceived ?? 0,
          net: result?.netScore ?? null,
          points: savedScores[player.id][holeIndex] === null || !isInPoints(player)
            ? 0
            : getPoints(savedScores[player.id][holeIndex], hole.par)
        };
      }),
      netSkin: getSkinForHole(holeIndex)
    }));
    const finalSummary = getFinalSummary();

    return {
      id: roundId,
      date: completedAt,
      savedAt: completedAt,
      completed: true,
      roundSettings,
      course: {
        id: course.id,
        name: course.name,
        par: course.par
      },
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        ghin: player.ghin,
        handicapIndex: player.handicap,
        tee: player.tee,
        inSkins: isInSkins(player),
        inPoints: isInPoints(player),
        inClosestToPin: player.inClosestToPin !== false,
        inLongDrive: player.inLongDrive !== false,
        courseHandicap: courseHandicaps[player.id]
      })),
      holeByHole,
      savedScores,
      savedHoleResults,
      skinResults,
      totals: finalSummary.playerTotals.map((item) => ({
        playerId: item.player.id,
        playerName: item.player.name,
        gross: item.totals.gross,
        net: item.totals.net,
        points: item.totals.points,
        frontPoints: item.totals.frontPoints,
        backPoints: item.totals.backPoints,
        skinsWon: item.skins.totalSkins,
        skinHoles: item.skins.holesWon
      })),
      winners: {
        gross: finalSummary.grossWinner,
        net: finalSummary.netWinner,
        frontPoints: finalSummary.points.front,
        backPoints: finalSummary.points.back,
        overallPoints: finalSummary.points.overall,
        netSkins: getSkinSummary()
      },
      finalSummary
    };
  }

  function getAutoSaveExport() {
    const autoSavedAt = new Date().toISOString();
    const totals = players.map((player) => {
      const playerTotals = getPlayerTotals(player);

      return {
        playerId: player.id,
        playerName: player.name,
        gross: playerTotals.gross,
        net: playerTotals.net,
        points: playerTotals.points,
        frontPoints: playerTotals.frontPoints,
        backPoints: playerTotals.backPoints,
        overallPoints: playerTotals.points
      };
    });

    return {
      id: roundId,
      date: savedRound?.date || autoSavedAt,
      autoSavedAt,
      completed: false,
      currentHoleIndex,
      currentHole: currentHoleIndex + 1,
      roundSettings,
      course: {
        id: course.id,
        name: course.name,
        par: course.par
      },
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        ghin: player.ghin,
        handicap: player.handicap,
        handicapIndex: player.handicap,
        tee: player.tee,
        inSkins: isInSkins(player),
        inPoints: isInPoints(player),
        inClosestToPin: player.inClosestToPin !== false,
        inLongDrive: player.inLongDrive !== false,
        courseHandicap: courseHandicaps[player.id]
      })),
      savedScores,
      savedHoleResults,
      skinResults,
      totals,
      points: getPointsSummary(),
      netSkins: getSkinSummary()
    };
  }

  function changeDraftScore(playerId, amount) {
    const nextScore = draftScores[playerId] + amount;
    draftScores[playerId] = Math.max(1, Math.min(12, nextScore));
  }

  function saveCurrentHole(playersToSave = players) {
    const existingHoleResults = savedHoleResults[currentHoleIndex] || [];
    const playerIdsToSave = new Set(playersToSave.map((player) => player.id));
    const holeResults = existingHoleResults.filter(
      (result) => !playerIdsToSave.has(result.playerId)
    );

    playersToSave.forEach((player) => {
      const grossScore = draftScores[player.id];
      const strokesReceived = getStrokesForPlayerOnHole(player);
      const netScore = getNetScore(grossScore, strokesReceived);

      savedScores[player.id][currentHoleIndex] = grossScore;
      holeResults.push({
        playerId: player.id,
        grossScore,
        strokesReceived,
        netScore
      });
    });

    savedHoleResults[currentHoleIndex] = holeResults;
    recalculateSkins();
  }

  function goToHole(nextHoleIndex) {
    currentHoleIndex = Math.max(0, Math.min(totalHoles - 1, nextHoleIndex));
    loadDraftScores();
  }

  function resetScores() {
    players.forEach((player) => {
      savedScores[player.id] = Array(totalHoles).fill(null);
    });

    savedHoleResults = Array(totalHoles).fill(null);
    skinResults = Array(totalHoles).fill(null);
    currentHoleIndex = 0;
    loadDraftScores();
  }

  recalculateSkins();
  loadDraftScores();

  return {
    id: roundId,
    roundSettings,
    totalHoles,
    savedScores,
    courseHandicaps,
    draftScores,
    get currentHoleIndex() {
      return currentHoleIndex;
    },
    get skinResults() {
      return skinResults;
    },
    getHoleForPlayer,
    getPlayerHoleResult,
    getHolePointsResults,
    getSkinForHole,
    getPlayerTotals,
    getPointsSummary,
    getLeaderboardStandings,
    getStrokesForPlayerOnHole,
    getSkinSummary,
    isInSkins,
    isInPoints,
    isRoundComplete,
    getLastSavedHoleIndex,
    getFinalSummary,
    getRoundExport,
    getAutoSaveExport,
    changeDraftScore,
    saveCurrentHole,
    goToHole,
    resetScores
  };
};
