window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.cloud = window.OGSGolf.cloud || {};

window.OGSGolf.cloud.roundCloudService = {
  async loadActiveRound() {
    const config = window.OGSGolf.cloud.supabaseConfig;

    if (!config.url || !config.anonKey) {
      return { ok: false, round: null };
    }

    try {
      const response = await fetch(
        `${config.url}/rest/v1/rounds?select=raw_data&completed=eq.false&order=played_at.desc&limit=1`,
        {
          headers: {
            apikey: config.anonKey,
            Authorization: `Bearer ${config.anonKey}`
          }
        }
      );

      if (!response.ok) throw new Error("Active event request failed.");

      const data = await response.json();
      const rawData = data[0]?.raw_data;

      return {
        ok: true,
        round: typeof rawData === "string" ? JSON.parse(rawData) : rawData || null
      };
    } catch (error) {
      return { ok: false, round: null };
    }
  },

  async saveActiveRound(roundData) {
    const client = window.OGSGolf.cloud.getSupabaseClient();

    if (!client) {
      return { ok: false };
    }

    try {
      await client.from("courses").upsert({
        id: roundData.course.id,
        name: roundData.course.name,
        par: roundData.course.par
      }).throwOnError();
      await client.from("rounds").upsert({
        id: roundData.id,
        played_at: roundData.date || new Date().toISOString(),
        course_id: roundData.course.id,
        completed: false,
        raw_data: roundData
      }).throwOnError();

      return { ok: true };
    } catch (error) {
      return { ok: false };
    }
  },

  async savePlayers(players) {
    const client = window.OGSGolf.cloud.getSupabaseClient();

    if (!client) {
      return {
        ok: false,
        reason: "not-configured",
        message: "Player cloud save is not set up yet. Your roster is saved on this device."
      };
    }

    const playerRows = players.map((player) => ({
      id: player.id,
      name: player.name,
      ghin: player.ghin || null,
      handicap_index: player.handicap,
      preferred_tee: player.tee,
      active: player.active
    }));

    try {
      await client.from("players").upsert(playerRows).throwOnError();

      return {
        ok: true,
        message: "Roster saved to Supabase ✓"
      };
    } catch (error) {
      return {
        ok: false,
        reason: "failed",
        message: "Cloud roster save failed. Your roster is still saved on this device."
      };
    }
  },

  async loadCompletedRounds() {
    const config = window.OGSGolf.cloud.supabaseConfig;

    if (!config.url || !config.anonKey) {
      return {
        ok: false,
        reason: "not-configured",
        message: "Cloud load failed, showing local rounds",
        rounds: []
      };
    }

    try {
      const response = await fetch(
        `${config.url}/rest/v1/rounds?select=id,played_at,raw_data&completed=eq.true&order=played_at.desc`,
        {
          headers: {
            apikey: config.anonKey,
            Authorization: `Bearer ${config.anonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Cloud rounds request failed.");
      }

      const data = await response.json();
      const rounds = (data || [])
        .map((row) => (typeof row.raw_data === "string" ? JSON.parse(row.raw_data) : row.raw_data))
        .filter(Boolean);

      return {
        ok: true,
        message: "Loaded rounds from cloud",
        rounds
      };
    } catch (error) {
      return {
        ok: false,
        reason: "failed",
        message: "Cloud load failed, showing local rounds",
        rounds: []
      };
    }
  },

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
