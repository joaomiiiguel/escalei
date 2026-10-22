"use client";

import { useState } from "react";
import type { Rodada, Jogo, Clube, TimeDaRodada, EstatisticaDaRodada, StatusRodada as StatusRodadaType } from "@/lib/types";
import StatusRodadaSection from "@/components/page/home/status-round";
import RoundViewCTA from "@/components/page/home/round-view-cta";
import MatchesRounds from "@/components/page/home/matches-rounds";
import LiveMatches from "@/components/page/home/live-matches";

// ─── Dados fixos do mock ────────────────────────────────────────────────────

const MOCK_NOW = new Date("2026-10-25T15:00:00-03:00");

const MOCK_ROUND_BASE: Rodada = {
  id: 9999,
  temporada: 2026,
  numero: 30,
  abre_em: "2026-10-22T00:00:00-03:00",
  trava_em: "2026-10-25T16:00:00-03:00",
  fechamento_simulado_em: null,
  fechada_em: null,
  rotulo_api: "Regular Season - 30",
  simulada: true,
  status: "ABERTA",
};

const MOCK_CLUBS: Record<number, Clube> = {
  1: { id: 1, nome: "Flamengo", sigla: "FLA", logo_url: "https://media.api-sports.io/football/teams/127.png" },
  2: { id: 2, nome: "Palmeiras", sigla: "PAL", logo_url: "https://media.api-sports.io/football/teams/121.png" },
  3: { id: 3, nome: "Atlético-MG", sigla: "CAM", logo_url: "https://media.api-sports.io/football/teams/1062.png" },
  4: { id: 4, nome: "Fluminense", sigla: "FLU", logo_url: "https://media.api-sports.io/football/teams/120.png" },
  5: { id: 5, nome: "São Paulo", sigla: "SAO", logo_url: "https://media.api-sports.io/football/teams/126.png" },
  6: { id: 6, nome: "Botafogo", sigla: "BOT", logo_url: "https://media.api-sports.io/football/teams/119.png" },
  7: { id: 7, nome: "Vasco", sigla: "VAS", logo_url: "https://media.api-sports.io/football/teams/118.png" },
  8: { id: 8, nome: "Grêmio", sigla: "GRE", logo_url: "https://media.api-sports.io/football/teams/130.png" },
  9: { id: 9, nome: "Internacional", sigla: "INT", logo_url: "https://media.api-sports.io/football/teams/131.png" },
  10: { id: 10, nome: "Corinthians", sigla: "COR", logo_url: "https://media.api-sports.io/football/teams/128.png" },
};

const MOCK_GAMES_BY_STATUS: Record<StatusRodadaType, Jogo[]> = {
  AGENDADA: [],
  ABERTA: [
    { id: 1, clube_casa_id: 1, clube_fora_id: 2, inicio_em: "2026-10-25T16:00:00-03:00", status: "A_JOGAR", gols_casa: null, gols_fora: null, pontuado_em: null },
    { id: 2, clube_casa_id: 3, clube_fora_id: 4, inicio_em: "2026-10-25T18:30:00-03:00", status: "A_JOGAR", gols_casa: null, gols_fora: null, pontuado_em: null },
    { id: 3, clube_casa_id: 5, clube_fora_id: 6, inicio_em: "2026-10-26T11:00:00-03:00", status: "A_JOGAR", gols_casa: null, gols_fora: null, pontuado_em: null },
    { id: 4, clube_casa_id: 7, clube_fora_id: 8, inicio_em: "2026-10-26T16:00:00-03:00", status: "A_JOGAR", gols_casa: null, gols_fora: null, pontuado_em: null },
    { id: 5, clube_casa_id: 9, clube_fora_id: 10, inicio_em: "2026-10-26T19:00:00-03:00", status: "A_JOGAR", gols_casa: null, gols_fora: null, pontuado_em: null },
  ],
  EM_ANDAMENTO: [
    { id: 1, clube_casa_id: 1, clube_fora_id: 2, inicio_em: "2026-10-25T16:00:00-03:00", status: "ENCERRADO", gols_casa: 2, gols_fora: 1, pontuado_em: "2026-10-25T18:05:00-03:00" },
    { id: 2, clube_casa_id: 3, clube_fora_id: 4, inicio_em: "2026-10-25T18:30:00-03:00", status: "EM_ANDAMENTO", gols_casa: 1, gols_fora: 1, pontuado_em: null },
    { id: 3, clube_casa_id: 5, clube_fora_id: 6, inicio_em: "2026-10-26T11:00:00-03:00", status: "A_JOGAR", gols_casa: null, gols_fora: null, pontuado_em: null },
    { id: 4, clube_casa_id: 7, clube_fora_id: 8, inicio_em: "2026-10-26T16:00:00-03:00", status: "A_JOGAR", gols_casa: null, gols_fora: null, pontuado_em: null },
    { id: 5, clube_casa_id: 9, clube_fora_id: 10, inicio_em: "2026-10-26T19:00:00-03:00", status: "A_JOGAR", gols_casa: null, gols_fora: null, pontuado_em: null },
  ],
  FECHADA: [
    { id: 1, clube_casa_id: 1, clube_fora_id: 2, inicio_em: "2026-10-25T16:00:00-03:00", status: "ENCERRADO", gols_casa: 2, gols_fora: 1, pontuado_em: "2026-10-25T18:05:00-03:00" },
    { id: 2, clube_casa_id: 3, clube_fora_id: 4, inicio_em: "2026-10-25T18:30:00-03:00", status: "ENCERRADO", gols_casa: 1, gols_fora: 1, pontuado_em: "2026-10-25T20:38:00-03:00" },
    { id: 3, clube_casa_id: 5, clube_fora_id: 6, inicio_em: "2026-10-26T11:00:00-03:00", status: "ENCERRADO", gols_casa: 0, gols_fora: 3, pontuado_em: "2026-10-26T13:12:00-03:00" },
    { id: 4, clube_casa_id: 7, clube_fora_id: 8, inicio_em: "2026-10-26T16:00:00-03:00", status: "ENCERRADO", gols_casa: 2, gols_fora: 0, pontuado_em: "2026-10-26T18:04:00-03:00" },
    { id: 5, clube_casa_id: 9, clube_fora_id: 10, inicio_em: "2026-10-26T19:00:00-03:00", status: "ENCERRADO", gols_casa: 1, gols_fora: 2, pontuado_em: "2026-10-26T21:10:00-03:00" },
  ],
};

const MOCK_TEAM: TimeDaRodada = {
  id: "mock-team-joao",
  formacao: "4-3-3",
  times_jogadores: [
    { jogador_id: 101 }, { jogador_id: 102 }, { jogador_id: 103 },
    { jogador_id: 104 }, { jogador_id: 105 }, { jogador_id: 106 },
    { jogador_id: 107 }, { jogador_id: 108 }, { jogador_id: 109 },
    { jogador_id: 110 }, { jogador_id: 111 },
  ],
};

const MOCK_TEAM_STATS_EM_ANDAMENTO: EstatisticaDaRodada[] = [
  { jogador_id: 101, jogo_id: 1, pontos: 8.5 },
  { jogador_id: 102, jogo_id: 1, pontos: 6.0 },
  { jogador_id: 103, jogo_id: 2, pontos: 3.5 },
  { jogador_id: 104, jogo_id: 2, pontos: 0 },
];

const MOCK_TEAM_STATS_FECHADA: EstatisticaDaRodada[] = [
  { jogador_id: 101, jogo_id: 1, pontos: 8.5 },
  { jogador_id: 102, jogo_id: 1, pontos: 6.0 },
  { jogador_id: 103, jogo_id: 2, pontos: 3.5 },
  { jogador_id: 104, jogo_id: 2, pontos: 4.0 },
  { jogador_id: 105, jogo_id: 3, pontos: 2.0 },
  { jogador_id: 106, jogo_id: 3, pontos: 5.5 },
  { jogador_id: 107, jogo_id: 4, pontos: 7.0 },
  { jogador_id: 108, jogo_id: 4, pontos: 1.5 },
  { jogador_id: 109, jogo_id: 5, pontos: 3.0 },
  { jogador_id: 110, jogo_id: 5, pontos: 4.5 },
  { jogador_id: 111, jogo_id: 5, pontos: 2.5 },
];

const STATUS_OPTIONS: { value: StatusRodadaType; label: string }[] = [
  { value: "ABERTA", label: "🟢 Aberta — mercado aberto" },
  { value: "EM_ANDAMENTO", label: "🟡 Em andamento — jogos ao vivo" },
  { value: "FECHADA", label: "⚪ Fechada — pontuação final" },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DemoStatusPicker() {
  const [demoStatus, setDemoStatus] = useState<StatusRodadaType>("ABERTA");

  const round: Rodada = {
    ...MOCK_ROUND_BASE,
    status: demoStatus,
    fechada_em: demoStatus === "FECHADA" ? "2026-10-27T22:10:00-03:00" : null,
  };

  const games = MOCK_GAMES_BY_STATUS[demoStatus];
  const clubsById = new Map(Object.values(MOCK_CLUBS).map((c) => [c.id, c]));
  const teamStats =
    demoStatus === "EM_ANDAMENTO" ? MOCK_TEAM_STATS_EM_ANDAMENTO :
    demoStatus === "FECHADA"      ? MOCK_TEAM_STATS_FECHADA       : [];

  const completedGames = games.filter((g) => g.status === "ENCERRADO");
  const liveGames = games.filter((g) => g.status === "EM_ANDAMENTO");
  const lastCompletedGame = completedGames.at(-1) ?? null;
  const matchLabel = (game: Jogo) =>
    `${clubsById.get(game.clube_casa_id)?.sigla ?? "—"} × ${clubsById.get(game.clube_fora_id)?.sigla ?? "—"}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Seletor de demo */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="demo-status-picker"
          className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          🧪 Modo demonstração — status da rodada
        </label>
        <select
          id="demo-status-picker"
          value={demoStatus}
          onChange={(e) => setDemoStatus(e.target.value as StatusRodadaType)}
          className="w-full rounded-xl border border-border bg-secondary/70 px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Componentes reais renderizados com dados mockados */}
      {demoStatus !== "ABERTA" && (
        <LiveMatches
          completedGames={completedGames.length}
          games={games}
          liveGames={liveGames}
          lastCompletedGame={lastCompletedGame}
          matchLabel={matchLabel}
        />
      )}

      <StatusRodadaSection unavailable={false} round={round} now={MOCK_NOW} nextRound={null} />

      <RoundViewCTA
        team={MOCK_TEAM}
        round={round}
        now={MOCK_NOW}
        games={games}
        clubsById={clubsById}
        teamStats={teamStats}
      />

      <MatchesRounds games={games} clubsById={clubsById} />
    </div>
  );
}
