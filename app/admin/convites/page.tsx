import Link from "next/link";
import { CalendarPlus, Check, Clock3, MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/shadcn/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-access";
import { isInviteOpen } from "@/lib/invites";
import { countRecentSignups, countSignupsBySource, formatWaitlistSource, formatWhatsapp, waitlistInviteMessage, whatsappLink } from "@/lib/waitlist";
import { acceptWaitlistSignup } from "../actions";
import { DeleteSignupForm } from "./delete-signup-form";

type WaitlistSignup = {
    id: number;
    nome: string;
    whatsapp: string;
    email: string;
    origem: string;
    criado_em: string;
    liga_id: string | null;
    aceito_em: string | null;
};

type Group = { id: string; nome: string; token_convite: string };

const signupDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const feedback: Record<string, string> = {
    aceito: "Inscrição aceita. Envie o convite pelo WhatsApp para concluir a entrada no grupo.",
    excluido: "Inscrição excluída da lista de espera.",
};

const errors: Record<string, string> = {
    aceitar: "Não foi possível aceitar a inscrição. Confira o grupo escolhido e tente novamente.",
    excluir: "Não foi possível excluir a inscrição. Tente novamente.",
};

function SignupContact({ signup }: { signup: WaitlistSignup }) {
    return <div className="min-w-0">
        <p className="m-0 font-bold">{signup.nome}</p>
        <p className="m-0 mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            <a href={whatsappLink(signup.whatsapp)} target="_blank" rel="noopener noreferrer" title="Abrir conversa no WhatsApp" className="text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{formatWhatsapp(signup.whatsapp)}</a>
            <a href={`mailto:${signup.email}`} className="break-all text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{signup.email}</a>
        </p>
        <p className="m-0 mt-1 text-xs text-muted-foreground">Inscrição em <time dateTime={signup.criado_em}>{signupDate.format(new Date(signup.criado_em))}</time> · Origem: {formatWaitlistSource(signup.origem)}</p>
    </div>;
}

export default async function AdminInvites({ searchParams }: { searchParams: Promise<{ aceito?: string; excluido?: string; erro?: string }> }) {
    await requireAdmin();
    const params = await searchParams;
    const admin = createAdminClient();
    // `lista_espera` só é acessível pela service_role: a leitura fica no servidor, depois do requireAdmin.
    const [{ data, error }, { data: groupsData, error: groupsError }] = await Promise.all([
        admin
            .from("lista_espera")
            .select("id, nome, whatsapp, email, origem, criado_em, liga_id, aceito_em")
            .order("criado_em", { ascending: false }),
        admin
            .from("ligas")
            .select("id, nome, token_convite, arquivada_em, convite_expira_em")
            .is("arquivada_em", null)
            .order("nome", { ascending: true }),
    ]);

    const signups: WaitlistSignup[] = data ?? [];
    const groups: Group[] = (groupsData ?? []).filter(isInviteOpen);
    const groupById = new Map(groups.map((group) => [group.id, group]));
    // Quem foi aceito em um grupo que não recebe mais convites volta a precisar de um grupo.
    const accepted = signups.filter((signup) => signup.aceito_em && signup.liga_id && groupById.has(signup.liga_id));
    const pending = signups.filter((signup) => !accepted.includes(signup));
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const success = params.aceito ? feedback.aceito : params.excluido ? feedback.excluido : null;
    const failure = (params.erro && errors[params.erro]) || (error || groupsError ? "Não foi possível carregar a lista de espera. Tente novamente em instantes." : null);

    return <section className="w-full p-0">
        <header className="flex flex-col items-start gap-2">
            <p className="m-0 text-[26px] font-extrabold tracking-tight">Convites</p>
            <p className="m-1 text-sm font-medium text-muted-foreground">Pessoas que se inscreveram na lista de espera do beta pela landing.</p>
        </header>

        {failure && <p role="alert" className="mt-5 rounded-lg border border-destructive bg-destructive/20 p-3 text-sm font-semibold text-destructive-foreground">{failure}</p>}
        {success && <p role="status" className="mt-5 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm font-semibold text-primary">{success}</p>}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
            <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
                <Clock3 aria-hidden="true" className="mb-3 size-5 text-primary" />
                <p className="m-0 text-sm font-semibold text-muted-foreground">Pendentes</p>
                <strong className="text-3xl">{pending.length}</strong>
            </article>
            <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
                <Check aria-hidden="true" className="mb-3 size-5 text-primary" />
                <p className="m-0 text-sm font-semibold text-muted-foreground">Aceitos</p>
                <strong className="text-3xl">{accepted.length}</strong>
            </article>
            <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
                <CalendarPlus aria-hidden="true" className="mb-3 size-5 text-primary" />
                <p className="m-0 text-sm font-semibold text-muted-foreground">Últimos 7 dias</p>
                <strong className="text-3xl">{countRecentSignups(signups)}</strong>
            </article>
        </section>

        {signups.length > 0 && <p className="mt-3 text-sm text-muted-foreground">Inscrições por origem: {countSignupsBySource(signups).map(([origem, total]) => `${formatWaitlistSource(origem)} ${total}`).join(" · ")}</p>}

        <section className="mt-6" aria-labelledby="pendentes-titulo">
            <h2 id="pendentes-titulo" className="text-lg font-extrabold">Pendentes</h2>
            {pending.length > 0 && groups.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Nenhum grupo ativo para receber convites. <Link href="/admin/grupos/novo" className="font-bold text-primary underline-offset-2 hover:underline">Criar grupo</Link></p>}
            {pending.length > 0 ? <ul className="mt-3 grid list-none gap-0 rounded-lg border border-neutral-800 bg-neutral-900 p-0 shadow-sm">
                {pending.map((signup) => <li key={signup.id} className="grid gap-3 border-b border-neutral-800 p-4 last:border-0 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                    <SignupContact signup={signup} />
                    <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                        <form action={acceptWaitlistSignup} className="grid gap-2 sm:flex sm:items-center">
                            <input type="hidden" name="inscrito_id" value={signup.id} />
                            <select name="grupo_id" required disabled={groups.length === 0} aria-label={`Grupo para ${signup.nome}`} defaultValue="" className="h-10 min-w-0 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm font-medium sm:w-52">
                                <option value="">Escolha o grupo</option>
                                {groups.map((group) => <option value={group.id} key={group.id}>{group.nome}</option>)}
                            </select>
                            <SubmitButton disabled={groups.length === 0} loadingText="Aceitando…" aria-label={`Aceitar ${signup.nome}`} className="h-10 px-3"><Check aria-hidden="true" />Aceitar</SubmitButton>
                        </form>
                        <DeleteSignupForm nome={signup.nome} signupId={signup.id} />
                    </div>
                </li>)}
            </ul> : <p className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-10 text-center text-sm text-muted-foreground">{error ? "Lista indisponível no momento." : "Nenhuma inscrição aguardando convite."}</p>}
        </section>

        {accepted.length > 0 && <section className="mt-6" aria-labelledby="aceitos-titulo">
            <h2 id="aceitos-titulo" className="text-lg font-extrabold">Aceitos</h2>
            <ul className="mt-3 grid list-none gap-0 rounded-lg border border-neutral-800 bg-neutral-900 p-0 shadow-sm">
                {accepted.map((signup) => {
                    const group = groupById.get(signup.liga_id!)!;
                    const message = waitlistInviteMessage({ nome: signup.nome, grupo: group.nome, email: signup.email, link: `${siteUrl}/convite/${group.token_convite}` });

                    return <li key={signup.id} className="grid gap-3 border-b border-neutral-800 p-4 last:border-0 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                        <div className="grid gap-1">
                            <SignupContact signup={signup} />
                            <p className="m-0 text-xs font-semibold text-primary">Grupo: {group.nome}</p>
                        </div>
                        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                            <a href={whatsappLink(signup.whatsapp, message)} target="_blank" rel="noopener noreferrer" aria-label={`Enviar convite para ${signup.nome} pelo WhatsApp`} className={buttonVariants({ className: "h-10 px-3" })}><MessageCircle aria-hidden="true" />Enviar convite</a>
                            <DeleteSignupForm nome={signup.nome} signupId={signup.id} />
                        </div>
                    </li>;
                })}
            </ul>
        </section>}
    </section>;
}
