window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.state = window.OGSGolf.state || {};

window.OGSGolf.state.roundStorage = {
  key: "ogsGolfRounds",
  unfinishedKey: "ogsGolfUnfinishedRound",

  getAll() {
    return JSON.parse(window.localStorage.getItem(this.key) || "[]");
  },

  save(roundData) {
    const rounds = this.getAll();
    const existingIndex = rounds.findIndex((round) => round.id === roundData.id);

    if (existingIndex >= 0) {
      rounds[existingIndex] = roundData;
    } else {
      rounds.push(roundData);
    }

    window.localStorage.setItem(this.key, JSON.stringify(rounds));
    return rounds;
  },

  remove(roundId) {
    const rounds = this.getAll().filter((round) => round.id !== roundId);
    window.localStorage.setItem(this.key, JSON.stringify(rounds));
    return rounds;
  },

  getUnfinished() {
    return JSON.parse(window.localStorage.getItem(this.unfinishedKey) || "null");
  },

  saveUnfinished(roundData) {
    window.localStorage.setItem(this.unfinishedKey, JSON.stringify(roundData));
  },

  clearUnfinished() {
    window.localStorage.removeItem(this.unfinishedKey);
  }
};
