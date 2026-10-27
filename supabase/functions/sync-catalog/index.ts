/**
 * Edge Function: sync-catalog
 *
 * Sincroniza o catálogo da temporada com a API-Football (JOA-147):
 * - `/teams?league=&season=` → 20 clubes ativos; clubes fora da temporada são desativados.
 * - `/players?league=&season=` (paginado) → elencos com posição e preço inicial
 *   (`_shared/catalog.ts`); jogadores fora dos elencos são desativados.
 * - Preços só são definidos para jogadores novos ou quando `redefinirPrecos = true`
 *   (na estreia da temporada). Depois disso a variação por rodada fica com
 *   `fn_atualizar_precos`.
 * - Cada chamada passa pelo orçamento diário e é registrada em `sync_execucoes`.
 *
 * Trigger: POST manual (estreia) e cron semanal.
 * Body opcional: { "redefinirPrecos": true }
 * Env obrigatórias: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                   API_FOOTBALL_LEAGUE_ID, API_FOOTBALL_SEASON.
 */
import { createClient } from "@supabase/supabase-js";
import { describeApiErrors, errorMessage, finishSyncExecution, QuotaReservedError, startSyncExecution, type SyncExecution } from "../_shared/api-football.ts";
import { buildClubs, buildPlayers, scoringWeights, type ApiPlayer, type ApiTeam } from "../_shared/catalog.ts";

/** Falha esperada da sincronização, com mensagem segura para o log. */
class CatalogError extends Error {
  override name = "CatalogError";
}

const MAX_PLAYER_PAGES = 80;
const BATCH_SIZE = 500;

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
  const body = await request.json().catch(() => ({}));
  const resetPrices = body?.redefinirPrecos === true;

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  let execution: SyncExecution;
  try {
    execution = await startSyncExecution(db, apiKey, "CATALOGO", `api-football:${season}:catalogo`);
  } catch {
    return Response.json({ error: "Não foi possível registrar a sincronização." }, { status: 500 });
  }

  try {
    const now = new Date().toISOString();
    const { response: teamsResponse, payload: teamsPayload } = await execution.client.get(`/teams?league=${leagueId}&season=${season}`);
    const teamErrors = describeApiErrors(teamsPayload);
    if (!teamsResponse.ok || teamErrors || !Array.isArray(teamsPayload.response) || teamsPayload.response.length !== 20) {
      throw new CatalogError(`A API-Football não retornou os 20 clubes da temporada ${season} (HTTP ${teamsResponse.status}${teamErrors ? `; ${teamErrors}` : ""}).`);
    }

    const [{ data: savedClubs, error: clubsError }, { data: savedPlayers, error: playersError }, { data: weightRows, error: weightsError }] = await Promise.all([
      db.from("clubes").select("id, sigla, api_football_id"),
      db.from("jogadores").select("id, api_football_id, preco, preco_inicial"),
      db.from("tabela_pontuacao").select("scout, posicao, pontos").eq("versao", 1),
    ]);
    if (clubsError || playersError || weightsError || !weightRows?.length) throw new CatalogError("Não foi possível ler o catálogo atual.");

    const { clubs, renames } = buildClubs(teamsPayload.response as ApiTeam[], savedClubs ?? [], now);
    // Libera as siglas oficiais presas em clubes fora da temporada antes de gravar os da temporada.
    for (const rename of renames) {
      const { error } = await db.from("clubes").update({ sigla: rename.sigla, ativo: false }).eq("id", rename.id);
      if (error) throw new CatalogError(`Não foi possível liberar a sigla de um clube antigo: ${error.message}`);
    }
    const { error: upsertClubsError } = await db.from("clubes").upsert(clubs, { onConflict: "id" });
    if (upsertClubsError) throw new CatalogError(`Não foi possível gravar os clubes: ${upsertClubsError.message}`);
    const clubIds = clubs.map((club) => club.id);
    const { error: deactivateClubsError } = await db.from("clubes").update({ ativo: false }).not("id", "in", `(${clubIds.join(",")})`).eq("ativo", true);
    if (deactivateClubsError) throw new CatalogError("Não foi possível desativar os clubes fora da temporada.");

    const entries: ApiPlayer[] = [];
    for (let page = 1, total = 1; page <= total && page <= MAX_PLAYER_PAGES; page += 1) {
      const { response, payload } = await execution.client.get(`/players?league=${leagueId}&season=${season}&page=${page}`);
      const apiErrors = describeApiErrors(payload);
      if (!response.ok || apiErrors || !Array.isArray(payload.response)) {
        throw new CatalogError(`A API-Football não retornou a página ${page} de jogadores (HTTP ${response.status}${apiErrors ? `; ${apiErrors}` : ""}).`);
      }
      entries.push(...(payload.response as ApiPlayer[]));
      total = Number((payload as { paging?: { total?: number } }).paging?.total ?? 1);
    }

    const clubIdByApiId = new Map(clubs.map((club) => [club.api_football_id, club.id]));
    const built = buildPlayers(entries, { leagueId, clubIdByApiId, saved: savedPlayers ?? [], weights: scoringWeights(weightRows), now });
    if (built.length < 300) throw new CatalogError(`Só ${built.length} jogadores com posição e clube; sincronização cancelada.`);
    const savedById = new Map((savedPlayers ?? []).map((player) => [player.id, player]));
    // Jogador já cadastrado mantém o preço corrente, a não ser na estreia da temporada.
    const players = built.map((player) => {
      const saved = savedById.get(player.id);
      return saved && !resetPrices ? { ...player, preco: Number(saved.preco), preco_inicial: Number(saved.preco_inicial ?? saved.preco) } : player;
    });
    for (let index = 0; index < players.length; index += BATCH_SIZE) {
      const { error } = await db.from("jogadores").upsert(players.slice(index, index + BATCH_SIZE), { onConflict: "id" });
      if (error) throw new CatalogError(`Não foi possível gravar os jogadores: ${error.message}`);
    }
    const activeIds = new Set(players.map((player) => player.id));
    const inactive = (savedPlayers ?? []).map((player) => player.id).filter((id) => !activeIds.has(id));
    for (let index = 0; index < inactive.length; index += BATCH_SIZE) {
      const { error } = await db.from("jogadores").update({ ativo: false }).in("id", inactive.slice(index, index + BATCH_SIZE));
      if (error) throw new CatalogError("Não foi possível desativar os jogadores fora dos elencos.");
    }

    await finishSyncExecution(db, execution);
    return Response.json({ temporada: season, clubes: clubs.length, jogadores: players.length, desativados: inactive.length, precosRedefinidos: resetPrices, requisicoes: execution.client.requests });
  } catch (error) {
    if (error instanceof QuotaReservedError) {
      await finishSyncExecution(db, execution, error.message);
      return Response.json({ error: "Sincronização adiada para preservar a cota diária da API-Football." }, { status: 429 });
    }
    const message = error instanceof CatalogError ? error.message : errorMessage(error, "Falha na sincronização do catálogo via API-Football.");
    await finishSyncExecution(db, execution, message);
    console.error(error);
    return Response.json({ error: message }, { status: 500 });
  }
});
