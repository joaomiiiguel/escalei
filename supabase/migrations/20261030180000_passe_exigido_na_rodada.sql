-- Resposta para a tela: a rodada exige passe deste usuário?
-- `fn_passe_libera_rodada` não serve para isso: devolve `true` tanto para quem está isento quanto para quem tem passe.
-- Definer: o usuário não lê `configuracoes` nem `administradores`.
create or replace function public.fn_passe_exigido(p_rodada_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.fn_passes_obrigatorios()
    and not exists (select 1 from public.administradores adm where adm.usuario_id = auth.uid())
    and exists (
      select 1
      from public.rodadas rodada
      where rodada.id = p_rodada_id
        and not rodada.simulada
    );
$$;

revoke all on function public.fn_passe_exigido(bigint) from public, anon;
grant execute on function public.fn_passe_exigido(bigint) to authenticated;
