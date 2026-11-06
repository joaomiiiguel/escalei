import { displayedKickoff } from "@/lib/game-kickoff";
import type { EstatisticaDaRodada, Jogo, Rodada } from "@/lib/types";

/** O número em destaque no topo do Início: muda conforme o momento da rodada. */
export type RoundFigure =
  | { kind: "countdown"; until: string; caption: string }
  | { kind: "points"; caption: string }
  | { kind: "games"; caption: string }
  | null;

export type RoundMessage = { title: string; description: string; cta: string | null };

export type RoundProgress = {
  points: number;
  selectedPlayers: number;
  scoredPlayers: number;
  totalGames: number;
  completedGames: number;
  liveGames: number;
  /** Jogo em andamento ou, se não houver, o próximo a começar. */
  nextGame: Jogo | null;
  /** Último jogo encerrado, na ordem de início. */
  lastCompletedGame: Jogo | null;
};

const LINEUP_SIZE = 11;

/** Escolhe o número em destaque: contagem antes da trava, pontos para quem escalou, jogos para quem não escalou. */
export function roundFigure({ round, hasTeam, now }: { round: Rodada; hasTeam: boolean; now: Date }): RoundFigure {
  if (round.status === "AGENDADA") return round.abre_em && now < new Date(round.abre_em) ? { kind: "countdown", until: round.abre_em, caption: "O mercado abre" } : null;
  if (round.status === "ABERTA" && now < new Date(round.trava_em)) return { kind: "countdown", until: round.trava_em, caption: "A escalação trava" };
  if (hasTeam) return { kind: "points", caption: round.status === "FECHADA" ? "pontos na rodada" : "pontos até agora" };
  return { kind: "games", caption: "jogos encerrados" };
}

/** Título, explicação e ação do cartão principal para cada situação do usuário na rodada. */
export function roundMessage({ round, hasTeam, lateLineup, now }: { round: Rodada; hasTeam: boolean; lateLineup: boolean; now: Date }): RoundMessage {
  if (lateLineup) return { title: "Ainda dá tempo de escalar", description: "A rodada travou, mas menos da metade dos jogos começou. Escale com jogadores de times que ainda não entraram em campo.", cta: "Escalar agora" };
  if (round.status === "AGENDADA") return { title: "A rodada ainda não abriu", description: "Quando o mercado abrir, você monta seu time para esta rodada.", cta: null };
  const canEdit = round.status === "ABERTA" && now < new Date(round.trava_em);
  if (!hasTeam && canEdit) return { title: "Você ainda não escalou", description: "Monte 11 jogadores dentro do seu saldo. Leva uns 3 minutos, ou use a escalação automática.", cta: null };
  if (hasTeam && canEdit) return { title: "Seu time está escalado", description: "Dá para trocar jogadores até a trava.", cta: "Ver escalação" };
  if (hasTeam && round.status === "EM_ANDAMENTO") return { title: "Seu time está em campo", description: "Os pontos de cada jogador entram quando o jogo dele termina.", cta: null };
  if (hasTeam && round.status === "FECHADA") return { title: "Pontuação oficial", description: "A rodada fechou e os pontos não mudam mais.", cta: "Ver meu time" };
  if (hasTeam) return { title: "Seu time está travado", description: "A escalação não pode mais ser alterada nesta rodada.", cta: "Ver meu time" };
  return { title: "Você não escalou nesta rodada", description: "Fique de olho na próxima rodada para montar seu time.", cta: null };
}

/** Andamento da rodada para o usuário: pontos somados, jogadores que já pontuaram e jogos encerrados. */
export function roundProgress({ games, stats, selectedPlayers }: { games: Jogo[]; stats: EstatisticaDaRodada[]; selectedPlayers: number }): RoundProgress {
  const ordered = [...games].sort((first, second) => kickoffTime(first) - kickoffTime(second));
  const statusById = new Map(ordered.map((game) => [game.id, game.status]));
  const completed = ordered.filter((game) => game.status === "ENCERRADO");
  const live = ordered.filter((game) => game.status === "EM_ANDAMENTO");
  const scored = new Set(stats.filter((stat) => statusById.get(stat.jogo_id) === "ENCERRADO").map((stat) => stat.jogador_id));

  return {
    points: Math.round(stats.reduce((total, stat) => total + Number(stat.pontos ?? 0), 0) * 100) / 100,
    selectedPlayers: selectedPlayers || LINEUP_SIZE,
    scoredPlayers: scored.size,
    totalGames: ordered.length,
    completedGames: completed.length,
    liveGames: live.length,
    nextGame: live[0] ?? ordered.find((game) => game.status === "A_JOGAR") ?? null,
    lastCompletedGame: completed.at(-1) ?? null,
  };
}

export type GameDay<T> = { key: string; label: string; games: T[] };

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" });

/** Agrupa os jogos por dia (horário de Brasília), em ordem de início. */
export function groupGamesByDay<T extends Pick<Jogo, "inicio_em" | "inicio_simulado_em">>(games: T[]): GameDay<T>[] {
  const days = new Map<string, GameDay<T>>();
  for (const game of [...games].sort((first, second) => kickoffTime(first) - kickoffTime(second))) {
    const kickoff = new Date(displayedKickoff(game));
    const key = dayKeyFormatter.format(kickoff);
    const day = days.get(key) ?? { key, label: capitalize(dayLabelFormatter.format(kickoff)), games: [] };
    day.games.push(game);
    days.set(key, day);
  }
  return [...days.values()];
}

/** Partes da contagem regressiva; sem os segundos quando ainda falta mais de um dia. */
export function countdownParts(until: string, now: Date): Array<{ value: string; unit: string }> {
  const total = Math.max(0, Math.floor((new Date(until).getTime() - now.getTime()) / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  if (days > 0) return [{ value: String(days), unit: "d" }, { value: pad(hours), unit: "h" }, { value: pad(minutes), unit: "min" }];
  return [{ value: pad(hours), unit: "h" }, { value: pad(minutes), unit: "min" }, { value: pad(seconds), unit: "s" }];
}

export function formatPoints(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function kickoffTime(game: Pick<Jogo, "inicio_em" | "inicio_simulado_em">) {
  return new Date(displayedKickoff(game)).getTime();
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
