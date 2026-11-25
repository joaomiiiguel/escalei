-- Admin concede passes de rodada a um participante pelo painel (/admin/participantes).
-- O lote entra como CORTESIA (não há pedido nem dinheiro envolvido) e guarda quem concedeu.
-- Validade igual à cortesia do onboarding: temporada atual e a seguinte.

alter table public.passes_lotes
  add column concedido_por uuid references public.perfis(id) on delete set null;

create index passes_lotes_concedido_por_idx on public.passes_lotes (concedido_por);

-- Lote e crédito no livro na mesma transação. Chamada só pelo servidor (service_role),
-- depois de `requireAdmin`; ainda assim confere aqui que `p_admin_id` é administrador.
create or replace function public.fn_admin_conceder_passes(p_admin_id uuid, p_usuario_id uuid, p_quantidade integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lote_id bigint;
begin
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 10 then
    raise exception using errcode = 'ES422', message = 'Informe de 1 a 10 passes.';
  end if;

  if not exists (select 1 from public.administradores where usuario_id = p_admin_id) then
    raise exception using errcode = 'ES403', message = 'Só administradores concedem passes.';
  end if;

  if not exists (select 1 from public.perfis where id = p_usuario_id) then
    raise exception using errcode = 'ES404', message = 'Participante não encontrado.';
  end if;

  insert into public.passes_lotes (usuario_id, origem, quantidade, restantes, valido_ate_temporada, concedido_por)
  values (p_usuario_id, 'CORTESIA', p_quantidade, p_quantidade, public.fn_temporada_atual() + 1, p_admin_id)
  returning id into v_lote_id;

  insert into public.passes_movimentacoes (usuario_id, lote_id, tipo, quantidade)
  values (p_usuario_id, v_lote_id, 'CREDITO', p_quantidade);

  return (
    select coalesce(sum(lote.restantes), 0)::integer
    from public.passes_lotes lote
    where lote.usuario_id = p_usuario_id
      and lote.valido_ate_temporada >= public.fn_temporada_atual()
  );
end;
$$;

revoke all on function public.fn_admin_conceder_passes(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.fn_admin_conceder_passes(uuid, uuid, integer) to service_role;
