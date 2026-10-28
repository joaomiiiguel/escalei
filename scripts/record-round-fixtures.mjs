// Grava as respostas de /fixtures/players e /fixtures/events dos jogos de uma rodada
// já encerrada, para testes com dados reais (tests/fixtures/api-football/<temporada>/rodada-<n>/).
// Uso: npm run record:round -- 2026 32
// Custo: 2 requisições por jogo (20 numa rodada completa), com pausa entre elas.
// Lê a lista de jogos de tests/fixtures/api-football/<temporada>/fixtures.json, sem consultar a API.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const apiKey = process.env.API_FOOTBALL_KEY;
if (!apiKey) throw new Error("API_FOOTBALL_KEY é obrigatória.");
const season = Number(process.argv[2]);
const round = Number(process.argv[3]);
if (!Number.isInteger(season) || !Number.isInteger(round)) throw new Error("Uso: npm run record:round -- <temporada> <rodada>");

const BASE_URL = "https://v3.football.api-sports.io";
const PAUSE_MS = 1_500;
const fixturesDir = path.join("tests", "fixtures", "api-football", String(season));
const outDir = path.join(fixturesDir, `rodada-${round}`);
const calendar = JSON.parse(readFileSync(path.join(fixturesDir, "fixtures.json"), "utf8")).response;
const games = calendar.filter((item) => item.league.round === `Regular Season - ${round}`);
if (!games.length) throw new Error(`Nenhum jogo da rodada ${round} em ${fixturesDir}/fixtures.json.`);
const notFinished = games.filter((item) => !["FT", "AET", "PEN"].includes(item.fixture.status.short));
if (notFinished.length) throw new Error(`A rodada ${round} ainda tem jogos não encerrados: ${notFinished.map((item) => item.fixture.id).join(", ")}.`);

let spent = 0;
let remaining = null;
async function get(endpoint) {
  if (spent > 0) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  spent += 1;
  const response = await fetch(`${BASE_URL}${endpoint}`, { headers: { "x-apisports-key": apiKey, Accept: "application/json" } });
  remaining = response.headers.get("x-ratelimit-requests-remaining") ?? remaining;
  const body = await response.json();
  const errors = body.errors && (Array.isArray(body.errors) ? body.errors : Object.values(body.errors));
  if (!response.ok || errors?.length) throw new Error(`Falha em ${endpoint}: HTTP ${response.status} ${errors?.join(" | ") ?? ""}`);
  // Guarda só o que os testes usam; descarta cabeçalhos e metadados de cobrança.
  return { get: body.get, parameters: body.parameters, results: body.results, response: body.response };
}

mkdirSync(outDir, { recursive: true });
for (const game of games) {
  const id = game.fixture.id;
  writeFileSync(path.join(outDir, `fixture-${id}-players.json`), `${JSON.stringify(await get(`/fixtures/players?fixture=${id}`), null, 2)}\n`);
  writeFileSync(path.join(outDir, `fixture-${id}-events.json`), `${JSON.stringify(await get(`/fixtures/events?fixture=${id}`), null, 2)}\n`);
  console.log(`✔ ${game.teams.home.name} ${game.goals.home} × ${game.goals.away} ${game.teams.away.name}`);
}
console.log(`\n${games.length} jogos gravados em ${outDir}. Requisições gastas: ${spent}. Restantes hoje: ${remaining ?? "?"}.`);
