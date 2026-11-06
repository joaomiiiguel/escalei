import { cn } from "cn";

/**
 * Camisa genérica com número: a landing não usa foto, nome ou escudo de jogador.
 * O tamanho vem do className (ex.: `size-7 text-[10px]`).
 */
export function Shirt({ number, goalkeeper = false, className }: { number: number; goalkeeper?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute inset-0 size-full">
        <path
          d="M8 2 L3.5 4.2 L1 8.5 L4.2 10.4 L5.2 9.4 L5.2 22 L18.8 22 L18.8 9.4 L19.8 10.4 L23 8.5 L20.5 4.2 L16 2 C15 3.6 13.6 4.3 12 4.3 C10.4 4.3 9 3.6 8 2 Z"
          className={goalkeeper ? "fill-(--giz)" : "fill-primary"}
        />
      </svg>
      <span className="relative mt-[15%] font-extrabold leading-none text-primary-foreground tabular-nums">{number}</span>
    </span>
  );
}
