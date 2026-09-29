begin;

do $$
declare
  tabela text;
begin
  foreach tabela in array array['perfis', 'times', 'times_jogadores']
  loop
    if not exists (
      select 1
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'public'
        and pg_class.relname = tabela
        and pg_class.relrowsecurity
    ) then
      raise exception 'RLS deve estar ativo em public.%', tabela;
    end if;
  end loop;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'times'
      and policyname = 'times próprios ou após trava: ler'
      and roles::text[] = array['authenticated']
  ) then
    raise exception 'A policy de leitura protegida de times não está configurada';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'times_jogadores'
      and policyname = 'jogadores próprios ou após trava: ler'
      and roles::text[] = array['authenticated']
  ) then
    raise exception 'A policy de leitura protegida de jogadores não está configurada';
  end if;

  if has_table_privilege('authenticated', 'public.times', 'insert, update, delete') is not true
    or has_table_privilege('authenticated', 'public.times_jogadores', 'insert, update, delete') is not true then
    raise exception 'Os grants autenticados necessários para a RLS não estão configurados';
  end if;
end;
$$;

rollback;
