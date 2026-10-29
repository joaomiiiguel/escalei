import { CalendarPlus, MailOpen } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-access";
import { countRecentSignups, formatWhatsapp, whatsappLink } from "@/lib/waitlist";

type WaitlistSignup = {
    id: number;
    nome: string;
    whatsapp: string;
    email: string;
    criado_em: string;
};

const signupDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function AdminInvites() {
    await requireAdmin();
    // `lista_espera` só é acessível pela service_role: a leitura fica no servidor, depois do requireAdmin.
    const { data, error } = await createAdminClient()
        .from("lista_espera")
        .select("id, nome, whatsapp, email, criado_em")
        .order("criado_em", { ascending: false });

    const signups: WaitlistSignup[] = data ?? [];

    return <section className="w-full p-0">
        <header className="flex flex-col items-start gap-2">
            <p className="m-0 text-[26px] font-extrabold tracking-tight">Convites</p>
            <p className="m-1 text-sm font-medium text-muted-foreground">Pessoas que se inscreveram na lista de espera do beta pela landing.</p>
        </header>

        {error && <p role="alert" className="mt-5 rounded-lg border border-destructive bg-destructive/20 p-3 text-sm font-semibold text-destructive-foreground">Não foi possível carregar a lista de espera. Tente novamente em instantes.</p>}

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
                <MailOpen aria-hidden="true" className="mb-3 size-5 text-primary" />
                <p className="m-0 text-sm font-semibold text-muted-foreground">Inscritos</p>
                <strong className="text-3xl">{signups.length}</strong>
            </article>
            <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
                <CalendarPlus aria-hidden="true" className="mb-3 size-5 text-primary" />
                <p className="m-0 text-sm font-semibold text-muted-foreground">Últimos 7 dias</p>
                <strong className="text-3xl">{countRecentSignups(signups)}</strong>
            </article>
        </section>
        <section className="mt-6 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-neutral-800 bg-neutral-800 text-neutral-100">
                    <tr>
                        <th className="px-5 py-3 font-semibold">Nome</th>
                        <th className="px-5 py-3 font-semibold">WhatsApp</th>
                        <th className="px-5 py-3 font-semibold">E-mail</th>
                        <th className="px-5 py-3 font-semibold">Inscrição</th>
                    </tr>
                </thead>
                <tbody>
                    {signups.length > 0 ? signups.map((signup) => (
                        <tr key={signup.id} className="border-b border-neutral-800 last:border-0">
                            <td className="px-5 py-4 font-bold">{signup.nome}</td>
                            <td className="px-5 py-4"><a href={whatsappLink(signup.whatsapp)} target="_blank" rel="noopener noreferrer" title="Abrir conversa no WhatsApp" className="text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{formatWhatsapp(signup.whatsapp)}</a></td>
                            <td className="px-5 py-4"><a href={`mailto:${signup.email}`} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{signup.email}</a></td>
                            <td className="px-5 py-4 text-muted-foreground"><time dateTime={signup.criado_em}>{signupDate.format(new Date(signup.criado_em))}</time></td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">{error ? "Lista indisponível no momento." : "Ninguém se inscreveu na lista de espera ainda."}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </section>
    </section>;
}
