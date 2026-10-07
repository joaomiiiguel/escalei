import { redirect } from "next/navigation";
import { Layers3, LogOut, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createGroup, signOut } from "./actions";
import { Button } from "@/components/shadcn/button";
import { GroupCreateForm } from "./group-create-form";
import { InviteLink } from "./invite-link";

type Group = {
  id: string;
  nome: string;
  icone: string;
  temporada: number;
  token_convite: string;
  criada_em: string;
  ligas_membros: { count: number }[];
};

export default async function AdminGroups({ searchParams }: { searchParams: Promise<{ criado?: string; convite?: string; erro?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: admin } = await supabase.from("administradores").select("usuario_id").eq("usuario_id", user.id).maybeSingle();
  if (!admin) redirect("/");

  const [{ data: groups }, { data: profile }, params] = await Promise.all([
    supabase.from("ligas").select("id, nome, icone, temporada, token_convite, criada_em, ligas_membros(count)").is("arquivada_em", null).order("criada_em", { ascending: false }),
    supabase.from("perfis").select("apelido").eq("id", user.id).maybeSingle(),
    searchParams,
  ]);
  const activeGroups = (groups ?? []) as Group[];
  const participantCount = activeGroups.reduce((total, group) => total + (group.ligas_membros[0]?.count ?? 0), 0);

  return <main className="!w-full bg-[#f8faf7] p-6 font-sans text-[#102117] lg:grid lg:grid-cols-[276px_minmax(0,1fr)] lg:gap-0 lg:p-0">
    <aside className="hidden min-h-dvh border-r border-foreground bg-white p-6 lg:flex lg:flex-col">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-[10px] bg-success font-black text-white">E</span><div><p className="m-0 text-lg font-extrabold">escalei</p><p className="m-0 text-xs font-semibold text-[#637469]">Administração</p></div></div>
      <nav className="mt-8 grid gap-1 text-sm font-bold"><span className="rounded-lg bg-[#ddf7e8] px-3 py-2.5 text-[#102117]">Grupos</span><span className="px-3 py-2.5 text-[#637469]">Participantes</span><span className="px-3 py-2.5 text-[#637469]">Convites</span><span className="px-3 py-2.5 text-[#637469]">Configurações</span></nav>
      <div className="mt-auto grid gap-3"><div className="flex items-center gap-3 rounded-lg border border-foreground bg-[#f1f5f2] p-3"><span className="grid size-9 place-items-center rounded-full bg-[#ddf7e8] text-xs font-extrabold text-success">{profile?.apelido?.slice(0, 2).toUpperCase() ?? "AD"}</span><div><p className="m-0 text-sm font-bold">{profile?.apelido ?? "Administrador"}</p><p className="m-0 text-xs text-[#637469]">Admin</p></div></div><form action={signOut}><Button type="submit" variant="outline" className="h-10 w-full border-foreground text-[#48594e] hover:bg-[#f1f5f2]"><LogOut aria-hidden="true" />Sair</Button></form></div>
    </aside>
    <section className="min-w-0 p-0 lg:p-7">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-foreground pb-6"><div><p className="m-0 text-[26px] font-extrabold tracking-tight">Grupos e gestores</p><p className="m-1 text-sm font-medium text-[#637469]">Administração de grupos, participantes e convites.</p></div><form action={signOut} className="lg:hidden"><Button type="submit" variant="outline" className="h-10 border-foreground text-[#48594e] hover:bg-[#f1f5f2]"><LogOut aria-hidden="true" />Sair</Button></form></header>
      {params.erro && <p role="alert" className="mb-4 rounded-lg border border-[#f2caca] bg-[#fff5f5] p-3 text-sm text-[#9f3030]">Não foi possível criar o grupo. Revise os dados e tente novamente.</p>}
      {params.criado && params.convite && <section className="mb-4 rounded-lg border border-[#a7dcb8] bg-[#edfff2] p-4"><p className="m-0 mb-2 text-sm font-bold text-success">Grupo criado. Compartilhe este link com os participantes:</p><InviteLink token={params.convite} /></section>}
      <GroupCreateForm action={createGroup} />
      <section className="mt-6 grid gap-4 sm:grid-cols-2"><article className="rounded-lg border border-foreground bg-white p-5"><Layers3 aria-hidden="true" className="mb-3 size-5 text-success" /><p className="m-0 text-sm font-semibold text-[#637469]">Grupos ativos</p><strong className="text-3xl">{activeGroups.length}</strong></article><article className="rounded-lg border border-foreground bg-white p-5"><UsersRound aria-hidden="true" className="mb-3 size-5 text-success" /><p className="m-0 text-sm font-semibold text-[#637469]">Participantes</p><strong className="text-3xl">{participantCount}</strong></article></section>
      <section className="mt-6 overflow-x-auto rounded-lg border border-foreground bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-foreground bg-[#f1f5f2] text-[#637469]"><tr><th className="px-5 py-3 font-semibold">Grupo</th><th className="px-5 py-3 font-semibold">Temporada</th><th className="px-5 py-3 font-semibold">Participantes</th><th className="px-5 py-3 font-semibold">Link de convite</th></tr></thead><tbody>{activeGroups.length > 0 ? activeGroups.map((group) => <tr key={group.id} className="border-b border-[#edf1ee] last:border-0"><td className="px-5 py-4 font-bold"><span className="mr-2">{group.icone}</span>{group.nome}</td><td className="px-5 py-4">{group.temporada}</td><td className="px-5 py-4">{group.ligas_membros[0]?.count ?? 0}</td><td className="max-w-[360px] px-5 py-3"><InviteLink token={group.token_convite} /></td></tr>) : <tr><td colSpan={4} className="px-5 py-10 text-center text-[#637469]">Nenhum grupo ativo ainda.</td></tr>}</tbody></table></section>
    </section>
  </main>;
}
