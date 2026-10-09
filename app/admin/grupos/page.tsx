import Link from "next/link";
import { Layers3, LogOut, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createGroup, signOut } from "../actions";
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

  const [{ data: groups }, params] = await Promise.all([
    supabase.from("ligas").select("id, nome, icone, temporada, token_convite, criada_em, ligas_membros(count)").is("arquivada_em", null).order("criada_em", { ascending: false }),
    searchParams,
  ]);
  const activeGroups = (groups ?? []) as Group[];
  const participantCount = activeGroups.reduce((total, group) => total + (group.ligas_membros[0]?.count ?? 0), 0);

  return <section className="w-full p-0">
    <header className="flex flex-col items-start gap-2">
      <p className="m-0 text-[26px] font-extrabold tracking-tight">Grupos e gestores</p>
      <p className="m-1 text-sm font-medium text-background/40">Administração de grupos, participantes e convites.</p>
    </header>
    <GroupCreateForm action={createGroup} />
    <section className="mt-6 grid gap-4 sm:grid-cols-2">
      <article className="rounded-lg border border-foreground bg-white p-5 shadow-sm">
        <Layers3 aria-hidden="true" className="mb-3 size-5 text-success" />
        <p className="m-0 text-sm font-semibold text-[#637469]">Grupos ativos</p>
        <strong className="text-3xl">{activeGroups.length}</strong>
      </article>
      <article className="rounded-lg border border-foreground bg-white p-5 shadow-sm">
        <UsersRound aria-hidden="true" className="mb-3 size-5 text-success" />
        <p className="m-0 text-sm font-semibold text-[#637469]">Participantes</p>
        <strong className="text-3xl">{participantCount}</strong>
      </article>
    </section>
    <section className="mt-6 overflow-x-auto rounded-lg border border-foreground bg-white shadow-sm">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="border-b border-foreground bg-secondary text-foreground">
          <tr>
            <th className="px-5 py-3 font-semibold">Grupo</th>
            <th className="px-5 py-3 font-semibold">Temporada</th>
            <th className="px-5 py-3 font-semibold">Participantes</th>
            <th className="px-5 py-3 font-semibold">Link de convite</th>
            <th className="px-5 py-3 font-semibold"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {activeGroups.length > 0 ? activeGroups.map((group) => (
            <tr key={group.id} className="border-b border-[#edf1ee] last:border-0">
              <td className="px-5 py-4 font-bold"><Link href={`/admin/grupos/${group.id}`} className="rounded underline-offset-4 hover:text-success hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"><span className="mr-2">{group.icone}</span>{group.nome}</Link></td>
              <td className="px-5 py-4">{group.temporada}</td>
              <td className="px-5 py-4">{group.ligas_membros[0]?.count ?? 0}</td>
              <td className="max-w-[360px] px-5 py-3">
                <InviteLink token={group.token_convite} />
              </td>
              <td className="px-5 py-3"><Link href={`/admin/grupos/${group.id}`} className="inline-flex h-9 items-center rounded-md bg-success px-3 text-xs font-bold text-white hover:bg-success/90">Gerenciar</Link></td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center text-[#637469]">Nenhum grupo ativo ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  </section>
    ;
}
