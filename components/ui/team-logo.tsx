"use client";

import { useState } from "react";

const localApiFootballTeamIds = new Set([
  "118", "119", "120", "121", "124", "126", "127", "130", "131", "133",
  "134", "135", "136", "140", "144", "152", "154", "794", "1062", "1193",
]);

type TeamLogoProps = {
  className?: string;
  logoUrl?: string | null;
  nome: string;
  sigla: string;
};

function localLogoUrl(logoUrl: string) {
  const match = /^https:\/\/media\.api-sports\.io\/football\/teams\/(\d+)\.png$/.exec(logoUrl);
  return match && localApiFootballTeamIds.has(match[1]) ? `/escudos/${match[1]}.png` : logoUrl;
}

export function TeamLogo({ className = "size-7", logoUrl, nome, sigla }: TeamLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!logoUrl || hasImageError) {
    return <span aria-hidden="true" className={`grid place-items-center rounded-md bg-border text-[9px] font-black text-foreground ${className}`}>{sigla.slice(0, 2)}</span>;
  }

  return <img src={localLogoUrl(logoUrl)} alt={`Escudo do ${nome}`} onError={() => setHasImageError(true)} className={`${className} object-contain`} />;
}
