import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { ChalkUnderline } from "@/app/_landing/chalk";
import {
  BalanceSection, commonFaqs, DemoSection, type Faq, FaqSection, FinalCta, FreeBadge, GroupsSection, HowItWorksSection, LandingFooter, LandingHeader,
  LandingShell, PricingSection, ProvocationSection, SignUpCard,
} from "@/app/_landing/sections";
import { anchorSection, container, displayType, stripes, textLink } from "@/app/_landing/styles";

export const metadata: Metadata = {
  title: "Escalou | Mostre que você entende de futebol",
  description: "Monte seu time a cada rodada do Brasileirão e dispute com a sua turma. Grátis, sem apostas e sem prêmio em dinheiro, só resenha.",
};

const faqs: Faq[] = [
  ["Como eu entro?", "Toque em \"Criar meu time\", entre com sua conta do Google e escolha um apelido. Você já entra no ranking geral e ganha 2 passes de presente."],
  ...commonFaqs,
];

export default async function LandingPage() {
  // Quem já está logado vai direto para a página inicial do app.
  if (await getCurrentUser()) redirect("/inicio");

  return (
    <LandingShell>
      <LandingHeader />

      <main>
        <section id="comecar" aria-labelledby="hero-titulo" className={`${stripes} ${anchorSection}`}>
          <div className={`${container} grid items-center gap-8 pb-12 pt-7 md:grid-cols-[minmax(0,1fr)_minmax(0,460px)] md:gap-16 md:py-16 lg:min-h-[780px]`}>
            <div>
              <FreeBadge />
              <h1 id="hero-titulo" className={`${displayType} mt-[18px] text-[72px] leading-[0.88] tracking-[0.3px] md:mt-[22px] md:text-[clamp(80px,7.5vw,120px)] md:leading-[0.86]`}>
                <span className="text-(--giz)">Mostre que você</span> <span className="text-primary">entende de futebol.</span>
              </h1>
              <ChalkUnderline className="mt-1.5 w-[230px] text-primary md:mt-2 md:h-[18px] md:w-[520px]" />
              <p className="mt-4 max-w-[34rem] text-lg text-muted-foreground md:mt-5 md:text-[22px]">
                Monte seu time a cada rodada do Brasileirão e dispute com a sua turma. Sem apostas, sem prêmio em dinheiro, só resenha.
              </p>
              <a href="#como-funciona" className={`${textLink} mt-4 text-base underline decoration-primary underline-offset-[5px] md:mt-6 md:text-lg`}>Como funciona</a>
            </div>

            <SignUpCard description="Entre com o Google, escolha um apelido e monte seu time pra próxima rodada. É de graça." />
          </div>
        </section>

        <ProvocationSection />
        <HowItWorksSection />
        <DemoSection />
        <GroupsSection />
        <BalanceSection />
        <PricingSection />
        <FaqSection faqs={faqs} />
        <FinalCta />
      </main>

      <LandingFooter />
    </LandingShell>
  );
}
