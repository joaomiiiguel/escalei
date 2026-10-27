import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildClubs,
  buildPlayers,
  initialPrice,
  leagueStatistic,
  positionFromApi,
  scoringWeights,
  seasonAverage,
  type ApiPlayer,
  type ApiTeam,
} from "@/supabase/functions/_shared/catalog";
import teams from "./fixtures/api-football/2026/teams.json";
import playersPage from "./fixtures/api-football/2026/players-page-1.json";

/** Pesos da versão 1, lidos da própria migration que os publicou. */
const migration = readFileSync(path.resolve(__dirname, "../supabase/migrations/20261012212909_implement_match_scoring.sql"), "utf8");
const weights = scoringWeights([...migration.matchAll(/\(1, '([a-z_]+)', '(GOL|DEF|MEI|ATA)', (-?[\d.]+)\)/g)].map(([, scout, posicao, pontos]) => ({ scout, posicao, pontos })));
const NOW = "2026-10-27T18:00:00.000Z";

describe("clubes da Série A 2026 (resposta real da API)", () => {
  const { clubs } = buildClubs(teams.response as ApiTeam[], [], NOW);

  it("monta os 20 clubes com siglas únicas", () => {
    expect(clubs).toHaveLength(20);
    expect(new Set(clubs.map((club) => club.sigla)).size).toBe(20);
    expect(clubs.find((club) => club.nome === "Coritiba")?.sigla).toBe("CTB");
    expect(clubs.find((club) => club.nome === "Corinthians")?.sigla).toBe("COR");
    expect(clubs.find((club) => club.nome === "Atletico-MG")?.sigla).toBe("CAM");
    expect(clubs.find((club) => club.nome === "Atletico Paranaense")?.sigla).toBe("CAP");
    expect(clubs.find((club) => club.nome === "Mirassol")?.sigla).toBe("MIR");
  });

  it("preserva o id de clubes já cadastrados", () => {
    const flamengo = (teams.response as ApiTeam[]).find((item) => item.team.name === "Flamengo")!;
    const { clubs: result } = buildClubs(teams.response as ApiTeam[], [{ id: 7, sigla: "FLA", api_football_id: flamengo.team.id }], NOW);
    expect(result.find((club) => club.nome === "Flamengo")).toMatchObject({ id: 7, sigla: "FLA" });
  });

  it("libera a sigla oficial presa em um clube antigo fora da temporada", () => {
    const saved = [{ id: 4287, sigla: "REM", api_football_id: null }, { id: 6685, sigla: "SAN", api_football_id: null }, { id: 1, sigla: "X01", api_football_id: null }];
    const { clubs: result, renames } = buildClubs(teams.response as ApiTeam[], saved, NOW);
    expect(result.find((club) => club.nome === "Remo")?.sigla).toBe("REM");
    expect(result.find((club) => club.nome === "Santos")?.sigla).toBe("SAN");
    expect(renames.map((rename) => rename.id).sort()).toEqual([4287, 6685]);
    expect(renames.every((rename) => /^X0[23]$/.test(rename.sigla))).toBe(true);
    expect(new Set(renames.map((rename) => rename.sigla)).size).toBe(2);
  });

  it("não tira a sigla de outro clube da temporada", () => {
    const corinthians = (teams.response as ApiTeam[]).find((item) => item.team.name === "Corinthians")!;
    const { clubs: result, renames } = buildClubs(teams.response as ApiTeam[], [{ id: 131, sigla: "COR", api_football_id: corinthians.team.id }], NOW);
    expect(renames).toEqual([]);
    expect(result.find((club) => club.nome === "Corinthians")?.sigla).toBe("COR");
    expect(result.find((club) => club.nome === "Coritiba")?.sigla).toBe("CTB");
  });
});

describe("jogadores e preço inicial (resposta real da API)", () => {
  const entries = playersPage.response as ApiPlayer[];
  const clubIdByApiId = new Map((teams.response as ApiTeam[]).map((item) => [item.team.id, 1_100_000_000 + item.team.id]));

  it("estima a média com a tabela de pontuação e calcula o preço", () => {
    const carlosVinicius = entries.find((entry) => entry.player.id === 104)!;
    const statistic = leagueStatistic(carlosVinicius, 71)!;
    // 11 gols, 1 assistência, 15 finalizações no gol além dos gols, 12 para fora, 3 desarmes,
    // 33 faltas sofridas, 35 cometidas e 5 amarelos em 31 jogos → 126,1 / 31.
    expect(seasonAverage(statistic, "ATA", weights)).toBe(4.07);
    expect(initialPrice(4.07)).toBe(7.1);
  });

  it("aplica os limites de preço e o preço padrão sem jogos", () => {
    expect(initialPrice(null)).toBe(5);
    expect(initialPrice(-5)).toBe(2);
    expect(initialPrice(40)).toBe(20);
  });

  it("monta os jogadores com clube, posição e preço dentro das regras", () => {
    const players = buildPlayers(entries, { leagueId: 71, clubIdByApiId, saved: [{ id: 5, api_football_id: 104 }], weights, now: NOW });
    expect(players.length).toBeGreaterThan(15);
    expect(players.every((player) => player.preco >= 2 && player.preco <= 20)).toBe(true);
    expect(players.every((player) => ["GOL", "DEF", "MEI", "ATA"].includes(player.posicao))).toBe(true);
    expect(players.find((player) => player.api_football_id === 104)).toMatchObject({ id: 5, posicao: "ATA", preco: 7.1, jogos_temporada: 31 });
  });

  it("converte as posições da API", () => {
    expect(["Goalkeeper", "Defender", "Midfielder", "Attacker", "Coach"].map(positionFromApi)).toEqual(["GOL", "DEF", "MEI", "ATA", null]);
  });
});
