// Grava a resposta de /injuries dos jogos de uma rodada, para testes com dados reais
// (tests/fixtures/api-football/<temporada>/rodada-<n>/injuries.json).
// Uso: npm run record:injuries -- 2026 34
// Custo: 1 requisição (os 10 jogos vão juntos no parâmetro `ids`).
// Lê a lista de jogos de tests/fixtures/api-football/<temporada>/fixtures.json, sem consultar a API.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const apiKey = process.env.API_FOOTBALL_KEY;
if (!apiKey) throw new Error("API_FOOTBALL_KEY é obrigatória.");
const season = Number(process.argv[2]);
const round = Number(process.argv[3]);
if (!Number.isInteger(season) || !Number.isInteger(round)) throw new Error("Uso: npm run record:injuries -- <temporada> <rodada>");

const fixturesDir = path.join("tests", "fixtures", "api-football", String(season));
const calendar = JSON.parse(readFileSync(path.join(fixturesDir, "fixtures.json"), "utf8")).response;
const ids = calendar.filter((item) => item.league.round === `Regular Season - ${round}`).map((item) => item.fixture.id);
if (!ids.length) throw new Error(`Nenhum jogo da rodada ${round} em ${fixturesDir}/fixtures.json.`);

const endpoint = `/injuries?ids=${ids.join("-")}`;
const response = await fetch(`https://v3.football.api-sports.io${endpoint}`, { headers: { "x-apisports-key": apiKey, Accept: "application/json" } });
const body = await response.json();
const errors = body.errors && (Array.isArray(body.errors) ? body.errors : Object.values(body.errors));
if (!response.ok || errors?.length) throw new Error(`Falha em ${endpoint}: HTTP ${response.status} ${errors?.join(" | ") ?? ""}`);

const outDir = path.join(fixturesDir, `rodada-${round}`);
mkdirSync(outDir, { recursive: true });
// Guarda só o que os testes usam; descarta cabeçalhos e metadados de cobrança.
writeFileSync(path.join(outDir, "injuries.json"), `${JSON.stringify({ get: body.get, parameters: body.parameters, results: body.results, response: body.response }, null, 2)}\n`);
console.log(`${body.results} registros de ${ids.length} jogos gravados em ${outDir}/injuries.json. Restantes hoje: ${response.headers.get("x-ratelimit-requests-remaining") ?? "?"}.`);
