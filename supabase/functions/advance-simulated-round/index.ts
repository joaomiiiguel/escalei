import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Fixture = {
  fixture?: { status?: { short?: string } };
  goals?: { home?: number | null; away?: number | null };
};

const finishedStatuses = new Set(["FT", "AET", "PEN"]);

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const season = Number(Deno.env.get("API_FOOTBALL_SEASON") ?? "2024");
  if (!apiKey || !url || !serviceRoleKey || !Number.isInteger(season)) {
    return Response.json({ error: "Configuração da simulação incompleta." }, { status: 500 });
  }

  const db = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: config, error: configError } = await db.from("configuracoes")
    .select("valor").eq("chave", "rodada_simulada_atual").maybeSingle();
  let number = typeof config?.valor === "number" ? config.valor : Number(config?.valor);
  if (configError || !Number.isInteger(number)) return Response.json({ error: "Rodada simulada não configurada." }, { status: 500 });

  const { data: configuredRound, error: roundError } = await db.from("rodadas")
    .select("id, numero, status, trava_em, fechamento_simulado_em")
    .eq("temporada", season).eq("numero", number).eq("simulada", true).maybeSingle();
  if (roundError || !configuredRound) return Response.json({ error: "Rodada simulada não encontrada." }, { status: 404 });

  const now = new Date();
  let round = configuredRound;
  let openedRound: number | null = null;
  if (round.status === "FECHADA") {
    const { data: nextRound, error: nextRoundError } = await db.from("rodadas")
      .select("id, numero, status, trava_em, fechamento_simulado_em")
      .eq("temporada", season)
      .eq("simulada", true)
      .eq("status", "AGENDADA")
      .gt("numero", number)
      .lte("abre_em", now.toISOString())
      .order("numero")
      .limit(1)
      .maybeSingle();
    if (nextRoundError) return Response.json({ error: "Não foi possível localizar a próxima rodada." }, { status: 500 });

    if (nextRound) {
      const { error: openError } = await db.from("rodadas")
        .update({ status: "ABERTA" })
        .eq("id", nextRound.id)
        .eq("status", "AGENDADA");
      if (openError) return Response.json({ error: "Não foi possível abrir a próxima rodada." }, { status: 500 });

      const { error: configUpdateError } = await db.from("configuracoes")
        .update({ valor: nextRound.numero })
        .eq("chave", "rodada_simulada_atual");
      if (configUpdateError) return Response.json({ error: "Não foi possível atualizar a rodada ativa." }, { status: 500 });

      round = { ...nextRound, status: "ABERTA" };
      number = nextRound.numero;
      openedRound = nextRound.numero;
    }
  }
  if (round.status === "ABERTA" && now >= new Date(round.trava_em)) {
    const { error } = await db.from("rodadas").update({ status: "EM_ANDAMENTO" }).eq("id", round.id);
    if (error) return Response.json({ error: "Não foi possível travar a rodada." }, { status: 500 });
  }

  const { data: dueGames, error: dueGamesError } = await db.from("jogos")
    .select("id, api_football_id")
    .eq("rodada_id", round.id).eq("status", "A_JOGAR")
    .lte("inicio_simulado_em", now.toISOString())
    .order("inicio_simulado_em");
  if (dueGamesError) return Response.json({ error: "Não foi possível localizar os jogos pendentes." }, { status: 500 });

  const completed: number[] = [];
  const pending: number[] = [];
  for (const game of dueGames ?? []) {
    if (!game.api_football_id) continue;
    const fixtureResponse = await fetch(`https://v3.football.api-sports.io/fixtures?id=${game.api_football_id}`, {
      headers: { "x-apisports-key": apiKey, Accept: "application/json" },
    });
    const fixturePayload = await fixtureResponse.json().catch(() => ({}));
    const fixture = fixturePayload.response?.[0] as Fixture | undefined;
    const status = fixture?.fixture?.status?.short;
    if (!fixtureResponse.ok || !fixture || !finishedStatuses.has(status ?? "")) {
      pending.push(game.id);
      continue;
    }
    const { error: gameError } = await db.from("jogos").update({
      status: "ENCERRADO", status_api: status, gols_casa: fixture.goals?.home ?? 0, gols_fora: fixture.goals?.away ?? 0,
      api_atualizado_em: now.toISOString(),
    }).eq("id", game.id);
    if (gameError) return Response.json({ error: "Não foi possível encerrar um jogo simulado." }, { status: 500 });
    completed.push(game.id);
  }

  const { data: unscoredGames, error: unscoredError } = await db.from("jogos")
    .select("id").eq("rodada_id", round.id).eq("status", "ENCERRADO").is("pontuado_em", null);
  if (unscoredError) return Response.json({ error: "Não foi possível localizar jogos a pontuar." }, { status: 500 });
  for (const game of unscoredGames ?? []) {
    const response = await fetch(`${url}/functions/v1/score-match`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, "Content-Type": "application/json" },
      body: JSON.stringify({ jogoId: game.id }),
    });
    if (!response.ok) pending.push(game.id);
  }

  const { data: games, error: gamesError } = await db.from("jogos")
    .select("id, pontuado_em, conferido_em").eq("rodada_id", round.id);
  if (gamesError || !games) return Response.json({ error: "Não foi possível verificar o encerramento da rodada." }, { status: 500 });
  const allScored = games.length > 0 && games.every((game) => game.pontuado_em);
  let closeAt = round.fechamento_simulado_em;
  if (allScored && !closeAt) {
    const lastScoredAt = Math.max(
      ...games.map((game) => new Date(game.pontuado_em as string).getTime()),
    );
    closeAt = new Date(lastScoredAt + 60 * 60_000).toISOString();
    const { error } = await db.from("rodadas").update({ fechamento_simulado_em: closeAt }).eq("id", round.id);
    if (error) return Response.json({ error: "Não foi possível agendar a conferência da rodada." }, { status: 500 });
  }
  if (allScored && closeAt && now >= new Date(closeAt)) {
    for (const game of games.filter((item) => !item.conferido_em)) {
      const response = await fetch(`${url}/functions/v1/score-match`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, "Content-Type": "application/json" },
        body: JSON.stringify({ jogoId: game.id, conferencia: true }),
      });
      if (!response.ok) pending.push(game.id);
    }
    const { data: unchecked } = await db.from("jogos").select("id").eq("rodada_id", round.id).is("conferido_em", null);
    if (!unchecked?.length) {
      const { error: priceError } = await db.rpc("fn_atualizar_precos", { p_rodada_id: round.id });
      if (priceError) return Response.json({ error: "A conferência foi concluída, mas não foi possível atualizar os preços." }, { status: 500 });

      const { error: balanceError } = await db.rpc("fn_creditar_saldos_rodada", { p_rodada_id: round.id });
      if (balanceError) return Response.json({ error: "A conferência foi concluída, mas não foi possível creditar os saldos." }, { status: 500 });

      const { error: closeError } = await db
        .from("rodadas")
        .update({ status: "FECHADA", fechada_em: now.toISOString() })
        .eq("id", round.id);
      if (closeError) return Response.json({ error: "Não foi possível fechar a rodada." }, { status: 500 });
    }
  }

  return Response.json({ rodada: number, rodadaAberta: openedRound, encerrados: completed, pendentes: [...new Set(pending)], conferenciaEm: closeAt ?? null });
});
