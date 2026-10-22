"use client";

import { useState } from "react";
import type { ActiveRound, Rodada, SavedTeam, StatusRodada as StatusRodadaType } from "@/lib/types";
import { LineupBuilder, LineupPlayer, Logo, RoundLineup, SavedLineup } from "@/components/ui";
import TitleSection from "@/components/ui/title-section";
import { LineupBody } from "@/app/escalar/page";

// ─── Dados fixos do mock ────────────────────────────────────────────────────

/**
 * Troque aqui para ver cada estado da página:
 * - "montando"   → rodada ABERTA, sem time salvo (LineupBuilder)
 * - "salvo"      → rodada ABERTA, time salvo (SavedLineup)
 * - "andamento"  → rodada EM_ANDAMENTO com pontos (RoundLineup)
 * - "encerrada"  → rodada ENCERRADA com pontos (RoundLineup)
 */
type DemoMode = "montando" | "salvo" | "andamento" | "encerrada";
const DEMO_MODE = "montando" as DemoMode;

// ─── Valores mockados ────────────────────────────────────────────────────────
const BALANCE = 55;
const FORMATION = "4-3-3";

const ROUND_BASE = {
  id: "demo-round",
  numero: 12,
  trava_em: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  fechada_em: null,
  simulada: true,
};

const ROUNDS: Record<DemoMode, ActiveRound> = {
  montando: { ...ROUND_BASE, status: "ABERTA" },
  salvo: { ...ROUND_BASE, status: "ABERTA" },
  andamento: { ...ROUND_BASE, status: "EM_ANDAMENTO" },
  encerrada: { ...ROUND_BASE, status: "ENCERRADA", fechada_em: new Date().toISOString() },
} as unknown as Record<DemoMode, ActiveRound>;

const INITIAL_PLAYERS: LineupPlayer[] = [
  { id: "p1", name: "Rossi", position: "GOL", price: 6.5, club: "FLA", clubName: "Flamengo", logoUrl: "/escudos/127.png" },
  { id: "p2", name: "Varela", position: "DEF", price: 6.0, club: "FLA", clubName: "Flamengo", logoUrl: "/escudos/127.png" },
  { id: "p3", name: "Gustavo Gómez", position: "DEF", price: 7.1, club: "PAL", clubName: "Palmeiras", logoUrl: "/escudos/121.png" },
  { id: "p4", name: "Léo Pereira", position: "DEF", price: 6.4, club: "FLA", clubName: "Flamengo", logoUrl: "/escudos/127.png" },
  { id: "p5", name: "Gabriel Menino", position: "DEF", price: 6.9, club: "PAL", clubName: "Palmeiras", logoUrl: "/escudos/121.png" },
  { id: "p6", name: "Garro", position: "MEI", price: 8.4, club: "COR", clubName: "Corinthians", logoUrl: "/escudos/131.png" },
  { id: "p7", name: "Raphael Veiga", position: "MEI", price: 9.8, club: "PAL", clubName: "Palmeiras", logoUrl: "/escudos/121.png" },
  { id: "p8", name: "De Arrascaeta", position: "MEI", price: 11.2, club: "FLA", clubName: "Flamengo", logoUrl: "/escudos/127.png" },
  { id: "p9", name: "Yuri Alberto", position: "ATA", price: 10.3, club: "COR", clubName: "Corinthians", logoUrl: "/escudos/131.png" },
  { id: "p10", name: "Pedro", position: "ATA", price: 12.5, club: "FLA", clubName: "Flamengo", logoUrl: "/escudos/127.png" },
  { id: "p11", name: "Vegetti", position: "ATA", price: 8.9, club: "VAS", clubName: "Vasco", logoUrl: "/escudos/118.png" },
] as unknown as LineupPlayer[];

// Pontos/status por jogador para os estados "andamento" e "encerrada"
const ROUND_STATS: Pick<LineupPlayer, "roundPoints" | "roundStatus" | "roundLabel">[] = [
  { roundPoints: 3.5, roundStatus: "ENCERRADO", roundLabel: "16:00" },
  { roundPoints: 1.2, roundStatus: "ENCERRADO", roundLabel: "16:00" },
  { roundPoints: -1.0, roundStatus: "ENCERRADO", roundLabel: "18:30" },
  { roundPoints: 5.8, roundStatus: "ENCERRADO", roundLabel: "16:00" },
  { roundPoints: 0.0, roundStatus: "EM_ANDAMENTO", roundLabel: "18:30" },
  { roundPoints: 2.4, roundStatus: "EM_ANDAMENTO", roundLabel: "21:00" },
  { roundPoints: 0.0, roundStatus: "A_JOGAR", roundLabel: "21:00" },
  { roundPoints: 8.1, roundStatus: "ENCERRADO", roundLabel: "16:00" },
  { roundPoints: 0.0, roundStatus: "A_JOGAR", roundLabel: "21:30" },
  { roundPoints: 12.3, roundStatus: "ENCERRADO", roundLabel: "16:00" },
  { roundPoints: 0.0, roundStatus: "SEM_JOGO", roundLabel: "sem jogo" },
];

const ROUND_PLAYERS: LineupPlayer[] = INITIAL_PLAYERS.map((player, index) => ({
  ...player,
  ...ROUND_STATS[index],
  // na rodada encerrada todo mundo já jogou
  ...(DEMO_MODE === "encerrada" && ROUND_STATS[index].roundStatus !== "SEM_JOGO"
    ? { roundStatus: "ENCERRADO" as const }
    : {}),
}));

const LAST_UPDATED = new Date(Date.now() - 1000 * 60 * 3).toISOString();


const STATUS_OPTIONS: { value: StatusRodadaType; label: string }[] = [
  { value: "ABERTA", label: "🟢 Aberta — mercado aberto" },
  { value: "EM_ANDAMENTO", label: "🟡 Em andamento — jogos ao vivo" },
  { value: "FECHADA", label: "⚪ Fechada — pontuação final" },
];


// ─── Componente ───────────────────────────────────────────────────────────────

export default function DemoLineupPicker() {
  const [demoStatusRound, setDemoStatusRound] = useState<StatusRodadaType>("ABERTA");
  const [demoEditModeLineup, setDemoEditModeLineup] = useState<boolean>(true);
  const round = ROUNDS[DEMO_MODE];

  return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-2  px-5 text-foreground">
        
        {/* Seletor de demo */}
        <div className="flex flex-col gap-1.5 pb-5">
          <label
            htmlFor="demo-status-picker"
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            🧪 Modo demonstração — status da rodada
          </label>
          <div className="flex gap-2">
          <select
            id="demo-status-picker"
            value={demoStatusRound}
            onChange={(e) => setDemoStatusRound(e.target.value as StatusRodadaType)}
            className="w-full rounded-xl border border-border bg-secondary/70 px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            id="demo-status-picker"
            disabled={demoStatusRound !== "ABERTA"}
            value={demoEditModeLineup.toString()}
            onChange={(e) => setDemoEditModeLineup(e.target.value === "true")}
            className="w-full rounded-xl border border-border bg-secondary/70 px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="true">Sem escalação</option>
            <option value="false">Com escalação</option>
          </select>
          </div>
        </div>

        <TitleSection title={round && demoEditModeLineup ? "Montar time" : "Meu time"} />


        {/* Inicio de Rodada sem escalaçao */}
        {demoStatusRound === "ABERTA" && demoEditModeLineup && (
          <LineupBuilder
            budget={BALANCE}
            initialFormation={FORMATION}
            initialPlayers={[]}
            roundId={round.id}
          />
        )}
        
         {demoStatusRound === "ABERTA" && !demoEditModeLineup && (
          <SavedLineup
            budget={BALANCE}
            formation={FORMATION}
            players={ROUND_PLAYERS}
            travaEm={round.trava_em}
          />
        )}

        {demoStatusRound !== "ABERTA" && (
          <RoundLineup
            formation={FORMATION}
            players={ROUND_PLAYERS}
            roundNumber={round.numero}
            status={demoStatusRound}
            finishedAt={round.fechada_em}
            lastUpdated={LAST_UPDATED}
          />
        )}
       
      </main>)
}
