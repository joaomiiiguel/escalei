import Link from "next/link";
import { ArrowLeft, Crown, UserMinus, UsersRound } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/shadcn/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { addGroupMember, removeGroupMember } from "../../actions";
import { InviteLink } from "../invite-link";

type Group = { id: string; nome: string; icone: string; temporada: number; tipo: string; token_convite: string; codigo_convite: string; criada_em: string; dono_id: string };
type Profile = { id: string; apelido: string; telefone: string | null };
type Member = { usuario_id: string; entrou_em: string; perfis: Profile | Profile[] | null };

function first<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function AdminGroupDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ adicionado?: string; removido?: string; erro?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: adminAccess } = await supabase.from("administradores").select("usuario_id").eq("usuario_id", user.id).maybeSingle();
  if (!adminAccess) redirect("/");

  const admin = createAdminClient();
  const [{ data: groupData }, { data: membersData }, { data: profilesData }] = await Promise.all([
    admin.from("ligas").select("id, nome, icone, temporada, tipo, token_convite, codigo_convite, criada_em, dono_id").eq("id", id).is("arquivada_em", null).maybeSingle(),
    admin.from("ligas_membros").select("usuario_id, entrou_em, perfis!ligas_membros_usuario_id_fkey(id, apelido, telefone)").eq("liga_id", id).order("entrou_em"),
    admin.from("perfis").select("id, apelido, telefone").order("apelido"),
  ]);
  const group = groupData as Group | null;
  if (!group) notFound();
  const members = ((membersData ?? []) as unknown as Member[]).flatMap((member) => {
    const profile = first(member.perfis);
    return profile ? [{ ...member, profile }] : [];
  });
  const memberIds = new Set(members.map((member) => member.usuario_id));
  const availableProfiles = ((profilesData ?? []) as Profile[]).filter((profile) => !memberIds.has(profile.id));
  const createdAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(group.criada_em));
  const errorMessage = query.erro === "dono" ? "O dono do grupo não pode ser removido." : query.erro === "adicionar" ? "Não foi possível adicionar o participante." : query.erro === "remover" ? "Não foi possível remover o participante." : null;

  return <section className="w-full max-w-5xl">
    <Link href="/admin/grupos" className="inline-flex items-center gap-2 text-sm font-bold text-[#48594e] hover:text-success"><ArrowLeft className="size-4" />Voltar para grupos</Link>
    <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-foreground pb-5">
      <div><p className="text-sm font-bold tracking-wide text-[#637469]">GRUPO</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight"><span className="mr-2">{group.icone}</span>{group.nome}</h1><p className="mt-1 text-sm text-[#637469]">Temporada {group.temporada} · {group.tipo === "CONVITE" ? "por convite" : "aberto"} · criado em {createdAt}</p></div>
      <div className="min-w-[260px]"><InviteLink token={group.token_convite} /></div>
    </header>

    {(errorMessage || query.adicionado || query.removido) && <p role="status" className={`mt-5 rounded-lg border p-3 text-sm font-semibold ${errorMessage ? "border-[#f2caca] bg-[#fff5f5] text-[#9f3030]" : "border-[#a7dcb8] bg-[#edfff2] text-success"}`}>{errorMessage ?? (query.adicionado ? "Participante adicionado ao grupo." : "Participante removido do grupo.")}</p>}

    <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
      <article className="overflow-hidden rounded-lg border border-foreground bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-foreground px-5 py-4"><div><h2 className="text-lg font-extrabold">Participantes</h2><p className="text-sm text-[#637469]">{members.length} {members.length === 1 ? "participante" : "participantes"}</p></div><UsersRound className="size-5 text-success" /></header>
        <ul className="divide-y divide-[#edf1ee]">{members.map((member) => <li key={member.usuario_id} className="flex items-center gap-3 px-5 py-4"><span className="grid size-10 place-items-center rounded-full bg-[#ddf7e8] text-xs font-extrabold text-success">{member.profile.apelido.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{member.profile.apelido} {member.usuario_id === group.dono_id && <span className="ml-1 inline-flex items-center gap-1 text-xs text-[#8a6d11]"><Crown className="size-3" />Dono</span>}</p><p className="truncate text-xs text-[#637469]">{member.profile.telefone ?? "Sem telefone"}</p></div>{member.usuario_id !== group.dono_id && <form action={removeGroupMember}><input type="hidden" name="grupo_id" value={group.id} /><input type="hidden" name="usuario_id" value={member.usuario_id} /><Button type="submit" variant="outline" className="h-8 border-0 px-2.5 text-xs text-[#9f3030] hover:bg-[#fff5f5]"><UserMinus className="size-3.5" /></Button></form>}</li>)}</ul>
      </article>

      <aside className="h-fit rounded-lg border border-foreground bg-white p-5 shadow-sm"><h2 className="text-lg font-extrabold">Adicionar participante</h2><p className="mt-1 text-sm leading-5 text-[#637469]">Selecione um perfil cadastrado que ainda não participa deste grupo.</p>{availableProfiles.length > 0 ? <form action={addGroupMember} className="mt-4 grid gap-3"><input type="hidden" name="grupo_id" value={group.id} /><label className="grid gap-1.5 text-sm font-bold">Participante fora do grupo<select name="usuario_id" required aria-label="Participante fora do grupo" className="h-10 rounded-md border border-foreground bg-white px-3 text-sm font-medium"><option value="">Selecione um participante</option>{availableProfiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.apelido}{profile.telefone ? ` · ${profile.telefone}` : ""}</option>)}</select></label><Button type="submit" className="h-10 bg-success text-white hover:bg-success/90">Adicionar ao grupo</Button></form> : <p className="mt-4 rounded-md bg-[#f1f5f2] p-3 text-sm text-[#637469]">Todos os perfis cadastrados já participam deste grupo.</p>}<dl className="mt-6 grid gap-2 border-t border-[#edf1ee] pt-4 text-xs"><div className="flex justify-between gap-3"><dt className="text-[#637469]">Código</dt><dd className="font-mono font-bold">{group.codigo_convite}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#637469]">Tipo</dt><dd className="font-bold">{group.tipo}</dd></div></dl></aside>
    </section>
  </section>;
}
