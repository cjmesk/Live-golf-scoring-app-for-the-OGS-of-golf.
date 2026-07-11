window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.state = window.OGSGolf.state || {};

window.OGSGolf.state.scorerStorage = {
  scorerKey: "ogsGolfScorerId",
  scorerByRoundPrefix: "ogsGolfScorerId:",
  commissionerKey: "ogsGolfCommissionerMode",
  commissionerPin: "1234",

  getRoundScorerKey(roundId) {
    return `${this.scorerByRoundPrefix}${roundId}`;
  },

  getScorerId(roundId) {
    if (roundId) {
      return window.localStorage.getItem(this.getRoundScorerKey(roundId));
    }

    return null;
  },

  saveScorerId(playerId, roundId) {
    if (!roundId) return;

    window.localStorage.setItem(this.getRoundScorerKey(roundId), playerId);
  },

  clearScorerId(roundId) {
    if (roundId) {
      window.localStorage.removeItem(this.getRoundScorerKey(roundId));
    }

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
