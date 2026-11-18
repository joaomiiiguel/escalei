-- Lançamento: cadastro aberto. Quem entra sem convite vai para o grupo geral,
-- o grupo ativo do tipo ABERTA (tipo_liga já existe desde a criação de ligas).
-- No máximo um grupo geral ativo por vez, para a entrada ser determinística.
create unique index ligas_unica_aberta_idx
  on public.ligas (tipo)
  where tipo = 'ABERTA' and arquivada_em is null;
