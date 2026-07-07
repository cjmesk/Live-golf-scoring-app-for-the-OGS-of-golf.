window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.cloud = window.OGSGolf.cloud || {};

window.OGSGolf.cloud.roundCloudService = {
  async saveCompletedRound(roundData) {
    const client = window.OGSGolf.cloud.getSupabaseClient();

    if (!client) {
      return {
        ok: false,
        reason: "not-configured",
        message: "Cloud save is not set up yet. Your round is still saved locally."
      };
    }

    const course = {
      id: roundData.course.id,
      name: roundData.course.name,
      par: roundData.course.par
    };
    const round = {
      id: roundData.id,
      played_at: roundData.date,
      course_id: roundData.course.id,
      completed: true,
      raw_data: roundData
    };
    const roundPlayers = roundData.players.map((player) => ({
      round_id: roundData.id,
      player_id: player.id,
      tee: player.tee,
      handicap_index: player.handicapIndex,
      course_handicap: player.courseHandicap
    }));
    const holeScores = roundData.holeByHole.flatMap((hole) =>
      hole.scores.map((score) => ({
        round_id: roundData.id,
        player_id: score.playerId,
        hole: hole.hole,
        tee: score.tee,
        par: score.par,
        handicap: score.handicap,
        yards: score.yards,
        gross: score.gross,
        strokes_received: score.strokesReceived,
        net: score.net,
        points: score.points
      }))
    );
    const results = roundData.totals.map((total) => ({
      round_id: roundData.id,
      player_id: total.playerId,
      gross_total: total.gross,
      net_total: total.net,
      points_total: total.points,
      front_points: total.frontPoints,
      back_points: total.backPoints,
      skins_won: total.skinsWon,
      skin_holes: total.skinHoles
    }));

    try {
      await client.from("courses").upsert(course).throwOnError();
      await client.from("rounds").upsert(round).throwOnError();
      await client.from("round_players").upsert(roundPlayers).throwOnError();
      await client.from("hole_scores").delete().eq("round_id", roundData.id).throwOnError();
      await client.from("hole_scores").insert(holeScores).throwOnError();
      await client.from("round_results").upsert(results).throwOnError();

      return {
        ok: true,
        message: "Round saved to cloud ✓"
      };
    } catch (error) {
      return {
        ok: false,
        reason: "failed",
        message: "Cloud save failed. Round is still saved locally."
      };
    }
  }
};
