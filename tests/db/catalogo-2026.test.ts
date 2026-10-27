// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildClubs, buildPlayers, scoringWeights, type ApiPlayer, type ApiTeam } from "@/supabase/functions/_shared/catalog";
import teams from "../fixtures/api-football/2026/teams.json";
import playersPage from "../fixtures/api-football/2026/players-page-1.json";
import { createMigratedDatabase } from "./supabase-pglite";

describe("catálogo 2026 gravado no banco", () => {
  it("aceita os clubes e jogadores reais montados pela sincronização", async () => {
    const db = await createMigratedDatabase();
    const now = new Date().toISOString();
    const clubs = buildClubs(teams.response as ApiTeam[], [], now);
    for (const club of clubs) {
      await db.query("insert into clubes (id, api_football_id, nome, sigla, logo_url, ativo, api_atualizado_em) values ($1, $2, $3, $4, $5, $6, $7)", [club.id, club.api_football_id, club.nome, club.sigla, club.logo_url, club.ativo, club.api_atualizado_em]);
    }
    const weights = scoringWeights((await db.query<{ scout: string; posicao: string; pontos: string }>("select scout, posicao, pontos from tabela_pontuacao where versao = 1")).rows);
    const clubIdByApiId = new Map(clubs.map((club) => [club.api_football_id, club.id]));
    // Inclui um jogador com média negativa (só cartões e faltas) para exercitar as constraints.
    const entries = [...(playersPage.response as ApiPlayer[]), {
      player: { id: 999_001, name: "Volante Faltoso" },
      statistics: [{ team: { id: teams.response[0].team.id }, league: { id: 71 }, games: { appearences: 2, position: "Midfielder" }, fouls: { committed: 10 }, cards: { yellow: 2, red: 1 } }],
    }];
    const players = buildPlayers(entries, { leagueId: 71, clubIdByApiId, saved: [], weights, now });
    for (const player of players) {
      const columns = Object.keys(player);
      await db.query(`insert into jogadores (${columns.join(", ")}) values (${columns.map((_, index) => `$${index + 1}`).join(", ")})`, Object.values(player));
    }
    const stored = await db.query<{ n: number; min_preco: string; min_media: string }>("select count(*)::int as n, min(preco) as min_preco, min(media_temporada) as min_media from jogadores");
    expect(stored.rows[0]).toEqual({ n: players.length, min_preco: "2.00", min_media: "0.00" });
  }, 60_000);
});
