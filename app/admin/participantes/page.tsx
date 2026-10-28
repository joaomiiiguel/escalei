import { Layers3, UsersRound } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-access";

type Participant = {
    usuario_id: string;
    apelido: string;
    email: string;
    telefone: string | null;
    grupos: string[];
    gestores: string[];
};

function first<T>(value: T | T[] | null) {
    return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function AdminParticipants() {
    await requireAdmin();
    const admin = createAdminClient();

    const [
        { data: groups },
        { data: membersData },
    ] = await Promise.all([
        admin.from("ligas").select("id").is("arquivada_em", null),
        admin
            .from("ligas_membros")
            .select(`
                usuario_id,
                entrou_em,
                perfis!ligas_membros_usuario_id_fkey ( apelido, email, telefone ),
                ligas!inner (
                    nome,
                    perfis!ligas_dono_id_fkey ( apelido )
                )
            `)
            .is("ligas.arquivada_em", null)
            .order("entrou_em", { ascending: false }),
    ]);

    const activeGroupsCount = groups?.length ?? 0;
    
    const participantsByUser = new Map<string, Participant>();

    for (const membership of membersData ?? []) {
        const participant = participantsByUser.get(membership.usuario_id);
        const group = first(membership.ligas);
        const profile = first(membership.perfis);
        const manager = first(group?.perfis);
        const groupName = group?.nome ?? "Sem grupo";
        const managerName = manager?.apelido ?? "Desconhecido";

        if (participant) {
            if (!participant.grupos.includes(groupName)) participant.grupos.push(groupName);
            if (!participant.gestores.includes(managerName)) participant.gestores.push(managerName);
            continue;
        }

        participantsByUser.set(membership.usuario_id, {
            usuario_id: membership.usuario_id,
            apelido: profile?.apelido ?? "Desconhecido",
            email: profile?.email ?? "Sem e-mail",
            telefone: profile?.telefone ?? null,
            grupos: [groupName],
            gestores: [managerName],
        });
    }

    const participants = [...participantsByUser.values()];

    return <section className="w-full p-0">
        <header className="flex flex-col items-start gap-2">
            <p className="m-0 text-[26px] font-extrabold tracking-tight">Participantes</p>
            <p className="m-1 text-sm font-medium text-muted-foreground">Veja todos os participantes ativos dos grupos.</p>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
                <Layers3 aria-hidden="true" className="mb-3 size-5 text-primary" />
                <p className="m-0 text-sm font-semibold text-muted-foreground">Grupos ativos</p>
                <strong className="text-3xl">{activeGroupsCount}</strong>
            </article>
            <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
                <UsersRound aria-hidden="true" className="mb-3 size-5 text-primary" />
                <p className="m-0 text-sm font-semibold text-muted-foreground">Participantes únicos</p>
                <strong className="text-3xl">{participants.length}</strong>
            </article>
        </section>
        <section className="mt-6 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm">
            <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-neutral-800 bg-neutral-800 text-neutral-100">
                    <tr>
                        <th className="px-5 py-3 font-semibold">Nome</th>
                        <th className="px-5 py-3 font-semibold">E-mail</th>
                        <th className="px-5 py-3 font-semibold">Telefone</th>
                        <th className="px-5 py-3 font-semibold">Grupos</th>
                        <th className="px-5 py-3 font-semibold">Gestores</th>
                    </tr>
                </thead>
                <tbody>
                    {participants.length > 0 ? participants.map((p) => (
                        <tr key={p.usuario_id} className="border-b border-neutral-800 last:border-0">
                            <td className="px-5 py-4 font-bold">{p.apelido}</td>
                            <td className="px-5 py-4 text-muted-foreground">{p.email}</td>
                            <td className="px-5 py-4 text-muted-foreground">{p.telefone ?? "Sem telefone"}</td>
                            <td className="px-5 py-4">{p.grupos.join(", ")}</td>
                            <td className="px-5 py-4">{p.gestores.join(", ")}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Nenhum participante ativo ainda.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </section>
    </section>;
}
