window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.state = window.OGSGolf.state || {};

window.OGSGolf.state.playerStorage = {
  key: "ogsGolfPlayers",

  getAll(defaultPlayers) {
    const savedPlayers = JSON.parse(window.localStorage.getItem(this.key) || "null");
    return savedPlayers || defaultPlayers;
  },

  hasSavedRoster() {
    return Boolean(window.localStorage.getItem(this.key));
  },

  saveAll(players) {
    window.localStorage.setItem(this.key, JSON.stringify(players));
    return players;
  }
};
