-- Lançamento: o grupo do teste, "Brasileiro 2026 (Teste)", vira o grupo geral
-- (tipo ABERTA) e perde o "(Teste)" do nome. Quem se cadastra sem convite entra nele.
-- Sem o grupo (bancos novos, testes) ou com outro grupo geral ativo, nada muda.
do $$
declare
  v_grupo_id uuid;
begin
  select id into v_grupo_id
  from public.ligas
  where nome = 'Brasileiro 2026 (Teste)' and arquivada_em is null;

  if v_grupo_id is null then
    raise notice 'Grupo "Brasileiro 2026 (Teste)" ativo não encontrado; nada a fazer.';
    return;
  end if;

  if exists (select 1 from public.ligas where tipo = 'ABERTA' and arquivada_em is null and id <> v_grupo_id) then
    raise notice 'Já existe outro grupo geral ativo; "Brasileiro 2026 (Teste)" não foi alterado.';
    return;
  end if;

  update public.ligas
  set tipo = 'ABERTA', nome = 'Brasileiro 2026'
  where id = v_grupo_id;
end;
$$;
