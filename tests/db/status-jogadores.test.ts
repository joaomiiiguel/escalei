// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildClubs, buildPlayers, scoringWeights, type ApiPlayer, type ApiTeam } from "@/supabase/functions/_shared/catalog";
import teams from "../fixtures/api-football/2026/teams.json";
import playersPage from "../fixtures/api-football/2026/players-page-1.json";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A } from "./seed";

async function seedCatalog() {
  const db = await createMigratedDatabase();
  const now = new Date().toISOString();
  const { clubs } = buildClubs(teams.response as ApiTeam[], [], now);
  for (const club of clubs) {
    await db.query("insert into clubes (id, api_football_id, nome, sigla, logo_url, ativo, api_atualizado_em) values ($1, $2, $3, $4, $5, $6, $7)", [club.id, club.api_football_id, club.nome, club.sigla, club.logo_url, club.ativo, club.api_atualizado_em]);
  }
  const weights = scoringWeights((await db.query<{ scout: string; posicao: string; pontos: string }>("select scout, posicao, pontos from tabela_pontuacao where versao = 1")).rows);
  const players = buildPlayers(playersPage.response as ApiPlayer[], { leagueId: 71, clubIdByApiId: new Map(clubs.map((club) => [club.api_football_id, club.id])), saved: [], weights, now });
  for (const player of players) {
    const columns = Object.keys(player);
    await db.query(`insert into jogadores (${columns.join(", ")}) values (${columns.map((_, index) => `$${index + 1}`).join(", ")})`, Object.values(player));
  }
  return { db, apiIds: players.map((player) => player.api_football_id as number) };
}

const statusOf = async (db: Awaited<ReturnType<typeof seedCatalog>>["db"], apiId: number) =>
  (await db.query<{ status: string; status_motivo: string | null }>("select status, status_motivo from jogadores where api_football_id = $1", [apiId])).rows[0];

describe("fn_aplicar_status_jogadores", () => {
  it("grava os desfalques e devolve a Provável quem saiu da lista", async () => {
    const { db, apiIds } = await seedCatalog();
    const [lesionado, suspenso, duvida, recuperado] = apiIds;
    await db.query("update jogadores set status = 'LESIONADO', status_motivo = 'Lesão' where api_football_id = $1", [recuperado]);

    const lista = [
      { api_football_id: lesionado, status: "LESIONADO", motivo: "Lesão muscular" },
      { api_football_id: suspenso, status: "SUSPENSO", motivo: "Expulso" },
      { api_football_id: duvida, status: "DUVIDA", motivo: "Inativo" },
      { api_football_id: 999_999_999, status: "LESIONADO", motivo: "Fora do catálogo" },
    ];
    const first = await db.query<{ alterados: number }>("select fn_aplicar_status_jogadores($1::jsonb) as alterados", [JSON.stringify(lista)]);
    expect(first.rows[0].alterados).toBe(4);
    expect(await statusOf(db, lesionado)).toEqual({ status: "LESIONADO", status_motivo: "Lesão muscular" });
    expect(await statusOf(db, suspenso)).toEqual({ status: "SUSPENSO", status_motivo: "Expulso" });
    expect(await statusOf(db, duvida)).toEqual({ status: "DUVIDA", status_motivo: "Inativo" });
    expect(await statusOf(db, recuperado)).toEqual({ status: "PROVAVEL", status_motivo: null });

    const again = await db.query<{ alterados: number }>("select fn_aplicar_status_jogadores($1::jsonb) as alterados", [JSON.stringify(lista)]);
    expect(again.rows[0].alterados).toBe(0);

    const cleared = await db.query<{ alterados: number }>("select fn_aplicar_status_jogadores('[]'::jsonb) as alterados");
    expect(cleared.rows[0].alterados).toBe(3);
    const counts = await db.query<{ n: number }>("select count(*)::int as n from jogadores where status <> 'PROVAVEL' or status_motivo is not null");
    expect(counts.rows[0].n).toBe(0);
  }, 60_000);

  it("recusa entrada inválida e não pode ser chamada por usuários", async () => {
    const { db } = await seedCatalog();
    await expect(db.query("select fn_aplicar_status_jogadores('{}'::jsonb)")).rejects.toThrow(/lista/);
    await expect(db.query(`select fn_aplicar_status_jogadores('[{"api_football_id": 1, "status": "MACHUCADO"}]'::jsonb)`)).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => tx.query("select fn_aplicar_status_jogadores('[]'::jsonb)"))).rejects.toThrow(/permission denied/);
  }, 60_000);
});
