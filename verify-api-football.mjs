#!/usr/bin/env node

import { readFileSync } from "node:fs";

function apiKeyFromEnvFile() {
  try {
    const line = readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .find((value) => value.startsWith("API_FOOTBALL_KEY="));
    return line?.slice("API_FOOTBALL_KEY=".length).trim().replace(/^(?:"|')|(?:"|')$/g, "");
  } catch {
    return undefined;
  }
}

const apiKey = process.env.API_FOOTBALL_KEY ?? apiKeyFromEnvFile();
const baseUrl = "https://v3.football.api-sports.io";

if (!apiKey) {
  console.error("API_FOOTBALL_KEY is required. Set it in the environment and run this command again.");
  process.exit(1);
}

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "x-apisports-key": apiKey },
  });
  const body = await response.json();

  if (!response.ok || body.errors?.length) {
    throw new Error(`${path}: ${JSON.stringify(body.errors ?? body)}`);
  }

  return body;
}

function check(label, passed, detail) {
  return { label, passed, detail };
}

try {
  const league = await request("/leagues?id=71&season=2026");
  const entry = league.response?.[0];
  const coverage = entry?.seasons?.find((season) => season.year === 2026)?.coverage;
  const fixtures = await request("/fixtures?league=71&season=2026&last=1");
  const fixture = fixtures.response?.[0];

  const checks = [
    check("Série A 2026 disponível", Boolean(entry), entry?.league?.name ?? "Nenhuma liga retornada"),
    check(
      "Estatísticas de jogadores cobertas",
      coverage?.fixtures?.statistics_players === true,
      String(coverage?.fixtures?.statistics_players ?? false),
    ),
    check("Fixture disponível para inspeção", Boolean(fixture), fixture?.fixture?.id ?? "Nenhum jogo retornado"),
  ];

  if (fixture) {
    const players = await request(`/fixtures/players?fixture=${fixture.fixture.id}`);
    const statistics = players.response?.flatMap((team) => team.players ?? []) ?? [];
    const sample = statistics[0]?.statistics?.[0] ?? {};

    checks.push(
      check(
        "Payload traz scouts necessários",
        ["tackles", "goals", "fouls", "penalty"].every((field) => field in sample),
        Object.keys(sample).join(", ") || "Sem estatísticas retornadas",
      ),
    );
  }

  const report = {
    checkedAt: new Date().toISOString(),
    league: entry?.league ? { id: entry.league.id, name: entry.league.name } : null,
    fixtureId: fixture?.fixture?.id ?? null,
    checks,
    decision: checks.every((item) => item.passed)
      ? "Free plan accepted for the MVP"
      : "Review Pro plan for one month (US$ 19) before implementation",
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.decision.startsWith("Free") ? 0 : 2);
} catch (error) {
  console.error(`API-Football verification failed: ${error.message}`);
  process.exit(1);
}
