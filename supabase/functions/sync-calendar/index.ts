/**
 * Edge Function: sync-calendar
 *
 * Mantém o calendário oficial da temporada (JOA-147):
 * - Uma requisição a `/fixtures?league=&season=` traz todos os jogos.
 * - Registra as rodadas a partir de `configuracoes.rodada_estreia` como rodadas
 *   reais (`simulada = false`), com `abre_em`/`trava_em` (`_shared/calendar.ts`).
 * - Horários são recalculados só enquanto a rodada está AGENDADA ou ABERTA;
 *   mudança depois da trava vira aviso no log, sem alterar a regra aplicada.
 * - Jogos: cria os novos; nos existentes atualiza data, clubes e adiamentos.
 *   Status ao vivo, placar e pontuação ficam com o orquestrador (`advance-round`).
 *
 * Trigger: cron a cada 6 h e POST manual.
 * Env obrigatórias: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                   API_FOOTBALL_LEAGUE_ID, API_FOOTBALL_SEASON.
 */
import { createClient } from "@supabase/supabase-js";
import { describeApiErrors, errorMessage, finishSyncExecution, QuotaReservedError, startSyncExecution, type SyncExecution } from "../_shared/api-football.ts";
import { buildCalendar, gameRow, initialRoundStatus, STATUS_BY_API, type ApiFixture, type GameStatus } from "../_shared/calendar.ts";

class CalendarError extends Error {
  override name = "CalendarError";
}

const NOT_STARTED: GameStatus[] = ["A_JOGAR", "ADIADO", "CANCELADO"];

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const leagueId = Number(Deno.env.get("API_FOOTBALL_LEAGUE_ID") ?? "71");
  const season = Number(Deno.env.get("API_FOOTBALL_SEASON"));
  if (!apiKey || !supabaseUrl || !serviceRoleKey || !Number.isInteger(leagueId) || !Number.isInteger(season)) {
    return Response.json({ error: "Configuração da API-Football incompleta." }, { status: 500 });
  }

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  let execution: SyncExecution;
  try {
    execution = await startSyncExecution(db, apiKey, "CALENDARIO", `api-football:${season}:calendario`);
  } catch {
    return Response.json({ error: "Não foi possível registrar a sincronização." }, { status: 500 });
  }

  const warnings: string[] = [];
  try {
    const now = new Date();
    const { data: firstRoundConfig } = await db.from("configuracoes").select("valor").eq("chave", "rodada_estreia").maybeSingle();
    const fromRound = Number(firstRoundConfig?.valor ?? 1);
    if (!Number.isInteger(fromRound) || fromRound < 1 || fromRound > 38) throw new CalendarError("configuracoes.rodada_estreia inválida.");

    const { response, payload } = await execution.client.get(`/fixtures?league=${leagueId}&season=${season}`);
    const apiErrors = describeApiErrors(payload);
    if (!response.ok || apiErrors || !Array.isArray(payload.response)) {
      throw new CalendarError(`A API-Football não retornou o calendário de ${season} (HTTP ${response.status}${apiErrors ? `; ${apiErrors}` : ""}).`);
    }
    const calendar = buildCalendar(payload.response as ApiFixture[], fromRound);
    if (!calendar.length) throw new CalendarError(`Nenhuma rodada a partir da ${fromRound} no calendário de ${season}.`);

    const [{ data: clubs, error: clubsError }, { data: savedRounds, error: roundsError }, { data: savedGames, error: gamesError }] = await Promise.all([
      db.from("clubes").select("id, api_football_id").eq("ativo", true).not("api_football_id", "is", null),
      db.from("rodadas").select("id, numero, status, abre_em, trava_em").eq("temporada", season).eq("simulada", false),
      db.from("jogos").select("id, api_football_id, status").in("api_football_id", calendar.flatMap((round) => round.fixtures.map((fixture) => fixture.fixture.id))),
    ]);
    if (clubsError || roundsError || gamesError) throw new CalendarError("Não foi possível ler o calendário atual.");
    const clubIdByApiId = new Map((clubs ?? []).map((club) => [club.api_football_id as number, club.id as number]));
    const roundByNumber = new Map((savedRounds ?? []).map((round) => [round.numero as number, round]));
    const gameByApiId = new Map((savedGames ?? []).map((game) => [game.api_football_id as number, game]));

    let createdRounds = 0;
    let createdGames = 0;
    let updatedGames = 0;
    for (const round of calendar) {
      let saved = roundByNumber.get(round.numero);
      if (!saved) {
        const status = initialRoundStatus(new Date(round.abre_em), new Date(round.trava_em), now);
        const { data, error } = await db.from("rodadas").insert({
          temporada: season, numero: round.numero, rotulo_api: round.rotulo_api, simulada: false, status, abre_em: round.abre_em, trava_em: round.trava_em, versao_regras: 1,
        }).select("id, numero, status, abre_em, trava_em").single();
        if (error || !data) throw new CalendarError(`Não foi possível registrar a rodada ${round.numero}: ${error?.message ?? "sem retorno"}`);
        saved = data;
        createdRounds += 1;
        // Rodada que já nasce aberta não passa pela abertura do orquestrador.
        if (status !== "AGENDADA") {
          const { error: rankingError } = await db.rpc("fn_inicializar_ranking_rodada", { p_rodada_id: data.id });
          if (rankingError) throw new CalendarError(`Não foi possível inicializar o ranking da rodada ${round.numero}.`);
        }
      } else if (saved.status === "AGENDADA" || saved.status === "ABERTA") {
        const { error } = await db.from("rodadas").update({ abre_em: round.abre_em, trava_em: round.trava_em, rotulo_api: round.rotulo_api }).eq("id", saved.id);
        if (error) throw new CalendarError(`Não foi possível atualizar os horários da rodada ${round.numero}.`);
      } else if (new Date(saved.trava_em).getTime() !== new Date(round.trava_em).getTime()) {
        warnings.push(`Rodada ${round.numero}: trava oficial mudou para ${round.trava_em} depois de travada (mantida ${saved.trava_em}).`);
      }

      const nowIso = now.toISOString();
      const newRows = [];
      const updates = [];
      for (const fixture of round.fixtures) {
        const existing = gameByApiId.get(fixture.fixture.id);
        const row = gameRow(fixture, { id: existing?.id, rodadaId: saved.id, clubIdByApiId, now: nowIso });
        if (!existing) {
          newRows.push(row);
          continue;
        }
        // Antes de começar, o calendário decide adiamentos e remarcações; depois, o orquestrador.
        const apiStatus = STATUS_BY_API[fixture.fixture.status.short];
        const status = NOT_STARTED.includes(existing.status) && NOT_STARTED.includes(apiStatus) ? apiStatus : existing.status;
        updates.push({ id: row.id, api_football_id: row.api_football_id, rodada_id: row.rodada_id, clube_casa_id: row.clube_casa_id, clube_fora_id: row.clube_fora_id, inicio_em: row.inicio_em, status, api_atualizado_em: nowIso });
      }
      if (newRows.length) {
        const { error } = await db.from("jogos").insert(newRows);
        if (error) throw new CalendarError(`Não foi possível registrar os jogos da rodada ${round.numero}: ${error.message}`);
        createdGames += newRows.length;
      }
      if (updates.length) {
        const { error } = await db.from("jogos").upsert(updates, { onConflict: "id" });
        if (error) throw new CalendarError(`Não foi possível atualizar os jogos da rodada ${round.numero}: ${error.message}`);
        updatedGames += updates.length;
      }
    }

    for (const warning of warnings) console.warn(`[sync-calendar] ${warning}`);
    await finishSyncExecution(db, execution);
    return Response.json({ temporada: season, rodadas: calendar.map((round) => round.numero), rodadasCriadas: createdRounds, jogosCriados: createdGames, jogosAtualizados: updatedGames, avisos: warnings });
  } catch (error) {
    if (error instanceof QuotaReservedError) {
      await finishSyncExecution(db, execution, error.message);
      return Response.json({ error: "Sincronização adiada para preservar a cota diária da API-Football." }, { status: 429 });
    }
    const message = error instanceof CalendarError || (error instanceof Error && error.message.includes("sincronize o catálogo"))
      ? error.message
      : errorMessage(error, "Falha na sincronização do calendário via API-Football.");
    await finishSyncExecution(db, execution, message);
    console.error(error);
    return Response.json({ error: message }, { status: 500 });
  }
});
