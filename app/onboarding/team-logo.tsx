"use client";

import { useState } from "react";

type TeamLogoProps = {
  logoUrl?: string | null;
  nome: string;
  sigla: string;
};

export function TeamLogo({ logoUrl, nome, sigla }: TeamLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!logoUrl || hasImageError) {
    return <span aria-hidden="true" className="grid size-[26px] place-items-center rounded-md bg-border text-[9px] font-black text-[#d6e1d6]">{sigla.slice(0, 2)}</span>;
  }

  return <img src={logoUrl} alt={`Escudo do ${nome}`} onError={() => setHasImageError(true)} className="size-[29px] object-contain" />;
}
