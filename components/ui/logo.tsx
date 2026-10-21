import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";

export type LogoVariant = "horizontal" | "vertical";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

import LogoEscudo from "@/public/LogoEscudo.png"

export interface LogoProps {
  /**
   * Orientação / variação visual da logo:
   * - "horizontal": LogoH.png (ícone à esquerda, texto à direita) — ideal para barras de topo e headers.
   * - "vertical": LogoT.png (ícone no topo, texto embaixo) — ideal para telas de splash, login e destaques.
   * @default "horizontal"
   */
  variant?: LogoVariant;
  /**
   * Tamanho pré-definido da logo:
   * - "xs": altura 20px (horizontal) / 36px (vertical)
   * - "sm": altura 28px (horizontal) / 48px (vertical)
   * - "md": altura 36px (horizontal) / 64px (vertical) — padrão
   * - "lg": altura 48px (horizontal) / 80px (vertical)
   * - "xl": altura 64px (horizontal) / 96px (vertical)
   * @default "md"
   */
  size?: LogoSize;
  /**
   * Se informado, renderiza como link de navegação
   */
  href?: string;
  /**
   * Classes adicionais no elemento da imagem
   */
  className?: string;
  /**
   * Texto alternativo para acessibilidade
   * @default "Escalou - Mostre que você entende de futebol"
   */
  alt?: string;
  /**
   * Carrega a imagem com prioridade (LCP / acima da dobra)
   * @default false
   */
  priority?: boolean;
}

const logoSources = {
  horizontal: "/LogoH.png",
  vertical: "/LogoT.png",
} as const;

const logoDimensions = {
  horizontal: { width: 491, height: 115 },
  vertical: { width: 370, height: 208 },
} as const;

const sizeClasses = {
  horizontal: {
    xs: "h-5 w-auto",
    sm: "h-7 w-auto",
    md: "h-9 w-auto",
    lg: "h-12 w-auto",
    xl: "h-16 w-auto",
  },
  vertical: {
    xs: "h-9 w-auto",
    sm: "h-12 w-auto",
    md: "h-16 w-auto",
    lg: "h-20 w-auto",
    xl: "h-24 w-auto",
  },
} as const;

export function Logo({
  variant = "horizontal",
  size = "md",
  href,
  className,
  alt = "Escalou - Mostre que você entende de futebol",
  priority = false,
}: LogoProps) {
  const isVertical = variant === "vertical";
  const selectedVariant: LogoVariant = isVertical ? "vertical" : "horizontal";
  const src = logoSources[selectedVariant];
  const { width, height } = logoDimensions[selectedVariant];
  const sizeClass = sizeClasses[selectedVariant][size];

  const imageElement = (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      data-testid={`logo-${selectedVariant}`}
      className={cn("object-contain select-none", sizeClass, className)}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        {imageElement}
      </Link>
    );
  }

  return <span className="h-20 inline-flex items-center">{imageElement}</span>;
}
