"use client";

import { useEffect, useRef, useState } from "react";

const appear = "opacity-0 transition-opacity duration-500 group-data-[visible=true]:opacity-100 motion-reduce:opacity-100 motion-reduce:transition-none";

/** Meio-campo riscado a giz: a jogada se desenha do saldo inicial ao topo do grupo quando entra na tela. */
export function TacticalBoard() {
  const ref = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const board = ref.current;
    if (!board || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      data-visible={visible}
      viewBox="0 0 360 500"
      role="img"
      aria-label="Prancheta tática com uma jogada que sai de C$ 60 e chega ao primeiro lugar do grupo."
      className="group mx-auto w-full max-w-sm fill-none stroke-(--giz)/55 md:max-w-none"
      strokeWidth="2.5"
    >
      <rect x="4" y="4" width="352" height="492" />
      <path d="M4 250H356" />
      <circle cx="180" cy="250" r="56" />
      <rect x="84" y="4" width="192" height="84" />
      <rect x="132" y="4" width="96" height="32" />
      <rect x="84" y="412" width="192" height="84" />
      <rect x="132" y="464" width="96" height="32" />

      <g className={`stroke-(--giz)/80 delay-200 ${appear}`} strokeWidth="4" strokeLinecap="round">
        <path d="M70 330l18 18m0-18l-18 18" />
        <path d="M268 300l18 18m0-18l-18 18" />
        <path d="M92 150l18 18m0-18l-18 18" />
        <path d="M258 170l18 18m0-18l-18 18" />
      </g>

      <path
        d="M180 430C70 400 60 310 170 290S320 230 270 130 190 80 180 58"
        pathLength={1}
        strokeDasharray="1"
        className="stroke-(--lima) drop-shadow-[0_0_10px_rgb(197_249_32/0.7)] transition-[stroke-dashoffset] delay-300 duration-[1800ms] ease-in-out [stroke-dashoffset:1] group-data-[visible=true]:[stroke-dashoffset:0] motion-reduce:transition-none motion-reduce:[stroke-dashoffset:0]"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="180" cy="430" r="11" className="fill-(--lima) stroke-none" />
      <circle cx="180" cy="58" r="11" className={`fill-(--lima) stroke-none delay-[2000ms] ${appear}`} />

      <g className="fill-(--giz) stroke-none font-(family-name:--font-display) text-[30px] font-black uppercase">
        <text x="200" y="440">C$ 60</text>
        <text x="200" y="68" className={`delay-[2000ms] ${appear}`}>1º do grupo</text>
      </g>
    </svg>
  );
}
