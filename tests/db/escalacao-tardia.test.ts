// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { createMigratedDatabase } from "./supabase-pglite";
import { USER_A, USER_B, lineup433, seedCatalog, seedRound, seedUser } from "./seed";

let db: PGlite;
let roundId: number;

/** Salva confirmando a transação, para o time e o passe consumido continuarem lá. */
async function save(userId: string, players = lineup433()) {
  await db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await tx.query("select fn_salvar_escalacao($1, '4-3-3'::formacao, $2)", [roundId, players]);
  });
}

/** Quatro jogos: 1×2, 3×4, 5×6 e 7×8, todos a jogar daqui a 2 h. O catálogo usa só os clubes 1 e 2. */
async function seedGames() {
  await db.exec("insert into clubes (id, nome, sigla) select n, 'Clube ' || n, 'C' || lpad(n::text, 2, '0') from generate_series(3, 8) as n");
  for (const [index, [home, away]] of [[1, 2], [3, 4], [5, 6], [7, 8]].entries()) {
    await db.query(
      "insert into jogos (id, rodada_id, clube_casa_id, clube_fora_id, inicio_em, status) values ($1, $2, $3, $4, now() + interval '2 hours', 'A_JOGAR')",
      [index + 1, roundId, home, away],
    );
  }
}

const setGame = (id: number, status: string, inicio = "2 hours") =>
  db.query("update jogos set status = $2::status_jogo, inicio_em = now() + $3::interval where id = $1", [id, status, inicio]);

async function lateOpen(): Promise<boolean> {
  const result = await db.query<{ aberta: boolean }>("select fn_escalacao_tardia_aberta($1) as aberta", [roundId]);
  return result.rows[0].aberta;
}

async function remaining(userId: string): Promise<number> {
  const result = await db.query<{ total: number }>("select coalesce(sum(restantes), 0)::int as total from passes_lotes where usuario_id = $1", [userId]);
  return result.rows[0].total;
}

describe("escalação depois da trava", () => {
  beforeEach(async () => {
    db = await createMigratedDatabase();
    await seedCatalog(db);
    await seedUser(db, USER_A, "usuario_a");
    await seedUser(db, USER_B, "usuario_b");
    roundId = await seedRound(db, 1, "EM_ANDAMENTO", "-1 minute");
    await seedGames();
  }, 60_000);

  it("fica aberta enquanto menos da metade dos jogos começou", async () => {
    expect(await lateOpen()).toBe(true);
    await setGame(2, "ENCERRADO", "-3 hours");
    expect(await lateOpen()).toBe(true);
    await setGame(3, "EM_ANDAMENTO", "-10 minutes");
    expect(await lateOpen()).toBe(false);
  }, 60_000);

  it("conta como iniciado o jogo cujo horário passou, mesmo sem o status atualizado", async () => {
    await setGame(2, "A_JOGAR", "-5 minutes");
    await setGame(3, "A_JOGAR", "-1 minute");
    expect(await lateOpen()).toBe(false);
  }, 60_000);

  it("não abre antes da trava, em rodada fechada ou sem jogos", async () => {
    await db.query("update rodadas set status = 'FECHADA' where id = $1", [roundId]);
    expect(await lateOpen()).toBe(false);
    await db.query("update rodadas set status = 'ABERTA', trava_em = now() + interval '1 hour' where id = $1", [roundId]);
    expect(await lateOpen()).toBe(false);
    await db.query("update rodadas set trava_em = now() - interval '1 minute' where id = $1", [roundId]);
    await db.query("delete from jogos where rodada_id = $1", [roundId]);
    expect(await lateOpen()).toBe(false);
  }, 60_000);

  it("salva o time de quem ainda não escalou com jogadores de jogos que não começaram", async () => {
    await setGame(2, "EM_ANDAMENTO", "-10 minutes");
    await save(USER_A);
    const team = await db.query<{ jogadores: number }>(
      "select (select count(*)::int from times_jogadores where time_id = times.id) as jogadores from times where usuario_id = $1 and rodada_id = $2",
      [USER_A, roundId],
    );
    expect(team.rows[0].jogadores).toBe(11);
  }, 60_000);

  it("recusa jogadores de times que já entraram em campo", async () => {
    await db.query("update jogadores set clube_id = 3 where id = 1");
    await setGame(2, "EM_ANDAMENTO", "-10 minutes");
    await expect(save(USER_A)).rejects.toMatchObject({ code: "ES422", message: "Troque os jogadores de times que já entraram em campo: J1." });
  }, 60_000);

  it("recusa quando metade dos jogos já começou", async () => {
    await setGame(1, "ENCERRADO", "-3 hours");
    await setGame(2, "EM_ANDAMENTO", "-10 minutes");
    await db.query("update jogadores set clube_id = 5 where clube_id in (1, 2)");
    await expect(save(USER_A)).rejects.toMatchObject({ code: "ES423", message: "A janela de edição desta rodada já foi encerrada." });
  }, 60_000);

  it("não deixa alterar o time de quem já tinha escalado antes da trava", async () => {
    await db.query("update rodadas set status = 'ABERTA', trava_em = now() + interval '1 hour' where id = $1", [roundId]);
    await save(USER_A);
    await db.query("update rodadas set status = 'EM_ANDAMENTO', trava_em = now() - interval '1 minute' where id = $1", [roundId]);
    await expect(save(USER_A)).rejects.toMatchObject({ code: "ES423", message: "Seu time já está travado nesta rodada." });
  }, 60_000);

  it("não deixa salvar duas vezes na janela tardia", async () => {
    await save(USER_A);
    await expect(save(USER_A)).rejects.toMatchObject({ code: "ES423", message: "Seu time já está travado nesta rodada." });
  }, 60_000);

  it("consome o passe no salvamento tardio, uma vez só", async () => {
    await db.query("update configuracoes set valor = 'true' where chave = 'passes_obrigatorios'");
    const before = await remaining(USER_A);
    await save(USER_A);
    expect(await remaining(USER_A)).toBe(before - 1);

    const consumed = await db.query<{ total: number }>("select fn_consumir_passes_rodada($1) as total", [roundId]);
    expect(consumed.rows[0].total).toBe(0);
    expect(await remaining(USER_A)).toBe(before - 1);
  }, 60_000);

  it("exige passe na escalação tardia quando a chave está ligada", async () => {
    await db.query("update configuracoes set valor = 'true' where chave = 'passes_obrigatorios'");
    await db.query("update passes_lotes set restantes = 0 where usuario_id = $1", [USER_B]);
    await expect(save(USER_B)).rejects.toMatchObject({ code: "ES402" });
  }, 60_000);

  it("continua bloqueando a escrita direta em times depois da trava", async () => {
    await expect(db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [USER_A]);
      await tx.query("insert into times (usuario_id, rodada_id, formacao) values ($1, $2, '4-3-3')", [USER_A, roundId]);
    })).rejects.toThrow();
  }, 60_000);

  it("não deixa o usuário consumir passes chamando a função interna", async () => {
    await expect(db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [USER_A]);
      await tx.query("select fn_consumir_passe_tardio($1, $2)", [USER_A, roundId]);
    })).rejects.toThrow();
  }, 60_000);
});
