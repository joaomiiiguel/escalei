-- Modo demonstração por administrador: troca a lista fixa de apelidos no código
-- por uma opção que cada admin liga ou desliga no painel. Começa desligado para todos.
-- A leitura usa a política existente "administrador lê o próprio acesso"; a escrita
-- passa pela Server Action do admin (service_role depois do requireAdmin).

alter table public.administradores
  add column modo_demonstracao boolean not null default false;

comment on column public.administradores.modo_demonstracao is
  'Quando true, /inicio e /escalar mostram o seletor de demonstração para este admin.';
