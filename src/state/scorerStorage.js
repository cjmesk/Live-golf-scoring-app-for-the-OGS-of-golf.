window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.state = window.OGSGolf.state || {};

window.OGSGolf.state.scorerStorage = {
  scorerKey: "ogsGolfScorerId",
  commissionerKey: "ogsGolfCommissionerMode",
  commissionerPin: "1234",

  getScorerId() {
    return window.localStorage.getItem(this.scorerKey);
  },

  saveScorerId(playerId) {
    window.localStorage.setItem(this.scorerKey, playerId);
  },

  clearScorerId() {
    window.localStorage.removeItem(this.scorerKey);
  },

  isCommissioner() {
    return window.localStorage.getItem(this.commissionerKey) === "true";
  },

  setCommissionerMode(isCommissioner) {
    if (isCommissioner) {
      window.localStorage.setItem(this.commissionerKey, "true");
      return;
    }

    window.localStorage.removeItem(this.commissionerKey);
  }
};
