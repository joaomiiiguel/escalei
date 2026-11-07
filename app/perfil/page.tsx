import { BookOpen, ChevronRight, FileText, Mail, Phone, ScrollText, Shield } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PushToggle } from "@/components/pwa/push-toggle";
import { Logo } from "@/components/ui/logo";
import { quietPanel, scoreboard } from "@/components/ui/scoreboard";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { profileStats, type ProfileLeague, type ProfileTeam } from "@/lib/profile-stats";
import { signOut, updateProfile } from "./actions";
import { MemberCard } from "./member-card";
import { ProfileEditModal } from "./profile-edit-modal";
import { SignOutButton } from "./sign-out-button";

type ProfilePageProps = {
  searchParams: Promise<{ atualizado?: string; email_pendente?: string; erro?: string }>;
};

const errorMessages: Record<string, string> = {
  apelido: "Use de 3 a 20 caracteres no apelido: letras, números, ponto ou _.",
  telefone: "Informe um WhatsApp brasileiro com DDD ou deixe o campo em branco.",
  email: "Não foi possível atualizar o e-mail. Confira o endereço e tente de novo.",
  indisponivel: "Este apelido ou WhatsApp já está em uso.",
};

/** Painel com título de placar e linhas separadas por traços finos. */
function Panel({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section className={`${quietPanel} px-4 pb-1 pt-4`} aria-labelledby={id}>
    <h2 id={id} className={`${scoreboard} text-[22px] uppercase leading-none`}>{title}</h2>
    <div className="mt-1 divide-y divide-border/70">{children}</div>
  </section>;
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return <div className="flex min-h-14 items-center gap-3 py-2">
    <Icon className="size-5 shrink-0 text-giz/60" aria-hidden="true" />
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] text-giz/60">{label}</span>
      <span className="block truncate text-[15px] font-semibold">{value}</span>
    </span>
  </div>;
}

function LinkRow({ href, icon: Icon, label, detail }: { href: string; icon: typeof Mail; label: string; detail?: string | null }) {
  return <Link href={href} className="flex min-h-14 items-center gap-3 py-2 !text-giz outline-none transition-colors hover:!text-primary focus-visible:ring-2 focus-visible:ring-giz">
    <Icon className="size-5 shrink-0 text-giz/60" aria-hidden="true" />
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-semibold">{label}</span>
      {detail && <span className="block text-[13px] text-giz/60">{detail}</span>}
    </span>
    <ChevronRight className="size-5 shrink-0 text-giz/50" aria-hidden="true" />
  </Link>;
}

export default async function Profile({ searchParams }: ProfilePageProps) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const [leagueMembershipStatus, { data: profile }, { data: teams }, { data: memberships }, { data: clubs }] = await Promise.all([
    getLeagueMembershipStatus(user.id),
    supabase
      .from("perfis")
      .select("apelido, email, telefone, termos_aceitos_em, termos_versao, clube_coracao_id, criado_em")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("times").select("pontos, rodadas(status)").eq("usuario_id", user.id),
    supabase.from("ligas_membros").select("ligas(arquivada_em)").eq("usuario_id", user.id),
    supabase.from("clubes").select("id, nome, sigla, logo_url").eq("ativo", true).order("nome"),
  ]);

  if (leagueMembershipStatus !== "ATIVA") redirect(`/entrar?erro=${leagueMembershipStatus === "INATIVA" ? "grupo_inativado" : "sem_liga"}`);
  if (!profile) redirect("/onboarding");

  const favoriteClub = clubs?.find((club) => club.id === profile.clube_coracao_id) ?? null;
  const params = await searchParams;
  const errorMessage = params.erro ? errorMessages[params.erro] ?? "Não foi possível concluir a operação. Revise os dados e tente de novo." : null;
  const stats = profileStats((teams ?? []) as unknown as ProfileTeam[], (memberships ?? []) as unknown as ProfileLeague[]);
  const termsDetail = profile.termos_aceitos_em
    ? `Aceitos em ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(profile.termos_aceitos_em))}${profile.termos_versao ? `, versão ${profile.termos_versao}` : ""}`
    : null;
  const notice = "rounded-[14px] border px-3.5 py-3 text-[15px] font-semibold";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-32 pt-4 font-(family-name:--font-body) text-giz antialiased">
      <header className="pr-12">
        <Logo size="sm" href="/inicio" priority alt="Escalou, início" />
      </header>

      {params.atualizado && <p role="status" className={`${notice} border-primary/40 bg-primary/10 text-primary`}>Perfil atualizado.</p>}
      {params.email_pendente && <p role="status" className={`${notice} border-warning/40 bg-warning/10 text-warning`}>Confira seu e-mail para confirmar o novo endereço.</p>}
      {errorMessage && <p role="alert" className={`${notice} border-destructive-foreground/30 bg-destructive text-destructive-foreground`}>{errorMessage}</p>}

      <MemberCard
        apelido={profile.apelido}
        club={favoriteClub}
        memberSince={profile.criado_em}
        stats={stats}
        action={<ProfileEditModal apelido={profile.apelido} clubeCoracaoId={profile.clube_coracao_id} clubs={clubs ?? []} email={profile.email} telefone={profile.telefone} updateProfile={updateProfile} />}
      />

      <Panel id="perfil-notificacoes" title="Notificações">
        <PushToggle description="Avisamos neste aparelho quando o mercado abrir, 1 hora antes de fechar, quando fechar e quando a rodada terminar." vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      </Panel>

      <Panel id="perfil-conta" title="Conta">
        {profile.email && <InfoRow icon={Mail} label="E-mail de login" value={profile.email} />}
        <InfoRow icon={Phone} label="WhatsApp" value={profile.telefone ?? "Não informado"} />
        <form action={signOut} className="m-0"><SignOutButton /></form>
      </Panel>

      <Panel id="perfil-sobre" title="Sobre o Escalou">
        <LinkRow href="/como-funciona" icon={BookOpen} label="Como funciona" />
        <LinkRow href="/termos" icon={FileText} label="Termos de uso" detail={termsDetail} />
        <LinkRow href="/privacidade" icon={Shield} label="Privacidade" detail="Para excluir a conta, fale com o administrador do seu grupo." />
        <LinkRow href="/regulamento" icon={ScrollText} label="Regulamento do teste" />
      </Panel>

      <p className="px-4 text-center text-[13px] leading-snug text-giz/55">Escalou em fase de testes. Produto independente, sem vínculo com clubes ou ligas.</p>
    </main>
  );
}
