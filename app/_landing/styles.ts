import { Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";

export const display = Sofia_Sans_Extra_Condensed({ subsets: ["latin"], weight: ["800", "900"], variable: "--font-display" });
export const body = Sofia_Sans({ subsets: ["latin"], variable: "--font-body" });

// Classes compartilhadas pelas páginas públicas (Home e Beta).
export const displayType = "font-(family-name:--font-display) font-black uppercase";
export const container = "mx-auto w-full max-w-[75rem] px-5 md:px-10";
export const section = "border-t border-border py-14 md:py-28";
export const anchorSection = "scroll-mt-16 md:scroll-mt-[76px]";
export const eyebrow = "text-[13px] font-extrabold uppercase tracking-[2px] text-primary md:text-sm";
export const lead = "mt-3 text-base text-muted-foreground md:mt-5 md:text-xl";
export const tag = "rounded-full border border-dashed border-border px-2 py-[3px] text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground md:px-2.5 md:text-xs";
export const card = "rounded-2xl border border-border bg-card md:rounded-[20px]";
export const focus = "outline-none focus-visible:ring-[3px] focus-visible:ring-(--giz) focus-visible:ring-offset-[3px] focus-visible:ring-offset-background";
export const primaryCta = `inline-flex items-center justify-center gap-2.5 rounded-[14px] bg-primary font-extrabold text-primary-foreground transition hover:-translate-y-px hover:bg-[#d6ff4d] hover:shadow-[0_0_0_4px_rgb(197_249_32/0.18),0_10px_30px_rgb(197_249_32/0.28)] motion-reduce:hover:translate-y-0 ${focus}`;
export const ghostCta = `inline-flex items-center rounded-xl border border-border font-bold text-(--giz) transition hover:border-(--giz) hover:bg-(--giz)/8 ${focus}`;
export const textLink = `inline-flex min-h-11 items-center font-bold transition hover:text-primary ${focus}`;
// Faixas de gramado cortado.
export const stripes = "bg-[repeating-linear-gradient(90deg,rgb(13_74_50/0.22)_0_46px,rgb(6_38_26/0.22)_46px_92px)] md:bg-[repeating-linear-gradient(90deg,rgb(13_74_50/0.22)_0_96px,rgb(6_38_26/0.22)_96px_192px)]";
export const strongStripes = "bg-[repeating-linear-gradient(90deg,rgb(13_74_50/0.35)_0_46px,rgb(6_38_26/0.35)_46px_92px)] md:bg-[repeating-linear-gradient(90deg,rgb(13_74_50/0.35)_0_96px,rgb(6_38_26/0.35)_96px_192px)]";
