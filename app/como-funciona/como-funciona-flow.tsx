"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/button";
import { SlideIllustration } from "./slide-illustration";

const slides = [
  {
    title: "Monte seu time em 3 minutos",
    description: "Escolha 11 jogadores do Brasileirão com C$ 100 de orçamento. Sem taxa, sem cartão, sem aposta.",
  },
  {
    title: "Acompanhe cada rodada",
    description: "Sua escalação pontua com o desempenho real dos jogadores em campo. Escale antes da trava da rodada.",
  },
  {
    title: "Dispute com a galera",
    description: "Compare sua pontuação no ranking e entre em ligas com seus amigos para acompanhar o Brasileirão juntos.",
  },
];

const READING_TIME_SECONDS = 3;

export function ComoFuncionaFlow() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(READING_TIME_SECONDS);
  const canContinue = secondsLeft === 0;
  const slide = slides[currentSlide];

  useEffect(() => {
    setSecondsLeft(READING_TIME_SECONDS);
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [currentSlide]);

  function continueFlow() {
    if (!canContinue) return;
    if (currentSlide === slides.length - 1) {
      router.replace("/");
      return;
    }
    setCurrentSlide((slideIndex) => slideIndex + 1);
  }

  return (
    <main className="mx-auto grid h-dvh min-h-dvh w-full max-w-[490px]  overflow-hidden bg-[#0f1710] text-[#f3f5f4]">

      <header className="flex items-center px-5"><span className="inline-flex items-center gap-2 text-[29px] font-extrabold tracking-[-0.8px]"><span aria-hidden="true" className="grid size-9 place-items-center rounded-full border-[3px] border-current text-sm">◉</span>escalei</span></header>

      <section className="min-h-0 overflow-y-auto">
        <SlideIllustration slide={currentSlide} />
        <div className="grid gap-2.5 px-6 pb-5 pt-4">
          <p className="m-0 text-[11px] font-extrabold tracking-[1.2px] text-[#2fe06b]">COMO FUNCIONA</p>
          <h1 className="m-0 text-[30px] font-extrabold leading-[35px] tracking-[-1px]">{slide.title}</h1>
          <p className="m-0 text-[15px] leading-[23px] text-[#a0a8af]">{slide.description}</p>
        </div>
      </section>

      <footer className="grid gap-4 px-6 pb-7 pt-3">
        <div className="flex justify-center gap-1.5" aria-label={`Etapa ${currentSlide + 1} de ${slides.length}`}>
          {slides.map((_, index) => <span key={index} className={`h-1.5 rounded-full ${index === currentSlide ? "w-[22px] bg-[#2fe06b]" : "w-1.5 bg-[#29332c]"}`} />)}
        </div>
        <Button type="button" disabled={!canContinue} onClick={continueFlow} className="h-[52px] w-full rounded-[14px] !border-0 bg-[#2fe06b] text-base font-bold text-[#06200f] enabled:hover:bg-[#49ef7c] disabled:bg-[#29332c] disabled:text-[#7f8b83]">
          <ArrowRight aria-hidden="true" />
          {canContinue ? (currentSlide === slides.length - 1 ? "Ir para o início" : "Continuar") : `Continue em ${secondsLeft}s`}
        </Button>
      </footer>
    </main>
  );
}
