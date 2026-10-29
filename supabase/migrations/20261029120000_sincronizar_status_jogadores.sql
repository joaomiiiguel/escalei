-- Lesionados e suspensos da rodada aberta (JOA-163).
-- O orquestrador lê /injuries da API-Football e grava o status por esta função.

alter table public.sync_execucoes drop constraint sync_execucoes_tipo_check;
alter table public.sync_execucoes
  add constraint sync_execucoes_tipo_check
  check (tipo in ('RODADA', 'JOGO', 'PONTUACAO', 'ORQUESTRADOR', 'CATALOGO', 'CALENDARIO', 'LESOES'));

-- Recebe a lista completa de desfalques da rodada: [{api_football_id, status, motivo}].
-- Quem está na lista recebe o status; quem não está volta a PROVAVEL.
-- Devolve quantos jogadores mudaram.
create or replace function public.fn_aplicar_status_jogadores(p_status jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alterados integer := 0;
  v_parcial integer;
begin
  if p_status is null or jsonb_typeof(p_status) <> 'array' then
    raise exception 'p_status deve ser uma lista.';
  end if;

  with novos as (
    select distinct on ((item->>'api_football_id')::int)
      (item->>'api_football_id')::int as api_football_id,
      (item->>'status')::status_jogador as status,
      nullif(item->>'motivo', '') as motivo
    from jsonb_array_elements(p_status) as item
    order by (item->>'api_football_id')::int
  )
  update public.jogadores j
  set status = n.status, status_motivo = n.motivo
  from novos n
  where j.api_football_id = n.api_football_id
    and (j.status, j.status_motivo) is distinct from (n.status, n.motivo);
  get diagnostics v_parcial = row_count;
  v_alterados := v_alterados + v_parcial;

  update public.jogadores j
  set status = 'PROVAVEL', status_motivo = null
  where (j.status <> 'PROVAVEL' or j.status_motivo is not null)
    and (j.api_football_id is null or j.api_football_id not in (
      select (item->>'api_football_id')::int from jsonb_array_elements(p_status) as item
    ));
  get diagnostics v_parcial = row_count;
  return v_alterados + v_parcial;
end;
$$;

revoke all on function public.fn_aplicar_status_jogadores(jsonb) from public, anon, authenticated;
grant execute on function public.fn_aplicar_status_jogadores(jsonb) to service_role;
