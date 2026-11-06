import { cn } from "cn";

/** Filtro que deixa o traço levemente irregular, como giz. Renderize uma vez por página. */
export function ChalkFilter() {
  return (
    <svg aria-hidden="true" className="absolute size-0">
      <defs>
        <filter id="giz" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={4} result="ruido" />
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale={2.6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

type ChalkProps = { className?: string };

// Os rabiscos herdam a cor do texto: use `text-(--giz)` ou `text-primary` no className.
const chalk = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", filter: "url(#giz)" } as const;

export function ChalkArrow({ className }: ChalkProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 140 50" strokeWidth={3} className={cn("h-[50px] w-[140px]", className)} {...chalk}>
      <path d="M6 36 C 44 10, 92 8, 128 26" />
      <path d="M114 14 L130 27 L112 38" />
    </svg>
  );
}

export function ChalkCircle({ className }: ChalkProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 76" strokeWidth={3} className={cn("h-[76px] w-[120px]", className)} {...chalk}>
      <path d="M70 6 C 108 8 116 34 96 54 C 76 72 26 70 12 50 C -2 30 18 8 54 6 C 66 5 78 7 88 14" />
    </svg>
  );
}

export function ChalkX({ className }: ChalkProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 60" strokeWidth={3.5} className={cn("size-[60px]", className)} {...chalk}>
      <path d="M10 10 L50 50" />
      <path d="M50 12 L12 48" />
    </svg>
  );
}

export function ChalkUnderline({ className }: ChalkProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 230 14" strokeWidth={3} preserveAspectRatio="none" className={cn("h-3.5 w-[230px]", className)} {...chalk}>
      <path d="M3 9 C 60 3, 140 12, 227 4" />
      <path d="M30 12 C 90 8, 150 13, 200 9" opacity={0.6} />
    </svg>
  );
}

/** Sinal de "diferente": separa o passe (R$) do saldo (C$). */
export function ChalkNotEqual({ className }: ChalkProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 22" strokeWidth={2.6} className={cn("h-[22px] w-10", className)} {...chalk}>
      <path d="M6 8 L34 7" />
      <path d="M6 15 L34 14" />
      <path d="M26 2 L14 20" />
    </svg>
  );
}
