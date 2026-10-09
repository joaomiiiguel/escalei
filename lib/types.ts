export type StatusRodada = "AGENDADA" | "ABERTA" | "EM_ANDAMENTO" | "FECHADA";
export type StatusJogo = "A_JOGAR" | "EM_ANDAMENTO" | "ENCERRADO" | "ADIADO" | "CANCELADO";
export type Rodada = { id: number; numero: number; status: StatusRodada; abre_em: string | null; trava_em: string; fechada_em: string | null; rotulo_api: string };
export type Jogo = { id: number; clube_casa_id: number; clube_fora_id: number; inicio_em: string; status: StatusJogo; gols_casa: number | null; gols_fora: number | null; pontuado_em: string | null };
export type Clube = { id: number; nome: string; sigla: string; logo_url: string | null };
export type TimeDaRodada = { id: string; formacao: string | null; times_jogadores: { jogador_id: number }[] | null };
export type EstatisticaDaRodada = { jogador_id: number; jogo_id: number; pontos: number | null };

export type SavedPlayer = {
  id: number;
  clube_id: number;
  nome: string;
  nome_exibicao: string;
  posicao: "ATA" | "DEF" | "GOL" | "MEI";
  preco: number;
  clubes: { nome: string; sigla: string; logo_url: string | null } | { nome: string; sigla: string; logo_url: string | null }[] | null;
};
export type SavedTeam = { formacao: "4-3-3" | "4-4-2" | "3-5-2"; times_jogadores: { jogadores: SavedPlayer | null }[] };
export type ActiveRound = { id: number; numero: number; status: StatusRodada; trava_em: string; fechada_em: string | null };
export type RoundGame = { clube_casa_id: number; clube_fora_id: number; id: number; inicio_em: string; status: StatusJogo };
export type PlayerStat = { jogador_id: number; pontos: number; jogos: { inicio_em: string; status: StatusJogo } | { inicio_em: string; status: StatusJogo }[] | null };

