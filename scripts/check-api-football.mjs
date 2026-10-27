// Verifica a conta da API-Football e se ela entrega o Brasileirão Série A da temporada pedida.
// Uso: npm run check:api -- 2026
// Custo: /status não consome cota; depois, no máximo 3 requisições.
const apiKey = process.env.API_FOOTBALL_KEY;
const leagueId = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 71);
const season = Number(process.argv[2] ?? new Date().getFullYear());
if (!apiKey) throw new Error("API_FOOTBALL_KEY é obrigatória.");

const BASE_URL = "https://v3.football.api-sports.io";
let spent = 0;

async function get(path, { free = false } = {}) {
  if (!free) spent += 1;
  const response = await fetch(`${BASE_URL}${path}`, { headers: { "x-apisports-key": apiKey, Accept: "application/json" } });
  const body = await response.json().catch(() => ({}));
  const errors = body.errors && (Array.isArray(body.errors) ? body.errors : Object.entries(body.errors).map(([key, value]) => `${key}: ${value}`));
  return { status: response.status, body, errors: errors?.length ? errors.join(" | ") : null };
}

const yesNo = (value) => (value ? "sim" : "NÃO");

const status = await get("/status", { free: true });
if (status.errors) {
  console.log(`❌ A API recusou a chave: ${status.errors}`);
  console.log("   Gere/copie a chave no painel da API-Sports e atualize .env e os secrets das Edge Functions.");
  process.exit(1);
}
const account = status.body.response ?? {};
console.log(`Conta: plano ${account.subscription?.plan ?? "?"}, ativo: ${yesNo(account.subscription?.active)}, vence em ${account.subscription?.end ?? "?"}`);
console.log(`Uso hoje: ${account.requests?.current ?? "?"} de ${account.requests?.limit_day ?? "?"} requisições`);

const league = await get(`/leagues?id=${leagueId}&season=${season}`);
const seasonInfo = league.body.response?.[0]?.seasons?.find((item) => item.year === season);
if (league.errors || !seasonInfo) {
  console.log(`❌ Liga ${leagueId} temporada ${season} indisponível${league.errors ? `: ${league.errors}` : "."}`);
  console.log(`Requisições gastas: ${spent}`);
  process.exit(1);
}
const coverage = seasonInfo.coverage ?? {};
console.log(`\n${league.body.response[0].league?.name} ${season}: ${seasonInfo.start} a ${seasonInfo.end}, temporada atual: ${yesNo(seasonInfo.current)}`);
console.log(`Cobertura declarada → jogos: ${yesNo(coverage.fixtures?.events)} eventos, ${yesNo(coverage.fixtures?.statistics_players)} estatísticas por jogador, escalações: ${yesNo(coverage.fixtures?.lineups)}, elencos: ${yesNo(coverage.players)}, lesões: ${yesNo(coverage.injuries)}`);

const lastFixture = await get(`/fixtures?league=${leagueId}&season=${season}&last=1`);
const fixture = lastFixture.body.response?.[0];
if (lastFixture.errors || !fixture) {
  console.log(`❌ Nenhum jogo encerrado encontrado${lastFixture.errors ? `: ${lastFixture.errors}` : "."}`);
  console.log(`Requisições gastas: ${spent}`);
  process.exit(1);
}
console.log(`\nÚltimo jogo: ${fixture.teams?.home?.name} ${fixture.goals?.home} × ${fixture.goals?.away} ${fixture.teams?.away?.name} (${fixture.league?.round}, ${fixture.fixture?.status?.short}, ${fixture.fixture?.date})`);

const players = await get(`/fixtures/players?fixture=${fixture.fixture.id}`);
const playerCount = (players.body.response ?? []).reduce((total, team) => total + (team.players?.length ?? 0), 0);
const withMinutes = (players.body.response ?? []).flatMap((team) => team.players ?? []).filter((player) => player.statistics?.[0]?.games?.minutes).length;
console.log(`Scouts desse jogo: ${playerCount} jogadores, ${withMinutes} com minutos em campo${players.errors ? ` (erro: ${players.errors})` : ""}`);
console.log(playerCount > 0 && withMinutes > 0 ? "✅ A API entrega dados de jogadores para pontuar esta temporada." : "❌ Sem scouts de jogadores: não dá para pontuar esta temporada.");
console.log(`\nRequisições gastas: ${spent}`);
