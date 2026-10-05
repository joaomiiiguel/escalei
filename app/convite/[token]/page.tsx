import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { createClient } from "@/lib/supabase/server";
import { getActiveInvite, isInviteToken } from "@/lib/invites";
import { acceptInvite } from "./actions";

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { token } = await params;
  const query = await searchParams;
  const invite = isInviteToken(token) ? await getActiveInvite(token) : false;
  if (!invite) return <main className="mx-auto grid min-h-dvh max-w-[490px] place-items-center bg-[#0f1710] p-6 text-center text-[#f3f5f4]"><section><p className="text-sm font-extrabold tracking-widest text-[#ffcc66]">CONVITE INDISPONÍVEL</p><h1 className="text-3xl font-extrabold">Este link não é válido.</h1><p className="text-[#a0a8af]">Peça um novo convite a quem administra o grupo.</p></section></main>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle() : { data: null };

  if (user && !profile) redirect(`/onboarding?convite=${token}`);

  return <main className="mx-auto grid min-h-dvh content-center gap-6 bg-[#0f1710] px-5 text-center text-[#f3f5f4]">
    <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#2fe06b1f] text-4xl">⚽</span>
    <p className="m-0 text-xs font-extrabold tracking-[1.2px] text-[#2fe06b]">CONVITE DE GRUPO</p>
    <h1 className="m-0 text-3xl font-extrabold">{invite.nome}</h1>
    <p className="m-0 text-[#a0a8af]">Você foi convidado para acompanhar a temporada {invite.temporada} com este grupo.</p>
    <div className="flex items-center justify-center gap-2 text-sm text-[#a0a8af]">
      <UsersRound aria-hidden="true" className="size-4" />Entre com sua conta para participar.
    </div>
    {query.erro && <p role="alert" className="m-0 text-sm text-[#ffc3c3]">Não foi possível entrar neste grupo. Peça um novo convite.</p>}
    {user ? (
      <form action={acceptInvite}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" className="h-[52px] w-full rounded-[14px] bg-[#2fe06b] text-[#06200f] hover:bg-[#49ef7c]">
          Entrar no grupo
        </Button>
      </form>
    ) : (
      <Link href={`/entrar?convite=${token}`}>
        <Button className="h-[52px] w-full rounded-[14px] bg-[#2fe06b] text-[#06200f] hover:bg-[#49ef7c]">
          Entrar para participar
        </Button>
      </Link>
    )}
  </main>;
}
