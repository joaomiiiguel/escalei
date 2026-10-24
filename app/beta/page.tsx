import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Flag,
  MessageCircle,
  Trophy,
  UsersRound,
  Whistle,
} from "lucide-react";
import { WaitlistForm } from "./waitlist-form";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Escalou Beta | Fantasy gratuito para disputar com amigos",
  description: "Entre na lista de espera do Escalou, o fantasy gratuito do Brasileirão para disputar em ligas privadas com amigos.",
};

const navItems = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#para-sua-turma", label: "Para sua turma" },
];

const painCards = [
  {
    icon: ClipboardList,
    title: "Escale em poucos minutos",
    text: "Escolha 11 jogadores antes da rodada travar.",
  },
  {
    icon: Whistle,
    title: "Acompanhe jogo a jogo",
    text: "Os pontos aparecem quando cada partida termina.",
  },
  {
    icon: Trophy,
    title: "Suba no ranking da turma",
    text: "Veja quem acertou e quem vai ouvir provocação no grupo.",
  },
];

const steps = [
  {
    title: "Entre para o beta",
    text: "Cadastre-se na lista de espera e receba o convite do grupo oficial.",
  },
  {
    title: "Monte seu time",
    text: "Comece com C$ 60 e escolha 11 jogadores dentro do seu saldo.",
  },
  {
    title: "Dispute com a turma",
    text: "Acompanhe seus pontos e suba no ranking da liga.",
  },
];

const rules = [
  "11 jogadores por rodada",
  "Formações 4-3-3, 4-4-2 ou 3-5-2",
  "Saldo inicial de C$ 60",
  "Pontos liberados após cada jogo terminar",
  "Ranking atualizado a cada jogo encerrado",
  "Ligas privadas para disputar com amigos",
  "Gratuito e sem prêmio em dinheiro",
];

const audiences = [
  "Resenha do trabalho",
  "Grupo da faculdade",
  "Pelada de domingo",
  "Família",
  "Amigos que não param de falar de futebol",
  "Grupo de WhatsApp que já discute toda rodada",
];

const faqs = [
  ["É gratuito?", "Sim. O beta do Escalou é gratuito."],
  [
    "Tem aposta ou prêmio em dinheiro?",
    "Não. O Escalou é um fantasy gratuito para competir com amigos, sem apostas e sem premiação em dinheiro.",
  ],
  [
    "Como entro no beta?",
    "Cadastre-se na lista de espera. Quando novas vagas forem abertas, você poderá receber um convite para o grupo oficial de WhatsApp do beta.",
  ],
  [
    "Preciso entender muito de futebol?",
    "Não. Quem acompanha o Brasileirão já consegue começar. A graça é testar suas escolhas contra a turma.",
  ],
  ["Posso jogar com meus amigos?", "Sim. O Escalou foi pensado para ligas privadas, grupos de amigos e resenhas de futebol."],
];

export default function BetaLandingPage() {
  return (
    <main id="inicio" className="min-h-screen bg-[#050806] text-foreground">
      <Header />
      <section className="relative overflow-hidden pt-24">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,229,138,0.22),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(255,213,74,0.10),transparent_24%)]" />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:px-8 lg:pb-24 lg:pt-14">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
                Beta fechado · Brasileirão
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
                Todo mundo entende de futebol. Até a rodada começar.
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-bold leading-7 text-[#c4d8ca]">
                Monte seu time, desafie a sua turma e descubra quem realmente manja de Brasileirão.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#9fb7a8]">
                Entre na lista de espera do Escalou e receba o convite para o grupo oficial do beta no WhatsApp.
              </p>
              <div className="mt-7">
                <Cta href="#lista-de-espera">Entrar na lista de espera</Cta>
                <p className="mt-3 text-sm font-bold text-[#7f9b89]">Gratuito. Sem apostas. Convites liberados aos poucos.</p>
              </div>
            </div>
            <PhoneMockup />
          </div>
          <WaitlistForm />
        </div>
      </section>

      <Section id="identificacao" eyebrow="Resenha com placar" title="O grupo já fala de futebol. Agora falta decidir quem entende mais." subtitle="Transforme a resenha da rodada em uma disputa que dura até o último jogo.">
        <div className="grid gap-4 md:grid-cols-3">
          {painCards.map(({ icon: Icon, title, text }) => (
            <article className="rounded-2xl border border-[#254232] bg-[#101d16] p-5" key={title}>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-black tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#a5bdae]">{text}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="como-funciona" tone="panel" eyebrow="Como funciona" title="Da escalação à resenha em 3 passos">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article className="rounded-2xl border border-[#254232] bg-[#101d16] p-5" key={step.title}>
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-base font-black text-primary-foreground">
                {index + 1}
              </div>
              <h3 className="mt-5 text-xl font-black tracking-tight">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#a5bdae]">{step.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 flex gap-3 rounded-2xl border border-[#ffd54a55] bg-[#ffd54a14] p-4 text-sm font-extrabold leading-6 text-[#ffd54a]">
          <Clock3 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          A escalação trava no início do primeiro jogo da rodada.
        </div>
      </Section>

      <section className="bg-[#073a24] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">O ponto é a provocação</p>
            <h2 className="mt-4 max-w-4xl text-3xl font-black leading-tight tracking-[-0.03em] sm:text-5xl">
              Não é sobre ganhar dinheiro. É sobre ganhar da sua liga.
            </h2>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-[#cdeedd]">
              Sem odds, sem depósito e sem enrolação. Só futebol, estratégia e aquela mensagem no grupo quando você passa seu amigo no ranking.
            </p>
            <p className="mt-3 text-sm font-bold text-[#9dddba]">Vagas liberadas por convite.</p>
          </div>
          <Cta href="#lista-de-espera">Quero entrar no beta</Cta>
        </div>
      </section>

      <Section id="regras" eyebrow="Regras rápidas" title="O básico para começar">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#254232] bg-[#101d16] p-4" key={rule}>
              <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm font-extrabold leading-5">{rule}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="para-sua-turma" tone="panel" eyebrow="Para sua turma" title="Feito para quem vive o Brasileirão com amigos">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((item) => (
            <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#13281b] p-4" key={item}>
              <MessageCircle className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm font-extrabold">{item}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-2xl font-black tracking-tight text-primary">Você entra no beta. A turma faz o resto.</p>
      </Section>

      <Section id="faq" eyebrow="FAQ" title="Perguntas rápidas">
        <div className="grid gap-3">
          {faqs.map(([question, answer]) => (
            <details className="group rounded-2xl border border-[#254232] bg-[#101d16] p-5 open:border-primary/40" key={question}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {question}
                <ChevronDown className="size-5 shrink-0 text-primary transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-4 text-sm leading-6 text-[#a5bdae]">{answer}</p>
            </details>
          ))}
        </div>
      </Section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-primary/25 bg-[#073a24] p-6 text-center sm:p-10">
          <h2 className="text-3xl font-black leading-tight tracking-[-0.03em] sm:text-5xl">Quem vai mandar na sua resenha nesta rodada?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-[#cdeedd]">
            Entre na lista de espera e seja um dos primeiros a disputar o Brasileirão com a sua turma no Escalou.
          </p>
          <div className="mx-auto mt-7 max-w-sm">
            <Cta href="#lista-de-espera">Quero entrar na lista de espera</Cta>
          </div>
          <p className="mt-4 text-sm font-black text-[#9dddba]">Beta fechado · gratuito · sem apostas</p>
        </div>
      </section>

      <footer className="border-t border-[#172a20] bg-[#030604] px-4 py-9 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 text-sm text-[#8ca091] md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <Logo size="md" />
            <p className="mt-2 font-semibold">Fantasy de futebol gratuito para disputar com amigos.</p>
            <p className="mt-2">Produto independente. Sem vínculo com clubes, ligas ou entidades esportivas.</p>
            <p className="mt-1 font-bold">Sem apostas e sem prêmios em dinheiro.</p>
          </div>
          <nav aria-label="Links do rodapé" className="flex flex-wrap gap-4 font-extrabold text-primary">
            <a href="#como-funciona">Como funciona</a>
            <Link href="/termos">Termos</Link>
            <Link href="/privacidade">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#172a20] bg-[#050806]/95 backdrop-blur supports-[backdrop-filter]:bg-[#050806]/85">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo href="#inicio" size="md" />
        <nav aria-label="Navegação da landing" className="hidden items-center gap-6 text-sm font-bold text-[#a5bdae] md:flex">
          {navItems.map((item) => (
            <a className="transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href="#lista-de-espera"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Entrar no beta
        </a>
      </div>
    </header>
  );
}

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  tone = "default",
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone?: "default" | "panel";
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`${tone === "panel" ? "bg-[#0b1410]" : "bg-[#050806]"} px-4 py-14 sm:px-6 lg:px-8`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.03em] sm:text-5xl">{title}</h2>
          {subtitle ? <p className="mt-4 text-base font-semibold leading-7 text-[#a5bdae]">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-center text-sm font-black text-primary-foreground outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </a>
  );
}

function PhoneMockup() {
  const players = [
    ["left-[47%] top-[20%]", "bg-primary"],
    ["left-[28%] top-[33%]", "bg-[#4ade80]"],
    ["left-[66%] top-[33%]", "bg-[#4ade80]"],
    ["left-[18%] top-[51%]", "bg-[#2dd4bf]"],
    ["left-[47%] top-[51%]", "bg-[#2dd4bf]"],
    ["left-[76%] top-[51%]", "bg-[#2dd4bf]"],
    ["left-[28%] top-[70%]", "bg-[#60a5fa]"],
    ["left-[47%] top-[70%]", "bg-[#60a5fa]"],
    ["left-[66%] top-[70%]", "bg-[#60a5fa]"],
  ];

  return (
    <div className="mx-auto w-full max-w-[330px]">
      <div className="rounded-[32px] border-2 border-[#31513f] bg-[#050806] p-3 shadow-[0_34px_100px_rgba(0,229,138,0.12)]">
        <div className="rounded-[24px] bg-[#08150e] p-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <p className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">Rodada 29</p>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#789383]">Orçamento</p>
              <p className="text-lg font-black text-[#ffd54a]">C$ 60</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-primary">
              <Flag className="size-4" aria-hidden="true" />
              4-3-3
            </div>
          </div>
          <div className="relative mt-4 h-72 overflow-hidden rounded-2xl border border-[#1f6a42] bg-[#073a24]">
            <div className="absolute inset-x-0 top-1/2 h-px bg-[#2aa96666]" />
            <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#2aa96666]" />
            {players.map(([position, color], index) => (
              <div className={`absolute ${position} -translate-x-1/2 -translate-y-1/2`} key={index}>
                <div className={`size-7 rounded-full border border-white/80 ${color}`} />
                <div className="mx-auto mt-1 h-1 w-9 rounded-full bg-black/35" />
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-[#254232] bg-[#101d16] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-black">Liga da resenha</p>
              <UsersRound className="size-4 text-primary" aria-hidden="true" />
            </div>
            {[
              ["1", "Você", "84.2", "bg-[#ffd54a]"],
              ["2", "Rafa", "79.8", "bg-[#a5bdae]"],
              ["3", "Beto", "73.4", "bg-[#a5bdae]"],
            ].map(([place, name, points, color]) => (
              <div className="mt-2 flex items-center gap-2 text-xs font-black" key={place}>
                <span className={`flex size-6 items-center justify-center rounded-full text-[#04100a] ${color}`}>{place}</span>
                <span className="flex-1">{name}</span>
                <span className="text-primary">{points}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
