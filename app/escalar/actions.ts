"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FORMATIONS = {
  "4-3-3": { ATA: 3, DEF: 4, GOL: 1, MEI: 3 },
  "4-4-2": { ATA: 2, DEF: 4, GOL: 1, MEI: 4 },
  "3-5-2": { ATA: 2, DEF: 3, GOL: 1, MEI: 5 },
} as const;

type Formation = keyof typeof FORMATIONS;
type Position = keyof (typeof FORMATIONS)[Formation];

export async function saveLineup(input: { formation: string; playerIds: number[]; roundId: number }) {
  if (!Number.isInteger(input.roundId) || !(input.formation in FORMATIONS) || !Array.isArray(input.playerIds)) {
    return { error: "Dados da escalação inválidos." };
  }

  const playerIds = [...new Set(input.playerIds)];
  if (playerIds.length !== 11 || playerIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: "Selecione os 11 jogadores antes de salvar." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente para salvar." };

  const now = new Date().toISOString();
  const { data: round } = await supabase
    .from("rodadas")
    .select("id")
    .eq("id", input.roundId)
    .eq("status", "ABERTA")
    .gt("trava_em", now)
    .maybeSingle();
  if (!round) return { error: "A janela de edição desta rodada já foi encerrada." };

  const { data: players, error: playersError } = await supabase
    .from("jogadores")
    .select("id, posicao, preco")
    .eq("ativo", true)
    .in("id", playerIds);
  if (playersError || !players || players.length !== 11) return { error: "Um ou mais jogadores não estão mais disponíveis." };

  const formation = input.formation as Formation;
  const positions = players.reduce<Record<Position, number>>((counts, player) => {
    counts[player.posicao as Position] += 1;
    return counts;
  }, { ATA: 0, DEF: 0, GOL: 0, MEI: 0 });
  const isValidFormation = (Object.keys(FORMATIONS[formation]) as Position[]).every((position) => positions[position] === FORMATIONS[formation][position]);
  const cost = players.reduce((total, player) => total + Number(player.preco), 0);
  if (!isValidFormation) return { error: "Os jogadores não correspondem à formação escolhida." };
  if (cost > 100) return { error: "A escalação ultrapassa o orçamento de C$ 100,00." };

  const { data: team, error: teamError } = await supabase
    .from("times")
    .upsert({ usuario_id: user.id, rodada_id: round.id, formacao: formation, custo: cost, salvo_em: now }, { onConflict: "usuario_id,rodada_id" })
    .select("id")
    .single();
  if (teamError || !team) return { error: "Não foi possível salvar seu time. Tente novamente." };

  const { error: removeError } = await supabase.from("times_jogadores").delete().eq("time_id", team.id);
  if (removeError) return { error: "Não foi possível atualizar os jogadores do time." };

  const { error: insertError } = await supabase.from("times_jogadores").insert(players.map((player) => ({ time_id: team.id, jogador_id: player.id, posicao: player.posicao, preco_pago: player.preco })));
  if (insertError) return { error: "Não foi possível salvar os jogadores do time." };

  revalidatePath("/");
  revalidatePath("/escalar");
  redirect("/?time_salvo=1");
}
