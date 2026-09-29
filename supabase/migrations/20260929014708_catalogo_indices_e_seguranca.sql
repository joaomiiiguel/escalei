create index rodadas_versao_regras_idx on rodadas (versao_regras);
create index jogos_clube_casa_id_idx on jogos (clube_casa_id);
create index jogos_clube_fora_id_idx on jogos (clube_fora_id);
create index estatisticas_jogador_clube_id_idx on estatisticas_jogador (clube_id);
create index historico_precos_rodada_id_idx on historico_precos (rodada_id);

create policy "configurações exclusivas do servidor" on configuracoes
  for all to service_role
  using (true)
  with check (true);
