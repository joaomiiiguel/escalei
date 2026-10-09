import { Layers3, UsersRound } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

type Participant = {
    usuario_id: string;
    apelido: string;
    email: string;
    grupo: string;
    gestor: string;
};

export default async function AdminParticipants() {
    const admin = createAdminClient();

    const [
        { data: groups },
        { data: membersData },
        { data: { users } }
    ] = await Promise.all([
        admin.from("ligas").select("id").is("arquivada_em", null),
        admin
            .from("ligas_membros")
            .select(`
                usuario_id,
                entrou_em,
                perfis!ligas_membros_usuario_id_fkey ( apelido ),
                ligas (
                    nome,
                    perfis!ligas_dono_id_fkey ( apelido )
                )
            `)
            .order("entrou_em", { ascending: false }),
        admin.auth.admin.listUsers()
    ]);

    const activeGroupsCount = groups?.length ?? 0;
    
    const emailMap = new Map(users.map(u => [u.id, u.email || "Sem e-mail"]));

    const participants: Participant[] = (membersData || []).map((m: any) => ({
        usuario_id: m.usuario_id,
        apelido: m.perfis?.apelido ?? "Desconhecido",
        email: emailMap.get(m.usuario_id) ?? "Sem e-mail",
        grupo: m.ligas?.nome ?? "Sem grupo",
        gestor: m.ligas?.perfis?.apelido ?? "Desconhecido",
    }));

    return <section className="w-full p-0">
        <header className="flex flex-col items-start gap-2">
            <p className="m-0 text-[26px] font-extrabold tracking-tight">Participantes</p>
            <p className="m-1 text-sm font-medium text-background/40">Veja todos os participantes ativos dos grupos.</p>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <article className="rounded-lg border border-foreground bg-white p-5 shadow-sm">
                <Layers3 aria-hidden="true" className="mb-3 size-5 text-success" />
                <p className="m-0 text-sm font-semibold text-[#637469]">Grupos ativos</p>
                <strong className="text-3xl">{activeGroupsCount}</strong>
            </article>
            <article className="rounded-lg border border-foreground bg-white p-5 shadow-sm">
                <UsersRound aria-hidden="true" className="mb-3 size-5 text-success" />
                <p className="m-0 text-sm font-semibold text-[#637469]">Participantes</p>
                <strong className="text-3xl">{participants.length}</strong>
            </article>
        </section>
        <section className="mt-6 overflow-x-auto rounded-lg border border-foreground bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-foreground bg-secondary text-foreground">
                    <tr>
                        <th className="px-5 py-3 font-semibold">Nome</th>
                        <th className="px-5 py-3 font-semibold">E-mail</th>
                        <th className="px-5 py-3 font-semibold">Grupo</th>
                        <th className="px-5 py-3 font-semibold">Gestor</th>
                    </tr>
                </thead>
                <tbody>
                    {participants.length > 0 ? participants.map((p, idx) => (
                        <tr key={`${p.usuario_id}-${idx}`} className="border-b border-[#edf1ee] last:border-0">
                            <td className="px-5 py-4 font-bold">{p.apelido}</td>
                            <td className="px-5 py-4 text-[#637469]">{p.email}</td>
                            <td className="px-5 py-4">{p.grupo}</td>
                            <td className="px-5 py-4">{p.gestor}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4} className="px-5 py-10 text-center text-[#637469]">Nenhum participante ativo ainda.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </section>
    </section>;
}
