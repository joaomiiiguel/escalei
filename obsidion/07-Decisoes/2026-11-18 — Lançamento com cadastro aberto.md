# Lançamento com cadastro aberto

**Data:** 18/11/2026

## Decisão

O período de teste acabou e o Escalou foi lançado. Qualquer pessoa pode criar uma conta, sem convite e sem lista de espera. Os passes continuam grátis por enquanto; a cobrança por PIX segue prevista em [[2026-10-27 — Passes de rodada pagos]].

## Como funciona

- **Grupo geral:** quem entra sem convite vai para o grupo ativo do tipo `ABERTA` (`tipo_liga`). O banco aceita só um ativo por vez (`ligas_unica_aberta_idx`). O grupo geral é o antigo "Brasileiro 2026 (Teste)", renomeado para "Brasileiro 2026" pela migration `20261118160000_brasileiro_2026_grupo_geral.sql`; os membros do teste continuam nele. Para trocar de grupo geral, arquive o atual e crie outro em `/admin/grupos/novo`, marcando "Grupo geral".
- Sem grupo geral ativo, o cadastro volta a exigir convite (falha fechada).
- Convites continuam valendo para os grupos privados, com os e-mails autorizados de sempre ([[Onboarding por Convite]]).
- Quem tem perfil, mas está sem grupo ativo (por exemplo, o grupo do teste foi arquivado), entra no grupo geral no próximo login.
- A landing troca o formulário da lista de espera por "Criar meu time" (`/entrar`). A tabela `lista_espera` e o admin `/admin/convites` ficam para tratar as inscrições antigas.
- Termos passam para `v3` (seção "Acesso e mudanças no jogo"); o regulamento deixa de ser "do teste" e de ter duração de 4 a 6 rodadas.

## Pendências

- Aplicar as migrations `20261118150000_grupo_geral_aberto.sql` e `20261118160000_brasileiro_2026_grupo_geral.sql` em produção.
- A landing ainda diz "Crie um grupo" na seção de grupos, mas criar grupo continua sendo só pelo admin.
