-- Limpeza de grupos (JOA-147, pedido de 27/10/2026): fica só "Brasileiro 2026 (Teste)".
-- Apaga os grupos de teste antigos; membros e e-mails autorizados saem em cascata.
-- Usuários, perfis e saldos não são apagados. O usuário "Joao" (modo de
-- apresentação), que só estava no grupo mock, entra no grupo mantido.
do $$
declare
  v_grupo_id uuid;
  v_joao_id uuid;
begin
  select id into v_grupo_id from public.ligas where nome = 'Brasileiro 2026 (Teste)';
  -- Sem o grupo mantido (bancos novos, testes), nada é apagado.
  if v_grupo_id is null then
    raise notice 'Grupo "Brasileiro 2026 (Teste)" não encontrado; limpeza ignorada.';
    return;
  end if;

  delete from public.ligas
  where nome in ('teste', 'Tessaste', 'Campina Resenha', 'Resenha Mock da Rodada');

  select id into v_joao_id from public.perfis where apelido = 'Joao';
  if v_joao_id is not null then
    insert into public.ligas_membros (liga_id, usuario_id)
    values (v_grupo_id, v_joao_id)
    on conflict (liga_id, usuario_id) do nothing;
  end if;
end;
$$;
