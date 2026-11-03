import { NextResponse } from "next/server";
import { getCurrentRound } from "@/lib/current-round";
import { getLateLineupState } from "@/lib/late-lineup";
import { parseAvailability } from "@/lib/player-availability";
import { LAST_GAMES_WINDOW, lastGameByClub, lastGameRoles } from "@/lib/player-role";
import { createClient } from "@/lib/supabase/server";
import type { StatusRodada } from "@/lib/types";

const positions = ["GOL", "DEF", "MEI", "ATA"] as const;

/** Sem leitura dos jogos, o mercado continua funcionando e mostra "sem dados". */
async function loadLastGameRoles(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: games } = await supabase
    .from("jogos")
    .select("id, clube_casa_id, clube_fora_id")
    .eq("status", "ENCERRADO")
    .order("inicio_em", { ascending: false })
    .limit(LAST_GAMES_WINDOW);
  const lastGames = lastGameByClub(games ?? []);
  if (lastGames.size === 0) return lastGameRoles(lastGames, []);

  const { data: stats } = await supabase
    .from("estatisticas_jogador")
    .select("jogo_id, jogador_id, clube_id, substituto")
    .in("jogo_id", [...new Set(lastGames.values())]);
  return lastGameRoles(lastGames, stats ?? []);
}

export async function GET(request: Request) {
  const position = new URL(request.url).searchParams.get("posicao");
  if (!position || !positions.includes(position as (typeof positions)[number])) {
    return NextResponse.json({ error: "Posição inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data, error }, roles, lateLineup] = await Promise.all([
    supabase
      .from("jogadores")
      .select("id, clube_id, nome, nome_exibicao, posicao, preco, status, status_motivo, clubes(nome, sigla, logo_url)")
      .eq("ativo", true)
      .eq("posicao", position)
      .order("nome_exibicao")
      .limit(300),
    loadLastGameRoles(supabase),
    getCurrentRound<{ id: number; numero: number; status: StatusRodada; trava_em: string }>(supabase, "id, numero, status, trava_em")
      .then(({ data: round }) => getLateLineupState(supabase, round)),
  ]);

  if (error) {
    return NextResponse.json({ error: "Não foi possível carregar os jogadores." }, { status: 500 });
  }

  // Na escalação tardia, jogadores de times que já entraram em campo saem do mercado.
  const players = (data ?? []).filter((player) => !lateLineup.startedClubIds.has(player.clube_id)).map((player) => {
    const clubes = player.clubes as unknown as { nome: string; sigla: string; logo_url: string | null } | { nome: string; sigla: string; logo_url: string | null }[] | null;
    const clube = Array.isArray(clubes) ? clubes[0] : clubes;

    return {
      id: player.id,
      name: player.nome_exibicao || player.nome,
      club: clube?.sigla ?? "—",
      clubName: clube?.nome ?? "Clube não disponível",
      logoUrl: clube?.logo_url ?? null,
      position: player.posicao,
      price: Number(player.preco),
      status: parseAvailability(player.status),
      statusReason: player.status_motivo ?? null,
      lastGameRole: roles.get(player.clube_id)?.get(player.id) ?? null,
    };
  });

  return NextResponse.json({ players });
}
