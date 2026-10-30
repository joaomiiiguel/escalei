import type { Metadata } from "next";
import { Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { MarketDemo } from "./market-demo";
import { TacticalBoard } from "./tactical-board";
import { WaitlistForm } from "./waitlist-form";
import { Logo } from "@/components/ui/logo";

const display = Sofia_Sans_Extra_Condensed({ subsets: ["latin"], weight: ["800", "900"], variable: "--font-display" });
const body = Sofia_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Escalou Beta | Sua nova aventura no Brasileirão",
  description: "Para quem curte futebol e quer viver o Brasileirão de um jeito novo: monte seu time e dispute com amigos em grupos privados. Beta gratuito, sem apostas e sem prêmio em dinheiro.",
};

const fans = [
  "Vê a rodada inteira, até o jogo de segunda à noite.",
  "Tem opinião sobre o time de todo mundo.",
  "Quer um motivo para ligar a TV mesmo quando o seu time não joga.",
  "Quer disputar com os amigos, sem aposta nenhuma.",
];

const steps = [
  {
    title: "Monte o time",
    text: "Comece com C$ 60 e escolha 11 jogadores em 4-3-3, 4-4-2 ou 3-5-2. Dá para mudar quantas vezes quiser até a trava.",
  },
  {
    title: "Feche antes da trava",
    text: "A escalação trava 1 hora antes do primeiro jogo da rodada. A partir daí, é com os seus jogadores.",
  },
  {
    title: "Viva a rodada",
    text: "Os pontos saem quando cada jogo termina, e o ranking do grupo atualiza. Na rodada seguinte, tudo recomeça.",
  },
];

const rules = [
  ["Time", "11 jogadores por rodada"],
  ["Saldo", "C$ 60 para começar, e cresce quando seu time rende mais do que custou"],
  ["Grupos", "Privados, só com quem você convidar"],
  ["Apostas", "Nenhuma. Sem prêmio em dinheiro"],
];

const pricing = [
  ["Durante o beta", "Gratuito"],
  ["Passe avulso", "R$ 4,99"],
  ["Pacote com 5", "R$ 19,99"],
];

const faqs = [
  [
    "Quanto custa?",
    "Nada durante o beta. Quando essa fase terminar, escalar passa a exigir um passe de rodada: R$ 4,99 o avulso ou R$ 19,99 o pacote com 5, pago por PIX. Você recebe 2 passes de cortesia para começar.",
  ],
  [
    "Tem aposta ou prêmio em dinheiro?",
    "Não. O Escalou é um fantasy para competir com amigos, sem apostas e sem premiação em dinheiro. O valor dos passes nunca forma prêmio.",
  ],
  [
    "Como entro no beta?",
    "Cadastre-se na lista de espera. Quando novas vagas forem abertas, você poderá receber um convite para o grupo oficial de WhatsApp do beta.",
  ],
  [
    "Preciso entender muito de futebol?",
    "Não. Quem acompanha o Brasileirão já consegue começar. A graça é testar suas escolhas contra a turma.",
  ],
  ["Posso jogar com meus amigos?", "Sim. O Escalou foi pensado para grupos privados de amigos e resenhas de futebol."],
];

const displayHeading = "font-(family-name:--font-display) font-black uppercase leading-[0.9]";
const sectionHeading = "text-[clamp(3.25rem,15vw,6rem)]";
const sectionGlow = "bg-[radial-gradient(ellipse_at_85%_0%,rgb(46_204_113/0.28),transparent_60%),linear-gradient(180deg,var(--gramado),var(--gramado-escuro))]";
// Revelação presa à rolagem: navegador sem scroll-driven animations só mostra o conteúdo.
const enter = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:fill-mode-both motion-safe:duration-700 motion-safe:ease-out";
const reveal = "motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:[animation-timeline:view()] motion-safe:[animation-range:entry_0%_entry_45%]";
const linkFocus = "outline-none focus-visible:ring-2 focus-visible:ring-(--lima)";
const primaryCta =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-[#e4ff66] to-[#a6e40c] font-bold relative overflow-hidden text-primary-foreground shadow-[0_10px_34px_rgb(197_249_32/0.35)] outline-none transition before:absolute before:inset-y-0 before:-left-1/2 before:w-1/3 before:-skew-x-20 before:bg-white/60 before:blur-sm before:transition-transform before:duration-700 hover:-translate-y-0.5 hover:brightness-110 hover:before:translate-x-[480%] active:translate-y-0 motion-reduce:before:hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-(--gramado)";

export default function BetaLandingPage() {
  return (
    <main
      id="inicio"
      className={`${display.variable} ${body.variable} min-h-screen bg-(--gramado-escuro) font-(family-name:--font-body) text-(--giz) antialiased motion-safe:[html:has(&)]:scroll-smooth [--giz-linha:rgb(243_247_232/0.24)] [--giz-suave:rgb(243_247_232/0.8)] [--giz:#f3f7e8] [--gramado-escuro:#06261a] [--gramado:#0d4a32] [--lima:#c5f920]`}
    >
      <Header />

      <Hero />

      <section id="para-quem" className="scroll-mt-14 bg-(--gramado-escuro) px-5 py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <div className={`group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_30px_80px_rgb(0_0_0/0.45)] motion-safe:zoom-in-90 ${reveal}`}>
            <Image
              src="/images/onboarding-ranking-do-grupo.png"
              alt="Três amigos abraçados de costas na arquibancada, vibrando com o jogo."
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover object-bottom transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-(--gramado-escuro)/70 via-transparent to-transparent" />
          </div>
          <div>
            <h2 className={`${displayHeading} ${sectionHeading}`}>Feito para quem não desliga do futebol</h2>
            <ul className="mt-6 border-t border-(--giz-linha)">
              {fans.map((fan) => (
                <li className={`border-b border-(--giz-linha) py-4 text-xl font-semibold leading-tight sm:text-2xl motion-safe:slide-in-from-right-10 ${reveal}`} key={fan}>
                  {fan}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Section id="mercado" tone="glow" title="Sua primeira janela de contratações" subtitle="Cada reforço pesa no saldo. Tente agora: é assim que a escalação funciona no Escalou.">
        <MarketDemo />
      </Section>

      <Section id="como-funciona" title="Toda rodada é uma nova partida">
        <div className="grid gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-center md:gap-16">
          <ol className="grid gap-8">
            {steps.map((step, index) => (
              <li className={`flex gap-5 motion-safe:slide-in-from-left-10 ${reveal}`} key={step.title}>
                <p className={`${displayHeading} w-12 shrink-0 bg-gradient-to-b from-[#e4ff66] to-[#2ecc71] bg-clip-text text-7xl text-transparent`}>{index + 1}</p>
                <div>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                  <p className="mt-1 text-lg leading-relaxed text-(--giz-suave)">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-2xl bg-gradient-to-b from-[#17794f] to-[#0d4a32] p-4 shadow-[0_30px_80px_rgb(0_0_0/0.45)]">
            <TacticalBoard />
          </div>
        </div>
      </Section>

      <Section id="regras" tone="glow" title="O básico para começar">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <Rows caption="Regras" rows={rules} />
          <div>
            <Rows caption="Beta gratuito, depois passes" rows={pricing} />
            <p className="mt-4 text-base leading-relaxed text-(--giz-suave)">
              Quando o beta acabar, escalar passa a exigir um passe de rodada, e você recebe 2 de cortesia para começar. Cada passe vale para todos os seus grupos, é pago por PIX e só é gasto se você escalar.
            </p>
          </div>
        </div>
      </Section>

      <section id="para-sua-turma" className="relative isolate scroll-mt-16 overflow-hidden px-5 py-24 sm:py-32">
        <Image
          src="/images/onboarding-pontos-no-apito-final.png"
          alt=""
          fill
          sizes="100vw"
          className="-z-20 scale-125 object-cover object-bottom md:object-[50%_72%] motion-safe:animate-in motion-safe:slide-in-from-top-16 motion-safe:fill-mode-both motion-safe:[animation-range:cover] motion-safe:[animation-timeline:view()]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-(--gramado-escuro) via-(--gramado-escuro)/90 to-(--gramado-escuro)/30 md:bg-gradient-to-r md:via-(--gramado-escuro)/80 md:to-(--gramado-escuro)/20" />
        <div className="mx-auto max-w-7xl">
          <h2 className={`${displayHeading} max-w-4xl text-[clamp(3.75rem,10vw,8.5rem)] motion-safe:slide-in-from-left-12 ${reveal}`}>
            Não é sobre ganhar dinheiro. É sobre ganhar do seu grupo.
          </h2>
          <p className="mt-6 max-w-2xl text-xl font-semibold leading-snug">
            Sem odds, sem prêmio e sem enrolação. Leve a resenha do trabalho, o grupo da faculdade, a pelada de domingo e a família que discute toda rodada.
          </p>
        </div>
      </section>

      <Section id="faq" title="Perguntas rápidas">
        <div className="max-w-3xl border-t border-(--giz-linha)">
          {faqs.map(([question, answer]) => (
            <details className="group border-b border-(--giz-linha)" key={question}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-(--lima) [&::-webkit-details-marker]:hidden">
                {question}
                <Plus className="size-6 shrink-0 text-(--lima) transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <p className="pb-4 text-lg leading-relaxed text-(--giz-suave) motion-safe:group-open:animate-in motion-safe:group-open:fade-in motion-safe:group-open:slide-in-from-top-2">{answer}</p>
            </details>
          ))}
        </div>
      </Section>

      <section id="lista-de-espera" className={`scroll-mt-16 px-5 py-16 sm:py-24 ${sectionGlow}`}>
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className={`${displayHeading} ${sectionHeading}`}>Sua aventura começa na próxima rodada</h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-(--giz-suave)">
              O beta é gratuito. Entre na lista de espera e receba o convite para o grupo oficial no WhatsApp.
            </p>
          </div>
          <WaitlistForm />
        </div>
      </section>

      <footer className="border-t border-(--giz-linha) bg-(--gramado-escuro) px-5 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 text-base leading-relaxed text-(--giz-suave) md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <Logo size="sm" href="#inicio" />
            <p className="mt-3">Fantasy do Brasileirão para disputar com amigos. Sem apostas e sem prêmios em dinheiro.</p>
            <p>Produto independente. Sem vínculo com clubes, ligas ou entidades esportivas.</p>
          </div>
          <nav aria-label="Links do rodapé" className="flex flex-wrap gap-x-5 gap-y-2">
            <a className={`hover:text-(--giz) ${linkFocus}`} href="#como-funciona">Como funciona</a>
            <Link className={`hover:text-(--giz) ${linkFocus}`} href="/termos">Termos</Link>
            <Link className={`hover:text-(--giz) ${linkFocus}`} href="/privacidade">Privacidade</Link>
            <Link className={`hover:text-(--giz) ${linkFocus}`} href="/regulamento">Regulamento</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function Hero() {
  const common = { alt: "", fill: true, sizes: "100vw", priority: true };
  const { props: { srcSet: wide } } = getImageProps({ ...common, src: "/bg-w.webp" });
  const { props: narrow } = getImageProps({ ...common, src: "/bg-m.webp" });

  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden px-5 pb-48 pt-24 md:pb-40 lg:pt-32">
      <div className="absolute inset-x-0 -top-28 bottom-0 -z-20 motion-safe:animate-out motion-safe:slide-out-to-bottom-28 motion-safe:fill-mode-both motion-safe:[animation-timeline:scroll()] motion-safe:[animation-range:0_100vh]">
        <picture>
          <source media="(min-width: 768px)" srcSet={wide} sizes="100vw" />
          <img {...narrow} alt="" className="object-cover object-bottom motion-safe:animate-in motion-safe:zoom-in-110 motion-safe:duration-[9000ms] motion-safe:ease-out" />
        </picture>
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-(--gramado-escuro)/70 via-(--gramado-escuro)/25 to-(--gramado-escuro)/10 md:bg-gradient-to-r md:from-(--gramado-escuro)/80 md:via-(--gramado-escuro)/35 md:to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-1/4 left-[12%] -z-10 h-[140%] w-1/3 origin-top -rotate-[24deg] bg-gradient-to-b from-(--lima)/30 to-transparent blur-3xl mix-blend-screen motion-safe:animate-pulse motion-safe:[animation-duration:6s]" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-1/4 right-[12%] -z-10 h-[140%] w-1/3 origin-top rotate-[24deg] bg-gradient-to-b from-[#2ecc71]/35 to-transparent blur-3xl mix-blend-screen motion-safe:animate-pulse motion-safe:[animation-delay:1.5s] motion-safe:[animation-duration:8s]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-(--gramado-escuro) to-transparent" />
      <div className="mx-auto w-full max-w-7xl">
        <h1 className={`${displayHeading} max-w-4xl text-[clamp(4.25rem,19.5vw,6rem)] md:text-[clamp(5.5rem,9vw,8.5rem)]`}>
          <span className={`block [text-shadow:0_4px_30px_rgb(0_0_0/0.45)] ${enter}`}>Você já vive futebol.</span>{" "}
          <span className={`block bg-gradient-to-r from-[#e4ff66] to-[#4fe08a] bg-clip-text text-transparent motion-safe:delay-200 ${enter}`}>Agora entre em campo.</span>
        </h1>
        <p className={`mt-6 max-w-xl text-xl leading-snug text-(--giz) sm:text-2xl motion-safe:delay-500 ${enter}`}>
          O Escalou é uma nova aventura no Brasileirão: monte seu time, desafie a sua turma e descubra quem realmente manja.
        </p>
        <div className={`motion-safe:delay-700 ${enter}`}>
          <a href="#lista-de-espera" className={`${primaryCta} mt-7 min-h-14 w-full px-8 text-lg sm:w-auto`}>
            Entrar na lista de espera
          </a>
          <p className="mt-3 text-base font-semibold text-(--giz)">Beta fechado e gratuito. Sem apostas e sem prêmio em dinheiro.</p>
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-(--giz-linha) bg-(--gramado-escuro)/80 backdrop-blur-lg">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-4 px-5">
        <Logo href="#inicio" size="sm" priority />
        <nav aria-label="Navegação da landing" className="hidden items-center gap-7 text-base font-semibold text-(--giz-suave) md:flex">
          <a className={`hover:text-(--giz) ${linkFocus}`} href="#para-quem">Para quem é</a>
          <a className={`hover:text-(--giz) ${linkFocus}`} href="#mercado">Mercado</a>
          <a className={`hover:text-(--giz) ${linkFocus}`} href="#como-funciona">Como funciona</a>
        </nav>
        <a href="#lista-de-espera" className={`${primaryCta} min-h-10 px-4 text-base`}>
          Entrar no beta
        </a>
      </div>
    </header>
  );
}

function Section({
  id,
  title,
  subtitle,
  tone = "default",
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  tone?: "default" | "glow";
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-14 px-5 py-16 sm:py-24 ${tone === "glow" ? sectionGlow : ""}`}>
      <div className="mx-auto max-w-7xl">
        <div className={`mb-10 max-w-3xl motion-safe:slide-in-from-bottom-10 ${reveal}`}>
          <h2 className={`${displayHeading} ${sectionHeading}`}>{title}</h2>
          {subtitle ? <p className="mt-4 text-xl leading-relaxed text-(--giz-suave)">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function Rows({ caption, rows }: { caption: string; rows: string[][] }) {
  return (
    <div>
      <h3 className="pb-3 text-2xl font-bold">{caption}</h3>
      <dl className="border-t border-(--giz-linha)">
        {rows.map(([label, value]) => (
          <div className="flex items-baseline justify-between gap-6 border-b border-(--giz-linha) py-3" key={label}>
            <dt className="shrink-0 text-lg text-(--giz-suave)">{label}</dt>
            <dd className="text-right text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
