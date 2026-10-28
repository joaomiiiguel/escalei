import Link from "next/link";
import { Layers3, Pencil, Plus, UsersRound } from "lucide-react";
import { requireAdmin } from "@/lib/admin-access";
import { InviteLink } from "./invite-link";

type Group = {
  id: string;
  nome: string;
  icone: string;
  temporada: number;
  token_convite: string;
  codigo_convite: string;
  criada_em: string;
  ligas_membros: { count: number }[];
  perfis: { apelido: string } | { apelido: string }[] | null;
};

function first<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function AdminGroups({ searchParams }: { searchParams: Promise<{ inativado?: string; erro?: string }> }) {
  const { supabase } = await requireAdmin();

  const [{ data: groups }, params] = await Promise.all([
    supabase.from("ligas").select("id, nome, icone, temporada, token_convite, codigo_convite, criada_em, ligas_membros(count), perfis!ligas_dono_id_fkey(apelido)").is("arquivada_em", null).order("criada_em", { ascending: false }),
    searchParams,
  ]);
  const activeGroups = (groups ?? []) as Group[];
  const participantCount = activeGroups.reduce((total, group) => total + (group.ligas_membros[0]?.count ?? 0), 0);

  return <section className="w-full p-0">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="m-0 text-[26px] font-extrabold tracking-tight">Grupos e gestores</h1>
        <p className="m-1 text-sm font-medium text-muted-foreground">Administração de grupos, participantes e convites.</p>
      </div>
      <Link href="/admin/grupos/novo" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Plus aria-hidden="true" className="size-4" />Criar grupo</Link>
    </header>
    {params.inativado && <p role="status" className="mt-5 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm font-semibold text-primary">Grupo inativado. Os participantes não poderão mais acessá-lo nem usar seus convites.</p>}
    <section className="mt-6 grid gap-4 sm:grid-cols-2">
      <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
        <Layers3 aria-hidden="true" className="mb-3 size-5 text-primary" />
        <p className="m-0 text-sm font-semibold text-muted-foreground">Grupos ativos</p>
        <strong className="text-3xl">{activeGroups.length}</strong>
      </article>
      <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
        <UsersRound aria-hidden="true" className="mb-3 size-5 text-primary" />
        <p className="m-0 text-sm font-semibold text-muted-foreground">Participantes</p>
        <strong className="text-3xl">{participantCount}</strong>
      </article>
    </section>
    <section className="mt-6 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-neutral-800 bg-neutral-800 text-neutral-100">
          <tr>
            <th className="px-5 py-3 font-semibold">Nome</th>
            <th className="px-5 py-3 font-semibold">Gestor</th>
            <th className="px-5 py-3 font-semibold">Participantes</th>
            <th className="px-5 py-3 font-semibold">Ação</th>
          </tr>
        </thead>
        <tbody>
          {activeGroups.length > 0 ? activeGroups.map((group) => (
            <tr key={group.id} className="border-b border-neutral-800 last:border-0">
              <td className="px-5 py-4 font-bold"><Link href={`/admin/grupos/${group.id}`} className="rounded underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><span className="mr-2">{group.icone}</span>{group.nome}</Link></td>
              <td className="px-5 py-4 text-muted-foreground">{first(group.perfis)?.apelido ?? "Sem gestor"}</td>
              <td className="px-5 py-4">{group.ligas_membros[0]?.count ?? 0}</td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <InviteLink token={group.token_convite} code={group.codigo_convite} iconOnly />
                  <Link href={`/admin/grupos/${group.id}`} aria-label={`Gerenciar ${group.nome}`} title={`Gerenciar ${group.nome}`} className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Pencil aria-hidden="true" className="size-4" /><span className="sr-only">Gerenciar</span></Link>
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">Nenhum grupo ativo ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  </section>
    ;
}
