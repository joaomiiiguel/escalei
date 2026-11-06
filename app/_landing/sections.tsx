import Link from "next/link";
import { Info, Lock, MessageCircle, Plus, Whistle } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ChalkCircle, ChalkFilter, ChalkNotEqual, ChalkX } from "./chalk";
import { MarketDemo } from "./market-demo";
import { Shirt } from "./shirt";
import {
  anchorSection, body, card, container, display, displayType, eyebrow, ghostCta, lead, primaryCta, section, strongStripes, tag, textLink,
} from "./styles";
import { WaitlistForm } from "./waitlist-form";

// Conversa ilustrativa: nomes e mensagens inventados.
const chat = [
  { author: "Téo", text: "escalei o ATA do FLA de C$ 9 e ele começou no banco" },
  { author: "Bia", text: "olhou o mercado antes? kkkk" },
  { author: "você", text: "tô 14 pontos na frente. alguém me para", mine: true },
  { author: "Guga", text: "a rodada nem acabou. trava em 1h, cuidado com o MEI do PAL" },
];

const stepIcon = "size-12 text-(--giz) md:size-16";

const steps = [
  {
    title: "Escale 11",
    icon: <Shirt number={11} className="size-12 text-base md:size-16 md:text-xl" />,
    text: (
      <>
        Escolha 11 jogadores num esquema (4-3-3, 4-4-2 ou 3-5-2) usando o saldo, a moeda de mentira do jogo. Todo mundo começa com{" "}
        <strong className="font-bold tabular-nums text-(--giz)">C$ 60,00</strong>.
      </>
    ),
  },
  { title: "Trava 1h antes", icon: <Lock aria-hidden="true" className={stepIcon} strokeWidth={1.6} />, text: "Seu time fecha 1 hora antes do primeiro jogo da rodada. Depois disso, não dá mais pra mexer: é só torcer." },
  { title: "Pontos no apito final", icon: <Whistle aria-hidden="true" className={stepIcon} strokeWidth={1.6} />, text: "Quando o jogo acaba, seus jogadores ganham pontos. A classificação do grupo muda na mesma hora." },
];

// Ranking de exemplo: apelidos e pontos inventados.
const ranking = [
  { position: 1, name: "Bia", points: "312,4", move: 2 },
  { position: 2, name: "Guga", points: "298,0", move: -1 },
  { position: 3, name: "Você", points: "287,6", move: 1, you: true },
  { position: 4, name: "Téo", points: "251,2", move: -2 },
  { position: 5, name: "Lu", points: "240,8", move: 0 },
];

const balanceExample = [
  { player: "MEI do PAL", detail: "comprou por C$ 5,00 · fez 6,2 pontos", gain: "+C$ 1,20" },
  { player: "DEF do BOT", detail: "comprou por C$ 4,50 · fez 7,0 pontos", gain: "+C$ 2,50" },
  { player: "Um ATA de C$ 9", detail: "comprou por C$ 9,00 · fez 4,0 pontos", gain: "+C$ 0,00", zero: true },
];

export type Faq = readonly [question: string, answer: string];

export const commonFaqs: Faq[] = [
  ["Precisa baixar?", "Não precisa baixar nada. O Escalou funciona direto no navegador do celular, como o Chrome ou o Safari. Se quiser, dá pra colocar um atalho na tela inicial, igual a um aplicativo."],
  ["Até quando posso mexer no time?", "Até 1 hora antes do primeiro jogo da rodada. Até lá, pode trocar quantas vezes quiser. Depois, o time fecha."],
  ["E se o jogo for adiado?", "Os jogadores daquele jogo ficam com 0 pontos na rodada. Vale igual pra todo mundo do grupo."],
  ["Posso jogar com amigos que torcem pra outros times?", "Claro. O grupo é da turma, não do clube. Cada um torce pra quem quiser e escolhe os jogadores que quiser."],
  ["Isso é aposta?", "Não. Ninguém aposta e não tem prêmio em dinheiro. O que vale é ficar no topo do grupo e a resenha."],
  ["Quanto custa?", "Durante a fase de testes, é grátis. Depois, você paga por rodada no PIX: R$ 4,99 uma rodada ou R$ 19,99 um pacote com 5. E ganha 2 passes de presente pra começar."],
];

const whatsappInvite = `https://wa.me/?text=${encodeURIComponent("Bora montar um time no Escalou e disputar comigo a rodada do Brasileirão? https://jogueescalou.com.br")}`;

function Heading({ id, first, second, className = "text-[52px] md:text-[88px]" }: { id: string; first: string; second: string; className?: string }) {
  return (
    <h2 id={id} className={`${displayType} mt-2 leading-[0.9] md:mt-2.5 md:leading-[0.88] ${className}`}>
      <span className="text-(--giz)">{first}</span> <span className="text-primary">{second}</span>
    </h2>
  );
}

/** Fundo, fontes, cores e o filtro de giz das páginas públicas. */
export function LandingShell({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className={`${display.variable} ${body.variable} relative overflow-x-clip bg-background font-(family-name:--font-body) text-base leading-[1.45] text-(--giz) antialiased motion-safe:[html:has(&)]:scroll-smooth md:text-lg [--giz:var(--color-giz)] [--gramado:var(--color-gramado)] [--gramado-escuro:var(--color-gramado-escuro)]`}
    >
      <ChalkFilter />
      {children}
    </div>
  );
}

/** `ctaHref` é o destino de "Quero testar grátis": a página da lista de espera ou o formulário da própria página. */
export function LandingHeader({ ctaHref }: { ctaHref: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/88 backdrop-blur-md">
      <div className={`${container} flex h-16 items-center gap-2 md:h-[76px] md:gap-3`}>
        <span className="mr-auto">
          <Logo href="/" size="sm" priority className="md:h-9" alt="Escalou, página inicial" />
        </span>
        <nav aria-label="Seções" className="mr-6 hidden gap-7 lg:flex">
          <a className={`${textLink} text-base text-muted-foreground`} href="#como-funciona">Como funciona</a>
          <a className={`${textLink} text-base text-muted-foreground`} href="#grupos">Grupos</a>
          <a className={`${textLink} text-base text-muted-foreground`} href="#preco">Preço</a>
          <a className={`${textLink} text-base text-muted-foreground`} href="#perguntas">Perguntas</a>
        </nav>
        <Link href="/entrar" className={`${ghostCta} h-11 px-3.5 text-[15px] md:h-12 md:px-5 md:text-base`}>Entrar</Link>
        <Link href={ctaHref} aria-label="Quero testar grátis" className={`${primaryCta} h-11 rounded-xl px-3.5 text-[15px] md:h-12 md:px-[22px] md:text-base`}>
          <span aria-hidden="true" className="sm:hidden">Testar grátis</span>
          <span aria-hidden="true" className="hidden sm:inline">Quero testar grátis</span>
        </Link>
      </div>
    </header>
  );
}

export function FreeBadge() {
  return (
    <p className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-card/80 px-3 text-[13px] font-bold md:h-9 md:px-3.5 md:text-sm">
      <span aria-hidden="true" className="size-2 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
      Grátis na fase de testes · Sem apostas
    </p>
  );
}

export function ProvocationSection() {
  return (
    <section aria-labelledby="provocacao-titulo" className={section}>
      <div className={`${container} grid items-center gap-6 md:grid-cols-2 md:gap-20`}>
        <div>
          <Heading id="provocacao-titulo" first="Tem aquele amigo que escalou" second="sem olhar o mercado." />
          <p className={lead}>Todo grupo tem. Agora dá pra provar com número.</p>
        </div>
        <figure className="relative flex flex-col gap-2.5 rounded-2xl border border-border bg-(--gramado-escuro) px-3.5 py-4 md:gap-3 md:rounded-[20px] md:p-[22px]">
          <figcaption className="flex items-center justify-between border-b border-border pb-2.5 md:pb-3.5">
            <span className="flex items-center gap-2.5 md:gap-3">
              <span aria-hidden="true" className={`${displayType} flex size-9 items-center justify-center rounded-full border border-border bg-card text-lg text-primary md:size-11 md:text-[22px]`}>RT</span>
              <span>
                <span className="block text-[15px] font-extrabold md:text-[17px]">Resenha do Trabalho</span>
                <span className="block text-xs text-muted-foreground md:text-sm">Bia, Guga, Téo, Lu, você</span>
              </span>
            </span>
            <span className={tag}>Ilustração</span>
          </figcaption>
          {chat.map((message) => (
            <p
              key={message.text}
              className={`max-w-[80%] px-3 py-2 md:max-w-[74%] md:px-3.5 md:py-2.5 ${message.mine ? "self-end rounded-[14px_4px_14px_14px] bg-[#1d5a36]" : "self-start rounded-[4px_14px_14px_14px] bg-[#12331f]"}`}
            >
              {!message.mine && <span className="block text-xs font-extrabold text-primary md:text-[13px]">{message.author}</span>}
              <span className="block text-[15px] md:text-[17px]">{message.text}</span>
              {message.mine && <span className="block text-right text-[11px] text-muted-foreground md:text-xs">{message.author}</span>}
            </p>
          ))}
          <ChalkCircle className="absolute -right-1.5 top-[86px] h-[70px] w-24 text-primary md:-right-6 md:top-28 md:h-[90px] md:w-[130px]" />
        </figure>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="como-funciona" aria-labelledby="como-titulo" className={`${section} ${anchorSection} bg-(--gramado-escuro)`}>
      <div className={container}>
        <p className={eyebrow}>Como funciona</p>
        <Heading id="como-titulo" first="Três passos." second="Uma rodada inteira." className="text-[56px] md:text-[88px]" />
        <ol className="mt-7 grid gap-3.5 md:mt-12 md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => (
            <li key={step.title} className={`${card} flex gap-3.5 px-4 py-[18px] md:flex-col md:gap-4 md:p-7`}>
              <span className="flex shrink-0 items-start justify-between md:items-center">
                <span aria-hidden="true" className={`${displayType} hidden text-[72px] leading-none text-primary md:block`}>{index + 1}</span>
                {step.icon}
              </span>
              <span>
                <span className={`${displayType} block text-[30px] leading-none md:text-[40px]`}>
                  <span className="text-primary md:hidden">{index + 1} · </span>
                  {step.title}
                </span>
                <span className="mt-1.5 block text-muted-foreground md:mt-0">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function DemoSection() {
  return (
    <section aria-labelledby="demo-titulo" className={section}>
      <div className={container}>
        <p className="flex items-center gap-2">
          <span className={eyebrow}>Teste agora</span>
          <span className={tag}>Demonstração</span>
        </p>
        <Heading id="demo-titulo" first="Sua primeira janela" second="de contratações." />
        <p className={lead}>É só de brincadeira, com jogadores inventados. Toque num jogador pra colocar no seu time e veja quanto sobra.</p>
        <MarketDemo />
        <p className="mt-3.5 text-[13px] text-muted-foreground md:text-sm">
          Jogadores e preços inventados. As setinhas ▲▼ mostram se o preço subiu ou caiu. No jogo de verdade, aparecem os jogadores reais da rodada.
        </p>
      </div>
    </section>
  );
}

function WhatsappInvite({ className }: { className: string }) {
  return (
    <a href={whatsappInvite} target="_blank" rel="noopener noreferrer" className={`items-center gap-2.5 bg-whatsapp font-extrabold text-[#062e14] transition hover:bg-[#3be07a] outline-none focus-visible:ring-[3px] focus-visible:ring-(--giz) focus-visible:ring-offset-[3px] focus-visible:ring-offset-background ${className}`}>
      <MessageCircle className="size-[22px] md:size-6" aria-hidden="true" />
      Convidar pelo WhatsApp
    </a>
  );
}

export function GroupsSection() {
  return (
    <section id="grupos" aria-labelledby="grupos-titulo" className={`${section} ${anchorSection} bg-(--gramado-escuro)`}>
      <div className={`${container} grid items-center gap-6 md:grid-cols-2 md:gap-20`}>
        <div>
          <p className={eyebrow}>Grupos privados</p>
          <Heading id="grupos-titulo" first="Não é sobre ganhar dinheiro." second="É sobre ganhar do seu grupo." />
          <p className={`${lead} max-w-[32rem]`}>Crie um grupo, mande o convite no WhatsApp e pronto. Cada vez que um jogo termina, a classificação da turma muda.</p>
          <WhatsappInvite className="mt-6 hidden h-[60px] rounded-2xl px-7 text-lg md:inline-flex" />
        </div>
        <div>
          <div className={`${card} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 md:px-6 md:py-5">
              <div>
                <p className={`${displayType} text-2xl leading-none md:text-[34px]`}>Resenha do Trabalho</p>
                <p className="text-xs text-muted-foreground md:text-sm">Rodada 32 · 5 de 10 jogos já terminaram</p>
              </div>
              <span className={tag}>Exemplo</span>
            </div>
            <ol className="px-2 py-1.5 md:px-3.5 md:pb-3.5 md:pt-2.5" aria-label="Classificação de exemplo do grupo">
              {ranking.map((row) => (
                <li
                  key={row.name}
                  className={`my-1 flex min-h-[52px] items-center gap-3 rounded-xl border-[1.5px] px-2.5 md:min-h-16 md:gap-4 md:rounded-[14px] md:px-3.5 ${row.you ? "border-primary bg-primary/8" : "border-transparent"}`}
                >
                  <span className={`${displayType} w-[22px] text-[26px] tabular-nums md:w-7 md:text-[34px] ${row.position === 1 ? "text-primary" : ""}`}>{row.position}</span>
                  <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-(--gramado) text-[13px] font-extrabold md:size-10 md:text-[15px]">{row.name[0]}</span>
                  <span className="flex-1 font-bold md:text-[19px]">{row.name}</span>
                  <span className={`text-xs font-extrabold tabular-nums md:text-sm ${row.move > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    <span aria-hidden="true">{row.move > 0 ? `▲ ${row.move}` : row.move < 0 ? `▼ ${-row.move}` : "–"}</span>
                    <span className="sr-only">{row.move > 0 ? `subiu ${row.move}` : row.move < 0 ? `caiu ${-row.move}` : "manteve a posição"}</span>
                  </span>
                  <span className="w-[58px] text-right font-extrabold tabular-nums md:w-[76px] md:text-xl">{row.points}</span>
                </li>
              ))}
            </ol>
          </div>
          <WhatsappInvite className="mt-4 flex h-14 justify-center rounded-[14px] text-[17px] md:hidden" />
        </div>
      </div>
    </section>
  );
}

export function BalanceSection() {
  return (
    <section aria-labelledby="saldo-titulo" className={section}>
      <div className={`${container} grid gap-5 md:grid-cols-2 md:gap-20`}>
        <div>
          <p className={eyebrow}>Saldo C$</p>
          <Heading id="saldo-titulo" first="Seu saldo" second="só cresce." className="text-[56px] md:text-[96px]" />
          <p className={lead}>
            No fim da rodada, cada jogador te dá a diferença entre os pontos que ele fez e o preço que você pagou. Foi mal? Não ganha nada, mas também não perde nada.
          </p>
          <div className="mt-5 rounded-2xl border border-dashed border-(--giz)/35 bg-(--gramado-escuro) px-4 py-[18px] text-center md:mt-7 md:rounded-[20px] md:p-[26px] md:text-left">
            <p className="text-xs font-bold uppercase tracking-[1.5px] text-muted-foreground md:text-[13px]">Cada jogador te dá</p>
            <p className={`${displayType} mt-1.5 text-[40px] leading-none md:mt-2 md:text-[60px]`}>
              <span className="text-primary">Pontos</span> − preço pago
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground md:mt-2 md:text-[15px]">Deu negativo? Conta zero. Seu saldo nunca cai.</p>
          </div>
        </div>
        <div>
          <dl className={`${card} px-4 py-1.5 md:px-6 md:py-2`}>
            {balanceExample.map((row) => (
              <div key={row.player} className="flex items-center justify-between gap-3 border-b border-border py-3 md:py-[18px]">
                <dt>
                  <span className="block font-bold md:text-[19px]">{row.player}</span>
                  <span className="block text-[13px] tabular-nums text-muted-foreground md:text-[15px]">{row.detail}</span>
                </dt>
                <dd className={`font-bold tabular-nums md:text-[22px] ${row.zero ? "text-muted-foreground" : "text-primary"}`}>{row.gain}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 py-3.5 md:py-[22px]">
              <dt className="font-extrabold md:text-[19px]">Saldo da próxima rodada</dt>
              <dd className="tabular-nums">
                <span className="text-muted-foreground">C$ 60,00 →</span> <strong className="text-xl text-primary md:text-[30px]">C$ 63,70</strong>
              </dd>
            </div>
          </dl>
          <p className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-border px-3.5 py-3 text-sm text-muted-foreground md:mt-4 md:gap-3 md:rounded-[14px] md:px-[18px] md:py-4 md:text-base">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <strong className="text-(--giz)">C$ é de mentira: só vale dentro do jogo.</strong> Não dá pra sacar nem comprar com dinheiro de verdade. Os valores acima são só um exemplo.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section id="preco" aria-labelledby="preco-titulo" className={`${section} ${anchorSection} bg-(--gramado-escuro)`}>
      <div className={container}>
        <div className="grid gap-3 md:grid-cols-2 md:items-end md:gap-20">
          <div>
            <p className={eyebrow}>Transparência</p>
            <h2 id="preco-titulo" className={`${displayType} mt-2 text-[60px] leading-[0.9] md:mt-2.5 md:text-[104px] md:leading-[0.86]`}>
              <span className="text-(--giz)">Isso é aposta?</span> <span className="block text-primary">Não.</span>
            </h2>
          </div>
          <p className="text-[17px] text-muted-foreground md:text-[22px]">
            Ninguém aposta e ninguém ganha dinheiro. O que vale é ficar em primeiro no grupo e poder zoar a turma até a próxima rodada.
          </p>
        </div>
        <div className="mt-6 grid gap-3 md:mt-12 md:grid-cols-[1fr_120px_1fr] md:gap-0">
          <article className="rounded-2xl border-[1.5px] border-(--giz) bg-background px-4 py-[18px] md:rounded-[20px] md:border-2 md:p-8">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={`${displayType} text-[26px] md:text-[40px]`}>Passe de rodada</h3>
              <span className="flex h-7 items-center rounded-full bg-(--giz) px-2.5 text-[13px] font-extrabold text-background md:h-8 md:px-3 md:text-sm">R$ · dinheiro real</span>
            </header>
            <p className="mt-2.5 text-xl font-extrabold text-primary md:mt-3.5 md:text-[26px]">Grátis durante os testes.</p>
            <p className="mt-1 text-[15px] text-muted-foreground md:mt-1.5 md:text-lg">
              Depois dos testes, pra montar o time em cada rodada você usa um passe. Ele vale pra todos os seus grupos e é pago por PIX.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 md:mt-[18px] md:gap-3">
              <div className="flex flex-col-reverse rounded-xl border border-border px-3 py-2.5 md:rounded-[14px] md:p-4">
                <dt className="text-[13px] text-muted-foreground md:text-[15px]">uma rodada</dt>
                <dd className="text-[22px] font-extrabold tabular-nums md:text-[32px]">R$ 4,99</dd>
              </div>
              <div className="flex flex-col-reverse rounded-xl border border-border px-3 py-2.5 md:rounded-[14px] md:p-4">
                <dt className="text-[13px] text-muted-foreground md:text-[15px]">pacote com 5</dt>
                <dd className="text-[22px] font-extrabold tabular-nums md:text-[32px]">R$ 19,99</dd>
              </div>
            </dl>
            <p className="mt-2.5 text-sm md:mt-3.5 md:text-[17px]">+ 2 passes de presente pra começar.</p>
            <p className="mt-1.5 text-[13px] text-muted-foreground md:text-[15px]">A receita dos passes não vira prêmio de ninguém.</p>
          </article>
          <p className="flex items-center justify-center gap-2.5 px-2 text-center text-[13px] font-bold text-muted-foreground md:flex-col">
            <ChalkNotEqual className="text-(--giz) md:h-9 md:w-16" />
            uma coisa não tem nada a ver com a outra
          </p>
          <article className="rounded-2xl border-[1.5px] border-primary bg-card px-4 py-[18px] md:rounded-[20px] md:border-2 md:p-8">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={`${displayType} text-[26px] md:text-[40px]`}>Saldo</h3>
              <span className="flex h-7 items-center rounded-full bg-primary px-2.5 text-[13px] font-extrabold text-primary-foreground md:h-8 md:px-3 md:text-sm">C$ · moeda do jogo</span>
            </header>
            <p className="mt-2.5 text-xl font-extrabold tabular-nums text-primary md:mt-3.5 md:text-[26px]">Começa em C$ 60,00.</p>
            <p className="mt-1 text-[15px] text-muted-foreground md:mt-1.5 md:text-lg">
              Aumenta quando seus jogadores vão bem e serve só pra escolher jogadores. Não compra passe e não vira dinheiro.
            </p>
            <p className={`${displayType} mt-[18px] hidden rounded-[14px] border border-dashed border-border p-4 text-[30px] leading-[1.05] md:block`}>
              Saldo nunca diminui. <span className="block text-muted-foreground">Nem vira prêmio.</span>
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ faqs }: { faqs: Faq[] }) {
  return (
    <section id="perguntas" aria-labelledby="perguntas-titulo" className={`${section} ${anchorSection}`}>
      <div className={`${container} grid gap-5 md:grid-cols-[420px_minmax(0,1fr)] md:gap-20`}>
        <div>
          <p className={eyebrow}>Perguntas</p>
          <Heading id="perguntas-titulo" first="Antes de" second="escalar." className="text-[56px] md:text-[96px]" />
        </div>
        <div className="flex flex-col gap-2 md:gap-2.5">
          {faqs.map(([question, answer], index) => (
            <details key={question} open={index === 0} className="group rounded-[14px] border border-border transition-colors open:border-primary open:bg-card md:rounded-2xl">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-[14px] px-4 py-3.5 text-[17px] font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-(--giz) md:min-h-16 md:gap-4 md:px-[22px] md:py-[18px] md:text-xl [&::-webkit-details-marker]:hidden">
                {question}
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-primary md:size-9">
                  <Plus className="size-4 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none md:size-[18px]" strokeWidth={3} />
                </span>
              </summary>
              <p className="max-w-[45rem] px-4 pb-4 text-muted-foreground md:px-[22px] md:pb-5">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Fecha a página com um segundo formulário da lista de espera, para quem leu tudo não precisar voltar ao topo. */
export function FinalCta() {
  return (
    <section aria-labelledby="final-titulo" className={`relative overflow-hidden border-t border-border py-16 md:py-32 ${strongStripes}`}>
      <ChalkX className="absolute left-5 top-5 size-10 text-(--giz) opacity-50 md:left-[10%] md:top-14 md:size-[60px]" />
      <ChalkCircle className="absolute right-4 top-6 h-12 w-20 text-(--giz) opacity-50 md:right-[10%] md:top-16 md:h-[76px] md:w-[120px]" />
      <div className={`${container} relative`}>
        <div className="text-center">
          <h2 id="final-titulo" className={`${displayType} text-[64px] leading-[0.88] md:text-[clamp(96px,9.5vw,140px)] md:leading-[0.86]`}>
            <span className="text-(--giz)">Sua turma já tem opinião.</span> <span className="block text-primary">Agora tem ranking.</span>
          </h2>
          <p className="mt-3.5 text-sm text-muted-foreground md:mt-[18px] md:text-base">Grátis na fase de testes · Sem apostas · Sem prêmio em dinheiro</p>
        </div>
        <div className="mx-auto mt-8 max-w-[460px] rounded-[20px] border-2 border-primary bg-card p-5 shadow-[0_0_40px_rgb(197_249_32/0.14)] md:mt-12 md:p-8">
          <h3 className={`${displayType} text-[34px] leading-[0.9] md:text-[44px]`}>Entre na lista de espera</h3>
          <p className="mt-2 text-[15px] text-muted-foreground md:text-base">Quando abrir vaga, a gente te chama pro grupo oficial no WhatsApp.</p>
          <div className="mt-5 md:mt-6">
            <WaitlistForm />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border pb-12 pt-10 md:pb-16 md:pt-14">
      <div className={container}>
        <div className="flex flex-col gap-[18px] md:flex-row md:items-start md:justify-between md:gap-10">
          <Logo href="/" size="md" className="md:h-12" alt="Escalou, página inicial" />
          <div className="flex flex-col md:flex-row md:gap-7">
            <a className={textLink} href="https://instagram.com/jogue.escalou" target="_blank" rel="noopener noreferrer">@jogue.escalou</a>
            <a className={textLink} href="https://jogueescalou.com.br">JogueEscalou.com.br</a>
          </div>
          <nav aria-label="Links legais" className="flex flex-wrap gap-x-[18px] md:gap-6">
            <Link className={`${textLink} text-sm font-normal text-muted-foreground underline md:text-base`} href="/termos">Termos</Link>
            <Link className={`${textLink} text-sm font-normal text-muted-foreground underline md:text-base`} href="/privacidade">Privacidade</Link>
            <Link className={`${textLink} text-sm font-normal text-muted-foreground underline md:text-base`} href="/regulamento">Regulamento</Link>
          </nav>
        </div>
        <p className="mt-4 border-t border-border pt-4 text-[13px] text-muted-foreground md:mt-8 md:pt-6 md:text-sm">
          Projeto independente, sem vínculo com clubes, ligas ou entidades esportivas. Sem apostas e sem prêmio em dinheiro.
        </p>
      </div>
    </footer>
  );
}
