import Link from "next/link";
import { ArrowLeft, Crown, UserMinus, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/shadcn/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-access";
import { addGroupInviteEmail, addGroupMember, deactivateGroup, removeGroupMember } from "../../actions";
import { InviteLink } from "../invite-link";

type Group = { id: string; nome: string; icone: string; temporada: number; tipo: string; token_convite: string; codigo_convite: string; criada_em: string; dono_id: string };
type Profile = { id: string; apelido: string; email: string; telefone: string | null };
type Member = { usuario_id: string; entrou_em: string; perfis: Profile | Profile[] | null };
type RoundRanking = { rodada_id: number; usuario_id: string; pontos: number };

function first<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function AdminGroupDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ adicionado?: string; removido?: string; convite_email?: string; erro?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, user } = await requireAdmin();

  const admin = createAdminClient();
  const [{ data: groupData }, { data: membersData }, { data: profilesData }, { data: emailInvites }] = await Promise.all([
    admin.from("ligas").select("id, nome, icone, temporada, tipo, token_convite, codigo_convite, criada_em, dono_id").eq("id", id).is("arquivada_em", null).maybeSingle(),
    admin.from("ligas_membros").select("usuario_id, entrou_em, perfis!ligas_membros_usuario_id_fkey(id, apelido, email, telefone)").eq("liga_id", id).order("entrou_em"),
    admin.from("perfis").select("id, apelido, email, telefone").order("apelido"),
    admin.from("ligas_convites_email").select("email, aceito_em").eq("liga_id", id).order("criado_em", { ascending: false }),
  ]);
  const group = groupData as Group | null;
  if (!group) notFound();
  const members = ((membersData ?? []) as unknown as Member[]).flatMap((member) => {
    const profile = first(member.perfis);
    return profile ? [{ ...member, profile }] : [];
  });
  const memberIds = new Set(members.map((member) => member.usuario_id));
  const ownerMember = members.find((member) => member.usuario_id === group.dono_id);
  const participantMembers = members.filter((member) => member.usuario_id !== group.dono_id);
  const participantIds = new Set(participantMembers.map((member) => member.usuario_id));
  const availableProfiles = ((profilesData ?? []) as Profile[]).filter((profile) => !memberIds.has(profile.id));
  const { data: rankingData } = participantIds.size
    ? await admin
      .from("ranking_rodada")
      .select("rodada_id, usuario_id, pontos")
      .in("usuario_id", [...participantIds])
      .order("rodada_id", { ascending: false })
    : { data: [] };
  const rankings = (rankingData ?? []) as RoundRanking[];
  const lastScoredRoundId = rankings[0]?.rodada_id;
  const pointsByMember = new Map(rankings
    .filter((ranking) => ranking.rodada_id === lastScoredRoundId)
    .map((ranking) => [ranking.usuario_id, Number(ranking.pontos)]));
  const membersWithRanking = participantMembers
    .map((member) => ({ ...member, pontos: pointsByMember.get(member.usuario_id) ?? 0 }))
    .sort((firstMember, secondMember) => secondMember.pontos - firstMember.pontos || firstMember.profile.apelido.localeCompare(secondMember.profile.apelido, "pt-BR"));
  let previousPoints: number | null = null;
  let previousPosition = 0;
  const rankedMembers = membersWithRanking.map((member, index) => {
    const posicao = member.pontos === previousPoints ? previousPosition : index + 1;
    previousPoints = member.pontos;
    previousPosition = posicao;
    return { ...member, posicao };
  });
  const createdAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(group.criada_em));
  const errorMessage = query.erro === "dono" ? "O dono do grupo não pode ser removido." : query.erro === "adicionar" ? "Não foi possível adicionar o participante." : query.erro === "remover" ? "Não foi possível remover o participante." : query.erro === "convite_email" ? "Não foi possível autorizar este e-mail." : null;

  return <section className="w-full">
    <Link href="/admin/grupos" className="inline-flex items-center gap-2 rounded text-sm font-bold text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft className="size-4" />Voltar para grupos</Link>
    <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 pb-5">
      <div><p className="text-sm font-bold tracking-wide text-muted-foreground">GRUPO</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight"><span className="mr-2">{group.icone}</span>{group.nome}</h1><p className="mt-1 text-sm text-muted-foreground">Temporada {group.temporada} · {group.tipo === "CONVITE" ? "por convite" : "aberto"} · criado em {createdAt}</p></div>
      <div className="min-w-[260px]"><InviteLink token={group.token_convite} code={group.codigo_convite} /></div>
    </header>

    {(errorMessage || query.adicionado || query.removido || query.convite_email) && <p role="status" className={`mt-5 rounded-lg border p-3 text-sm font-semibold ${errorMessage ? "border-destructive bg-destructive/20 text-destructive-foreground" : "border-primary/40 bg-primary/10 text-primary"}`}>{errorMessage ?? (query.convite_email ? "E-mail autorizado para usar o convite." : query.adicionado ? "Participante adicionado ao grupo." : "Participante removido do grupo.")}</p>}

    <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
      <div className="grid gap-4">
        {ownerMember && <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm"><header className="mb-4 flex items-center gap-2"><Crown className="size-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-extrabold">Dono do grupo</h2></header><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">{ownerMember.profile.apelido.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{ownerMember.profile.apelido}</p><p className="truncate text-xs text-muted-foreground">{ownerMember.profile.email}</p><p className="truncate text-xs text-muted-foreground">{ownerMember.profile.telefone ?? "Sem telefone"}</p></div></div></article>}
        <article className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm">
          <header className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
            <div>
              <h2 className="text-lg font-extrabold">Participantes</h2>
              <p className="text-sm text-muted-foreground">{participantMembers.length} {participantMembers.length === 1 ? "participante" : "participantes"} · ordenados pela última pontuação</p>
            </div><UsersRound className="size-5 text-primary" />
          </header>
          <ul className="divide-y divide-neutral-800">{rankedMembers.map((member) => (
            <li key={member.usuario_id} className={`flex items-center gap-3 px-5 py-4 ${member.posicao === 1 ? "border-l-2 border-primary border-b-2 border-b-primary/10 bg-primary/5" : ""}`}>
              <strong className={`w-6 text-center text-sm ${member.posicao === 1 ? "text-primary" : "text-muted-foreground"}`}>{member.posicao}º</strong>
              <span className="grid size-10 place-items-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">{member.profile.apelido.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{member.profile.apelido}</p>
                <p className="truncate text-xs text-muted-foreground">{member.profile.email}</p>
                <p className="truncate text-xs text-muted-foreground">{member.profile.telefone ?? "Sem telefone"}</p>
              </div>
              <p className="shrink-0 text-right text-xs text-muted-foreground">
                <strong className="block text-base text-foreground">{member.pontos.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
                última pontuação
              </p>
              <form action={removeGroupMember}>
                <input type="hidden" name="grupo_id" value={group.id} />
                <input type="hidden" name="usuario_id" value={member.usuario_id} />
                <Button type="submit" variant="outline" className="h-8 px-2.5 text-xs">
                  <UserMinus className="size-3.5" />
                  <span className="sr-only">Remover participante</span></Button>
              </form>
            </li>))}
          </ul>
        </article>
      </div>

      <aside className="h-fit rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">Autorizar por e-mail</h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">Cadastre o e-mail antes de enviar o código. Só este endereço poderá concluir o cadastro.</p>
        <form action={addGroupInviteEmail} className="mt-4 grid gap-3">
          <input type="hidden" name="grupo_id" value={group.id} />
          <label className="grid gap-1.5 text-sm font-bold">E-mail do convidado
            <input name="email" required type="email" autoComplete="email" placeholder="nome@exemplo.com" className="h-10 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm font-medium" />
          </label>
          <Button type="submit" className="h-10">Autorizar e-mail</Button>
        </form>
        {emailInvites?.length ?
          <ul className="mt-4 grid gap-1 text-xs text-muted-foreground">
            {emailInvites.map((invite) => <li key={invite.email}>{invite.email}{invite.aceito_em ? " · entrou" : " · pendente"}</li>)}
          </ul> : null
        }<h3 className="mt-6 border-t border-neutral-800 pt-4 text-sm font-extrabold">Adicionar perfil existente</h3>{availableProfiles.length > 0 ? <form action={addGroupMember} className="mt-3 grid gap-3"><input type="hidden" name="grupo_id" value={group.id} /><select name="usuario_id" required aria-label="Participante fora do grupo" className="h-10 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm font-medium"><option value="">Selecione um participante</option>{availableProfiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.apelido}{profile.telefone ? ` · ${profile.telefone}` : ""}</option>)}</select><Button type="submit" className="h-10">Adicionar ao grupo</Button></form> : null}<dl className="mt-6 grid gap-2 border-t border-neutral-800 pt-4 text-xs">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Código</dt><dd className="font-mono font-bold">{group.codigo_convite}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Tipo</dt><dd className="font-bold">{group.tipo}</dd></div></dl><section className="mt-6 border-t border-neutral-800 pt-4">
          <h3 className="text-sm font-extrabold">Inativar grupo</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Esta ação bloqueia o acesso dos participantes e deixa todos os convites indisponíveis.</p>
          <form action={deactivateGroup} className="mt-3">
            <input type="hidden" name="grupo_id" value={group.id} />
            <Button type="submit" variant="secondary" className="h-10 w-full bg-red-600/30 hover:bg-red-600/40 border-0 text-white/60">Inativar grupo</Button>
          </form>
        </section>
      </aside>
    </section>
  </section>;
}
