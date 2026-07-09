window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.ui = window.OGSGolf.ui || {};

window.OGSGolf.ui.renderSkinsSummary = function renderSkinsSummary(elements, players, roundState) {
  const skinSummary = roundState.getSkinSummary();
  const savedSkins = roundState.skinResults.filter(Boolean);

  elements.skinsSummary.innerHTML = "";

  const playerSummary = document.createElement("div");
  playerSummary.className = "skins-list";

  players.forEach((player) => {
    const isInSkins = roundState.isInSkins(player);
    const summary = skinSummary[player.id] || { totalSkins: 0, holesWon: [] };
    const holesText = summary.holesWon.length > 0 ? summary.holesWon.join(", ") : "-";
    const row = document.createElement("div");
    row.className = "skins-row";
    row.innerHTML = `
      <div>
        <div class="player-name">${player.name}</div>
        <div class="player-details">${isInSkins ? `Skin holes: ${holesText}` : "Not in Skins"}</div>
      </div>
      <strong>${isInSkins ? summary.totalSkins : "-"}</strong>
    `;
    playerSummary.appendChild(row);
  });

  const holeSummary = document.createElement("div");
  holeSummary.className = "skins-list";

  if (savedSkins.length === 0) {
    holeSummary.innerHTML = `<p class="empty-state">Save a hole to see net skin winners.</p>`;
  } else {
    savedSkins.forEach((skin) => {
      const winner = players.find((player) => player.id === skin.winnerId);
      const winnerText = winner ? winner.name : "No skin";
      const netScores = skin.holeResults.length
        ? skin.holeResults
            .map((result) => {
              const player = players.find((item) => item.id === result.playerId);
              const skinScore = result.skinScore ?? result.netScore;
              return `${player.name}: ${skinScore}`;
            })
            .join(" | ")
        : "Waiting for skins players to finish this hole.";
      const row = document.createElement("div");
      row.className = "skins-hole";
      row.innerHTML = `
        <div class="player-name">Hole ${skin.hole}: ${winnerText}</div>
        <div class="player-details">${netScores}</div>
      `;
      holeSummary.appendChild(row);
    });
  }

  elements.skinsSummary.append(playerSummary, holeSummary);
};
