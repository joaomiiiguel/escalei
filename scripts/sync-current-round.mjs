import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.API_FOOTBALL_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const leagueId = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? "71");
const season = Number(process.env.API_FOOTBALL_SEASON ?? "2024");
if (!apiKey || !supabaseUrl || !serviceRoleKey) throw new Error("API_FOOTBALL_KEY, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");

const statusByApi = { TBD: "A_JOGAR", NS: "A_JOGAR", "1H": "EM_ANDAMENTO", HT: "EM_ANDAMENTO", "2H": "EM_ANDAMENTO", ET: "EM_ANDAMENTO", BT: "EM_ANDAMENTO", P: "EM_ANDAMENTO", INT: "EM_ANDAMENTO", LIVE: "EM_ANDAMENTO", FT: "ENCERRADO", AET: "ENCERRADO", PEN: "ENCERRADO", PST: "ADIADO", SUSP: "ADIADO", CANC: "CANCELADO", ABD: "CANCELADO", AWD: "CANCELADO", WO: "CANCELADO" };
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: simulationConfig, error: simulationConfigError } = await supabase.from("configuracoes").select("valor").eq("chave", "rodada_simulada_atual").maybeSingle();
const simulationRound = typeof simulationConfig?.valor === "number" ? simulationConfig.valor : Number(simulationConfig?.valor);
if (simulationConfigError || !Number.isInteger(simulationRound) || simulationRound < 1 || simulationRound > 38) throw new Error("Configure rodada_simulada_atual (1–38) no banco antes de sincronizar.");
const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&round=${encodeURIComponent(`Regular Season - ${simulationRound}`)}`, { headers: { "x-apisports-key": apiKey, Accept: "application/json" } });
const payload = await response.json().catch(() => ({}));
if (!response.ok || !Array.isArray(payload.response) || Object.keys(payload.errors ?? {}).length) throw new Error(`API-Football não retornou partidas: HTTP ${response.status}.`);

const now = new Date();
const matches = payload.response;
const roundName = `Regular Season - ${simulationRound}`;
const number = simulationRound;
if (!Number.isInteger(number) || matches.length !== 10) throw new Error(`Rodada inválida da API-Football: ${roundName}.`);

const externalClubIds = [...new Set(matches.flatMap(({ teams }) => [teams.home.id, teams.away.id]))];
const { data: clubs, error: clubsError } = await supabase.from("clubes").select("id, api_football_id").in("api_football_id", externalClubIds).eq("ativo", true);
if (clubsError || clubs?.length !== 20) throw new Error("Clubes da rodada não estão mapeados para a API-Football.");
const clubId = new Map(clubs.map((club) => [club.api_football_id, club.id]));
const starts = matches.map(({ fixture }) => new Date(fixture.date)).sort((a, b) => a - b);
const statuses = matches.map(({ fixture }) => statusByApi[fixture.status.short]);
if (statuses.some((status) => !status)) throw new Error("A API-Football retornou status de jogo não mapeado.");
const roundStatus = "EM_ANDAMENTO";
const { data: round, error: roundError } = await supabase.from("rodadas").upsert({ temporada: season, numero: number, rotulo_api: roundName, simulada: true, status: roundStatus, abre_em: starts[0].toISOString(), trava_em: starts[0].toISOString(), fechada_em: null, versao_regras: 1 }, { onConflict: "temporada,numero" }).select("id").single();
if (roundError || !round) throw new Error("Não foi possível gravar a rodada.");
const { data: oldGames, error: oldGamesError } = await supabase.from("jogos").select("id, api_football_id").in("api_football_id", matches.map(({ fixture }) => fixture.id));
if (oldGamesError) throw new Error("Não foi possível consultar partidas existentes.");
const existingId = new Map((oldGames ?? []).map((game) => [game.api_football_id, game.id]));
const games = matches.map(({ fixture, teams, goals }) => ({ id: existingId.get(fixture.id) ?? 1_500_000_000 + fixture.id, api_football_id: fixture.id, rodada_id: round.id, clube_casa_id: clubId.get(teams.home.id), clube_fora_id: clubId.get(teams.away.id), inicio_em: fixture.date, status: statusByApi[fixture.status.short], status_api: fixture.status.short, gols_casa: goals.home, gols_fora: goals.away, api_atualizado_em: new Date().toISOString() }));
const { error: gamesError } = await supabase.from("jogos").upsert(games, { onConflict: "id" });
if (gamesError) throw new Error(`Não foi possível gravar partidas: ${gamesError.message}`);
console.log(`Rodada ${number} sincronizada: ${games.length} jogos da Série A ${season}, via API-Football.`);
