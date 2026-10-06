"use client";

import { useState } from "react";

type TeamLogoProps = {
  className?: string;
  logoUrl?: string | null;
  nome: string;
  sigla: string;
};

export function TeamLogo({ className = "size-7", logoUrl, nome, sigla }: TeamLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!logoUrl || hasImageError) {
    return <span aria-hidden="true" className={`grid place-items-center rounded-md bg-border text-[9px] font-black text-foreground ${className}`}>{sigla.slice(0, 2)}</span>;
  }

  return <img src={logoUrl} alt={`Escudo do ${nome}`} onError={() => setHasImageError(true)} className={`${className} object-contain`} />;
}
