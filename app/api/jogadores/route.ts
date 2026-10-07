import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const positions = ["GOL", "DEF", "MEI", "ATA"] as const;

export async function GET(request: Request) {
  const position = new URL(request.url).searchParams.get("posicao");
  if (!position || !positions.includes(position as (typeof positions)[number])) {
    return NextResponse.json({ error: "Posição inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jogadores")
    .select("id, nome, nome_exibicao, posicao, preco, clubes(nome, sigla, logo_url)")
    .eq("ativo", true)
    .eq("posicao", position)
    .order("nome_exibicao")
    .limit(300);

  if (error) {
    return NextResponse.json({ error: "Não foi possível carregar os jogadores." }, { status: 500 });
  }

  const players = (data ?? []).map((player) => {
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
    };
  });

  return NextResponse.json({ players });
}
