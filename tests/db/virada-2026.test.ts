// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { applyMigration, createMigratedDatabase } from "./supabase-pglite";
import { USER_A, USER_B, seedCatalog, seedRound, seedUser } from "./seed";

const VIRADA = "20261027210000_virada_temporada_2026.sql";
const count = async (db: PGlite, sql: string, params: unknown[] = []) => Number((await db.query<{ n: number }>(`select count(*)::int as n from ${sql}`, params)).rows[0].n);

describe("virada para o Brasileirão 2026", () => {
  let db: PGlite;
  let simulatedRound: number;
  let realRound: number;

  beforeAll(async () => {
    db = await createMigratedDatabase({ before: VIRADA });
    await seedCatalog(db);
    await seedUser(db, USER_A, "ana");
    await seedUser(db, USER_B, "bruno");

    // Simulação de 2024: rodada, jogo, scouts, time, ranking, preço e rendimento.
    simulatedRound = await seedRound(db, 31, "ABERTA", "-3 days", 2024);
    await db.query("update rodadas set simulada = true where id = $1", [simulatedRound]);
    realRound = await seedRound(db, 33, "ABERTA", "1 day", 2026);
    await db.query("insert into jogos (id, rodada_id, clube_casa_id, clube_fora_id, inicio_em, status) values (900, $1, 1, 2, now() - interval '3 days', 'ENCERRADO'), (901, $2, 1, 2, now() + interval '1 day', 'A_JOGAR')", [simulatedRound, realRound]);
    await db.query("insert into estatisticas_jogador (jogo_id, jogador_id, rodada_id, clube_id, minutos) values (900, 1, $1, 2, 90)", [simulatedRound]);
    const team = await db.query<{ id: string }>("insert into times (usuario_id, rodada_id, formacao, custo) values ($1, $2, '4-3-3', 50) returning id", [USER_A, simulatedRound]);
    await db.query("insert into times_jogadores (time_id, jogador_id, posicao, preco_pago) values ($1, 1, 'GOL', 5)", [team.rows[0].id]);
    await db.query("insert into ranking_rodada (rodada_id, usuario_id, pontos, posicao) values ($1, $2, 12, 1)", [simulatedRound, USER_A]);
    await db.query("insert into historico_precos (jogador_id, rodada_id, preco, variacao) values (1, $1, 5, 0)", [simulatedRound]);
    await db.query("insert into movimentacoes_saldo (usuario_id, rodada_id, time_id, tipo, valor, saldo_antes, saldo_depois) values ($1, $2, $3, 'RENDIMENTO', 12.2, 60, 72.2)", [USER_A, simulatedRound, team.rows[0].id]);
    await db.query("update carteiras set saldo = 72.20 where usuario_id = $1", [USER_A]);
    await db.query("update carteiras set saldo = 55.30 where usuario_id = $1", [USER_B]);
    await db.query("insert into configuracoes (chave, valor) values ('rodada_simulada_atual', '31') on conflict (chave) do update set valor = excluded.valor");

    for (const [codigo, temporada, arquivada] of [["AAAAAAAA", 2024, false], ["BBBBBBBB", 2026, false], ["CCCCCCCC", 2099, false], ["DDDDDDDD", 2024, true]] as const) {
      await db.query("insert into ligas (nome, dono_id, codigo_convite, temporada, arquivada_em) values ($1, $2, $3, $4, $5)", [`Grupo ${codigo}`, USER_A, codigo, temporada, arquivada ? new Date().toISOString() : null]);
    }

    await applyMigration(db, VIRADA);
  }, 60_000);

  it("apaga a simulação e tudo que depende dela", async () => {
    expect(await count(db, "rodadas where simulada")).toBe(0);
    expect(await count(db, "jogos where id = 900")).toBe(0);
    expect(await count(db, "estatisticas_jogador")).toBe(0);
    expect(await count(db, "times")).toBe(0);
    expect(await count(db, "times_jogadores")).toBe(0);
    expect(await count(db, "ranking_rodada")).toBe(0);
    expect(await count(db, "historico_precos")).toBe(0);
    expect(await count(db, "movimentacoes_saldo where tipo = 'RENDIMENTO'")).toBe(0);
    expect(await count(db, "configuracoes where chave = 'rodada_simulada_atual'")).toBe(0);
  });

  it("mantém as rodadas reais e o catálogo", async () => {
    expect(await count(db, "rodadas where id = $1", [realRound])).toBe(1);
    expect(await count(db, "jogos where id = 901")).toBe(1);
    expect(await count(db, "jogadores")).toBe(24);
  });

  it("volta todos os saldos para C$ 60 com movimentação auditável", async () => {
    const wallets = await db.query<{ usuario_id: string; saldo: string }>("select usuario_id, saldo from carteiras order by usuario_id");
    expect(wallets.rows).toEqual([{ usuario_id: USER_A, saldo: "60.00" }, { usuario_id: USER_B, saldo: "60.00" }]);
    const adjustments = await db.query("select usuario_id, valor, saldo_antes, saldo_depois from movimentacoes_saldo where tipo = 'AJUSTE_TEMPORADA_2026' order by usuario_id");
    expect(adjustments.rows).toEqual([
      { usuario_id: USER_A, valor: "-12.20", saldo_antes: "72.20", saldo_depois: "60.00" },
      { usuario_id: USER_B, valor: "4.70", saldo_antes: "55.30", saldo_depois: "60.00" },
    ]);
  });

  it("passa os grupos ativos para 2026 e deixa de fora o grupo de teste e os arquivados", async () => {
    const leagues = await db.query<{ codigo_convite: string; temporada: number }>("select codigo_convite, temporada from ligas order by codigo_convite");
    expect(leagues.rows).toEqual([
      { codigo_convite: "AAAAAAAA", temporada: 2026 },
      { codigo_convite: "BBBBBBBB", temporada: 2026 },
      { codigo_convite: "CCCCCCCC", temporada: 2099 },
      { codigo_convite: "DDDDDDDD", temporada: 2024 },
    ]);
  });

  it("registra a temporada e a estreia", async () => {
    const config = await db.query<{ chave: string; valor: number }>("select chave, valor from configuracoes where chave in ('temporada_atual', 'rodada_estreia') order by chave");
    expect(config.rows).toEqual([{ chave: "rodada_estreia", valor: 33 }, { chave: "temporada_atual", valor: 2026 }]);
  });

  it("troca os agendamentos da simulação pelos de produção", async () => {
    const jobs = await db.query<{ jobname: string; schedule: string; active: boolean }>("select jobname, schedule, active from cron.job order by jobname");
    expect(jobs.rows).toEqual([
      { jobname: "avancar-rodada", schedule: "*/2 * * * *", active: true },
      { jobname: "sincronizar-calendario", schedule: "15 */6 * * *", active: true },
      { jobname: "sincronizar-catalogo", schedule: "0 9 * * 1", active: true },
    ]);
  });
});
