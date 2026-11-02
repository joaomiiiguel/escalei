// @vitest-environment node
import { describe, expect, it } from "vitest";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A } from "./seed";

type Db = Awaited<ReturnType<typeof createMigratedDatabase>>;

async function createRound(db: Db, { numero = 12, status = "AGENDADA", trava = "2026-11-08T19:00:00Z", simulada = false } = {}) {
  const { rows } = await db.query<{ id: number }>(
    "insert into rodadas (temporada, numero, status, trava_em, simulada, rotulo_api) values (2026, $1, $2, $3, $4, $5) returning id",
    [numero, status, trava, simulada, `Regular Season - ${numero}`],
  );
  return rows[0].id;
}

const notices = async (db: Db) =>
  (await db.query<{ tipo: string; mensagem: string }>("select tipo, mensagem from avisos_whatsapp order by id")).rows;

describe("avisos do grupo do WhatsApp", () => {
  it("enfileira uma mensagem a cada mudança de status da rodada real", async () => {
    const db = await createMigratedDatabase();
    const id = await createRound(db);

    for (const status of ["ABERTA", "EM_ANDAMENTO", "FECHADA"]) {
      await db.query("update rodadas set status = $1 where id = $2", [status, id]);
    }

    expect(await notices(db)).toEqual([
      { tipo: "MERCADO_ABERTO", mensagem: "🟢 Acorda, cabeça de bagre! O mercado da rodada 12 abriu.\nEscala até 08/11 às 16h00, ou vai culpar o juiz de novo?" },
      { tipo: "MERCADO_FECHADO", mensagem: "🔒 Já era, parceiro! As escalações da rodada 12 travaram.\nSe deixou aquele perna de pau no time, agora é rezar." },
      { tipo: "RODADA_ENCERRADA", mensagem: "🏁 Acabou a rodada 12, professor! Os pontos saíram e o ranking não perdoa.\nVai lá ver quem passou vergonha no grupo." },
    ]);
  }, 60_000);

  it("ignora rodadas simuladas, updates sem mudança de status e repetições", async () => {
    const db = await createMigratedDatabase();
    const simulated = await createRound(db, { numero: 30, simulada: true });
    await db.query("update rodadas set status = 'ABERTA' where id = $1", [simulated]);

    const id = await createRound(db);
    await db.query("update rodadas set trava_em = trava_em + interval '1 hour' where id = $1", [id]);
    expect(await notices(db)).toEqual([]);

    await db.query("update rodadas set status = 'ABERTA' where id = $1", [id]);
    await db.query("update rodadas set status = 'AGENDADA' where id = $1", [id]);
    await db.query("update rodadas set status = 'ABERTA' where id = $1", [id]);
    expect(await notices(db)).toHaveLength(1);
  }, 60_000);

  it("avisa uma vez quando falta até 1 h para a trava da rodada aberta", async () => {
    const db = await createMigratedDatabase();
    await createRound(db, { numero: 1, status: "ABERTA", trava: new Date(Date.now() + 30 * 60_000).toISOString() });
    await createRound(db, { numero: 2, status: "ABERTA", trava: new Date(Date.now() + 2 * 3_600_000).toISOString() });
    await createRound(db, { numero: 3, status: "ABERTA", trava: new Date(Date.now() - 60_000).toISOString() });
    await createRound(db, { numero: 4, status: "AGENDADA", trava: new Date(Date.now() + 30 * 60_000).toISOString() });
    await createRound(db, { numero: 5, status: "ABERTA", trava: new Date(Date.now() + 30 * 60_000).toISOString(), simulada: true });

    const first = await db.query<{ total: number }>("select fn_enfileirar_aviso_fechamento() as total");
    const second = await db.query<{ total: number }>("select fn_enfileirar_aviso_fechamento() as total");

    expect([first.rows[0].total, second.rows[0].total]).toEqual([1, 0]);
    const [notice] = await notices(db);
    expect(notice.tipo).toBe("FALTA_1H");
    expect(notice.mensagem).toMatch(/^⏰ Falta 1 hora, craque de várzea! O mercado da rodada 1 fecha às \d{2}h\d{2}\./);
  }, 60_000);

  it("fica fora do alcance dos usuários e agenda o envio a cada 2 minutos", async () => {
    const db = await createMigratedDatabase();
    for (const statement of ["select * from avisos_whatsapp", "select * from push_inscricoes", "select fn_enfileirar_aviso_fechamento()"]) {
      await expect(asUser(db, USER_A, (tx) => tx.query(statement))).rejects.toThrow(/permission denied/);
    }
    const { rows } = await db.query<{ schedule: string; active: boolean }>("select schedule, active from cron.job where jobname = 'notificar-avisos-whatsapp'");
    expect(rows).toEqual([{ schedule: "*/2 * * * *", active: true }]);
  }, 60_000);
});
