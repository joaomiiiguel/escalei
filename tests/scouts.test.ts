import { describe, expect, it } from "vitest";
import { buildScouts, type ApiEvent, type ApiPlayerGroup } from "@/supabase/functions/_shared/scouts";
import players from "./fixtures/api-football/fixture-1001-players.json";
import events from "./fixtures/api-football/fixture-1001-events.json";

/** Ids locais dos jogadores das fixtures (o 9999 fica fora do catálogo de propósito). */
export const LOCAL_PLAYER_IDS = new Map([[9001, 101], [9002, 102], [9003, 103], [9004, 104], [9005, 105], [9006, 106]]);
export const LOCAL_CLUB_IDS = new Map([[100, 1], [200, 2]]);
export const GAME = { id: 1001, rodada_id: 1, clube_casa_id: 1, clube_fora_id: 2, gols_casa: 3, gols_fora: 0 };

function scouts(conferencia = false) {
  return buildScouts({
    jogo: GAME,
    playerGroups: players.response as ApiPlayerGroup[],
    events: events.response as ApiEvent[],
    jogadorIdByApiId: LOCAL_PLAYER_IDS,
    clubeIdByApiId: LOCAL_CLUB_IDS,
    conferencia,
    lidoEm: "2026-10-25T21:00:00.000Z",
  });
}

const byPlayer = (id: number) => scouts().find((row) => row.jogador_id === id)!;

describe("scouts a partir da API-Football", () => {
  it("ignora jogadores fora do catálogo local", () => {
    expect(scouts().map((row) => row.jogador_id)).toEqual([101, 102, 103, 104, 105, 106]);
  });

  it("converte valores nulos em zero", () => {
    expect(byPlayer(103)).toMatchObject({ minutos: 30, gols: 0, desarmes: 0, amarelos: 0, defesas: 0, nota_api: null, substituto: true });
  });

  it("lê gols, cartões, finalizações e defesas", () => {
    expect(byPlayer(101)).toMatchObject({ defesas: 3, gols_sofridos: 0, posicao_jogo: "G" });
    expect(byPlayer(102)).toMatchObject({ gols: 1, desarmes: 2, amarelos: 1 });
    expect(byPlayer(104)).toMatchObject({ gols: 1, finalizacoes: 4, finalizacoes_no_gol: 2, impedimentos: 1 });
    expect(byPlayer(105)).toMatchObject({ vermelhos: 1, faltas_cometidas: 2 });
  });

  it("conta gol contra pelos eventos", () => {
    expect(byPlayer(105).gols_contra).toBe(1);
    expect(byPlayer(102).gols_contra).toBe(0);
  });

  it("dá clean sheet só a quem jogou 60 minutos ou mais sem o adversário marcar", () => {
    expect(byPlayer(101).sem_sofrer_gol).toBe(true);
    expect(byPlayer(102).sem_sofrer_gol).toBe(true);
    expect(byPlayer(103).sem_sofrer_gol).toBe(false);
    expect(byPlayer(105).sem_sofrer_gol).toBe(false);
  });

  it("marca a versão da leitura para a conferência", () => {
    expect(scouts(false)[0].versao_leitura).toBe(1);
    expect(scouts(true)[0].versao_leitura).toBe(2);
  });
});
