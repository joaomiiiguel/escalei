-- JOA-169: registra o aceite de um inscrito da lista de espera em um grupo.
-- A autorização de entrada continua em ligas_convites_email; estas colunas guardam a decisão do admin.
alter table public.lista_espera
  add column liga_id uuid references public.ligas(id) on delete set null,
  add column aceito_em timestamptz,
  add column aceito_por uuid references public.perfis(id) on delete set null;
