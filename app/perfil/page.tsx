import {
  AtSign,
  Bell,
  BookOpen,
  ChevronRight,
  FileText,
  LogOut,
  Mail,
  Moon,
  Shield,
  Shirt,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TeamLogo } from "@/components/ui/team-logo";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount, signOut, updatePreferences, updateProfile } from "./actions";
import { ProfileEditModal } from "./profile-edit-modal";

type ProfilePageProps = {
  searchParams: Promise<{ atualizado?: string; email_pendente?: string; erro?: string }>;
};

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="px-0.5 text-[10px] font-extrabold tracking-[0.12em] text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">{children}</div>
    </section>
  );
}

function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex min-h-14 items-center gap-3 border-b border-border px-3.5 last:border-b-0 ${className}`}>{children}</div>;
}

function Detail({ children, icon: Icon, value }: { children: React.ReactNode; icon: typeof AtSign; value?: string | null }) {
  return (
    <Row>
      <Icon className="size-[19px] shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-[14.5px] font-semibold text-foreground">{children}</span>
      {value && <span className="max-w-[46%] truncate text-[13px] text-muted-foreground">{value}</span>}
    </Row>
  );
}

function ToggleRow({ icon: Icon, label, defaultChecked, disabled = false }: { icon: typeof Bell; label: string; defaultChecked?: boolean; disabled?: boolean }) {
  return (
    <Row className={disabled ? "opacity-55" : ""}>
      <Icon className="size-[19px] shrink-0 text-muted-foreground" aria-hidden="true" />
      <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 text-[14.5px] font-semibold text-foreground">
        <span>{label}</span>
        <input aria-label={label} className="peer sr-only" defaultChecked={defaultChecked} disabled={disabled} name={disabled ? undefined : "notificacoes_email"} type="checkbox" />
        <span aria-hidden="true" className="flex h-6 w-10 shrink-0 items-center rounded-full bg-muted p-[3px] transition peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed">
          <span className="size-[18px] rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </span>
      </label>
    </Row>
  );
}

export default async function Profile({ searchParams }: ProfilePageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: profile }, { data: teams }, { count: leaguesCount }] = await Promise.all([
    supabase
      .from("perfis")
      .select("apelido, telefone, tema, notificacoes_email, termos_aceitos_em, termos_versao, clube_coracao_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("times").select("pontos").eq("usuario_id", user.id),
    supabase.from("ligas_membros").select("liga_id", { count: "exact", head: true }).eq("usuario_id", user.id),
  ]);

  if (!profile) redirect("/onboarding");

  const { data: clubs } = await supabase.from("clubes").select("id, nome, sigla, logo_url").eq("ativo", true).order("nome");
  const favoriteClub = clubs?.find((club) => club.id === profile.clube_coracao_id) ?? null;
  const params = await searchParams;
  const errorMessage = params.erro === "apelido"
    ? "Use de 3 a 20 caracteres no apelido: letras, números, ponto ou _."
    : params.erro === "telefone"
      ? "Informe um WhatsApp brasileiro válido com DDD ou deixe o campo em branco."
      : params.erro === "email"
        ? "Não foi possível atualizar o e-mail. Confira o endereço e tente novamente."
        : params.erro === "indisponivel"
          ? "Este apelido ou WhatsApp já está em uso."
          : params.erro
            ? "Não foi possível concluir a operação. Revise os dados e tente novamente."
            : null;
  const roundsPlayed = teams?.length ?? 0;
  const averagePoints = roundsPlayed
    ? (teams ?? []).reduce((total, team) => total + Number(team.pontos ?? 0), 0) / roundsPlayed
    : 0;

  return (
    <main className="mx-auto w-full max-w-lg pb-32 pt-5">
      <header className="mb-[18px] flex h-12 items-center">
        <h1 className="flex-1 text-2xl font-extrabold tracking-[-0.5px] text-foreground">Perfil</h1>
      </header>

      {params.atualizado && <p role="status" className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">Preferências salvas.</p>}
      {errorMessage && <p role="alert" className="mb-4 rounded-xl border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm font-semibold text-destructive-foreground">{errorMessage}</p>}
      {params.email_pendente && <p role="status" className="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-semibold text-foreground">Confira seu e-mail para confirmar o novo endereço.</p>}

      <section className="mb-[18px] flex items-center gap-3.5" aria-label="Identificação do perfil">
        <div className="grid size-16 shrink-0 place-items-center rounded-[22px] bg-primary text-2xl font-extrabold text-primary-foreground">{initials(profile.apelido)}</div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[22px] font-extrabold tracking-[-0.4px] text-foreground">{profile.apelido}</h2>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {favoriteClub && <span className="flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-extrabold text-foreground"><TeamLogo className="size-3.5" logoUrl={favoriteClub.logo_url} nome={favoriteClub.nome} sigla={favoriteClub.sigla} />{favoriteClub.sigla}</span>}
            {user.email && <span className="truncate">{user.email}</span>}
          </div>
        </div>
        <ProfileEditModal
          apelido={profile.apelido}
          clubeCoracaoId={profile.clube_coracao_id}
          clubs={clubs ?? []}
          email={user.email ?? ""}
          telefone={profile.telefone}
          updateProfile={updateProfile}
        />
      </section>

      <section className="mb-5 grid grid-cols-3 gap-2" aria-label="Resumo do perfil">
        {[
          [roundsPlayed.toString(), "rodadas jogadas"],
          [averagePoints.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }), "média por rodada"],
          [(leaguesCount ?? 0).toString(), "ligas"],
        ].map(([value, label]) => <div className="rounded-xl bg-card px-3 py-2.5" key={label}><strong className="block text-lg font-extrabold tracking-tight text-foreground">{value}</strong><span className="block text-[11px] leading-4 text-muted-foreground">{label}</span></div>)}
      </section>

      <div className="grid gap-[18px]">
        <form action={updatePreferences} className="m-0 grid gap-2">
          <Section title="PREFERÊNCIAS">
            <ToggleRow icon={Bell} label="Resumo da rodada por whats" defaultChecked={profile.notificacoes_email} />
            <ToggleRow icon={Bell} label="Avisar antes da trava" defaultChecked disabled />
            <ToggleRow icon={Users} label="Novidades das minhas ligas" disabled />
          </Section>
          <button type="submit" className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Salvar preferências</button>
        </form>

        <Section title="SOBRE">
          <Link href="/como-funciona" className="flex min-h-14 items-center gap-3 border-b border-border px-3.5 !text-foreground transition hover:bg-muted"><BookOpen className="size-[19px] !text-muted-foreground" aria-hidden="true" /><span className="flex-1 text-[14.5px] font-semibold">Como funciona</span><ChevronRight className="size-[18px] text-muted-foreground" aria-hidden="true" /></Link>
          <details className="group border-b border-border last:border-b-0"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3.5 text-foreground [&::-webkit-details-marker]:hidden"><FileText className="size-[19px] text-muted-foreground" aria-hidden="true" /><span className="flex-1 text-[14.5px] font-semibold">Termos de uso</span><ChevronRight className="size-[18px] text-muted-foreground transition group-open:rotate-90" aria-hidden="true" /></summary><p className="px-3.5 pb-3 text-xs leading-5 text-muted-foreground">Termos aceitos{profile.termos_aceitos_em ? ` em ${new Intl.DateTimeFormat("pt-BR").format(new Date(profile.termos_aceitos_em))}` : ""}{profile.termos_versao ? ` · versão ${profile.termos_versao}` : ""}.</p></details>
          <details className="group"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3.5 text-foreground [&::-webkit-details-marker]:hidden"><Shield className="size-[19px] text-muted-foreground" aria-hidden="true" /><span className="flex-1 text-[14.5px] font-semibold">Privacidade</span><ChevronRight className="size-[18px] text-muted-foreground transition group-open:rotate-90" aria-hidden="true" /></summary><p className="px-3.5 pb-3 text-xs leading-5 text-muted-foreground">Seus dados de perfil e escalações ficam vinculados à sua conta. Você pode solicitar a exclusão permanentemente abaixo.</p></details>
        </Section>

        <Section title="SESSÃO">
          <form action={signOut} className="m-0"><button type="submit" className="flex min-h-14 w-full items-center gap-3 px-3.5 text-left text-[14.5px] font-semibold text-foreground transition hover:bg-muted"><LogOut className="size-[19px] text-muted-foreground" aria-hidden="true" /><span className="flex-1">Sair da conta</span><ChevronRight className="size-[18px] text-muted-foreground" aria-hidden="true" /></button></form>
          <details className="group border-t border-border"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3.5 text-destructive [&::-webkit-details-marker]:hidden"><Trash2 className="size-[19px]" aria-hidden="true" /><span className="flex-1 text-[14.5px] font-semibold">Excluir conta</span><ChevronRight className="size-[18px] text-destructive/70 transition group-open:rotate-90" aria-hidden="true" /></summary><form action={deleteAccount} className="m-0 grid gap-3 px-3.5 pb-4"><p className="text-xs leading-5 text-muted-foreground">Esta ação remove permanentemente seu perfil, suas escalações e seu acesso.</p><label className="grid gap-1.5 text-xs font-semibold text-foreground">Digite <strong>EXCLUIR</strong> para confirmar<input name="confirmacao" required autoComplete="off" className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring" /></label><button type="submit" className="h-10 rounded-xl bg-destructive px-4 text-sm font-bold text-destructive-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Excluir minha conta</button></form></details>
        </Section>
      </div>

      <p className="mt-6 px-4 text-center text-[11px] leading-4 text-muted-foreground">escalei · beta · produto independente, sem vínculo com clubes ou ligas.</p>
    </main>
  );
}
