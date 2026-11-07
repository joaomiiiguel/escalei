---
titulo: Roadmap e Backlog
tipo: planejamento
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/planejamento
---

# Roadmap e Backlog

← [[Index]]

> [!info] Situação em 06/11/2026
> O MVP está no ar com o Brasileirão 2026 real desde a rodada 33. O cronograma abaixo era a estimativa de 28/09.

> [!warning] Calendário (28/09/2026)
> Em 28/09/2026 o Brasileirão 2026 está por volta da rodada 28 de 38. Construindo em ~2 semanas, sobram **~8 rodadas**: dá para o beta mais 4–6 rodadas de validação. **Confirmar as datas na tabela da CBF.** Se atrasar, a validação passa para o início da Série A 2027.

> [!tip] Execução do mês
> O detalhamento semana a semana está em [[Plano de 1 Mês — Lançamento do Teste]].

## Fases

| Fase | Período (estimado) | Saída |
|---|---|---|
| **0 · Verificação** | 29/09 – 01/10 | API-Football confirmada para a Série A 2026 no plano grátis; contrato de trabalho lido |
| **1 · Construção** | 29/09 – 19/10 | MVP no ar |
| **2 · Beta fechado** | rodada de 17–19/10 | Bugs corrigidos; coeficientes de preço calibrados |
| **3 · Validação** | lançamento em 24–26/10 + 4–6 rodadas (até ~fim de nov) | Métricas do [[Plano de Validação]] |
| **4 · Decisão** | 1 semana após a última rodada | Seguir / ajustar / parar |

## Backlog

> [!info] Conferido contra o código em 06/11/2026
> Marcado como feito o que existe no repositório. Itens fora do código (contrato, painéis do PostHog) ficaram desmarcados. Itens trocados por outra solução estão riscados, com o que entrou no lugar.

### Fase 0 · Verificação
- [ ] Ler o contrato de trabalho (ver [[Jurídico e Riscos]]); não verificável pelo código
- [x] Criar a chave da API-Football (plano de 7.500 requisições/dia; ver [[API-Football]])
- [x] Salvar respostas reais para os testes (`tests/fixtures/api-football/`)
- [x] Escolher o nome do app: **Escalou** (domínio jogueescalou.com.br)
- [x] Design: identidade própria, ver [[Identidade Visual]] (o [[Prompt de Design]] ficou como histórico)

### Fase 1 · Construção
**Base**
- [x] Projeto Next.js + Supabase + PostHog
- [x] Migrations (28 tabelas em 06/11/2026; ver [[Banco de Dados — Modelo e Campos]])
- [x] RLS das tabelas
- [x] Clubes, `tabela_pontuacao` v1 e `configuracoes` (carregados por migration e `sync-catalog`)

**Dados**
- [x] Cliente da API-Football com controle de cota (`sync_execucoes`, JOA-63, JOA-145)
- [x] ~~Jobs `sync-elencos`, `sync-lesoes`, `sync-rodada`~~ → `sync-catalog`, `sync-calendar` e lesões dentro de `advance-round`
- [x] Pontuação no banco (`fn_pontuar_jogo`) com testes contra respostas reais (`tests/scouts.test.ts`)
- [x] ~~Job `pontuar-jogo`~~ → `score-match`, chamada pelo orquestrador
- [x] Preço inicial e variação por rodada (`sync-catalog`, `fn_atualizar_precos`)
- [x] ~~Jobs `conferir-rodada`, `abrir-rodada`~~ → orquestrador `advance-round` (JOA-147)

**App**
- [x] ~~Cadastro por telefone e OTP~~ → login com Google; apelido, clube do coração e termos no onboarding
- [x] Onboarding exclusivo por convite, com e-mails autorizados (ver [[Onboarding por Convite]])
- [x] Início
- [x] Montar Time + Mercado + escalação automática
- [ ] Detalhe do Jogador
- [x] Trava e validação de formação/saldo no banco (`fn_salvar_escalacao` + RLS, JOA-138)
- [x] Escalação tardia (`fn_escalacao_tardia_aberta`)
- [x] Meu Time na Rodada
- [x] Ranking da liga: rodada e campeonato, com ▲/▼ (JOA-141, JOA-144)
- [ ] Ranking geral e por clube do coração
- [ ] Criar liga e convidar de dentro do app (hoje só pelo admin)
- [x] Entrar por link ou código de convite
- [x] Fim de Rodada compartilhável (seção do Início)
- [ ] Seja PRO (fake door)
- [ ] Pesquisa
- [x] Como Funciona e Perfil com exclusão de conta
- [x] PWA (manifest, ícones, instalar)
- [x] ~~E-mails~~ → avisos por push ([[2026-11-02 — Avisos da rodada por push]])
- [x] Eventos do PostHog (8 eventos; ver [[Plano de Validação]])
- [ ] Painéis no PostHog; não verificável pelo código
- [x] Landing pública com lista de espera ([[Landing e Lista de Espera]])
- [x] Painel admin: grupos, convites e participantes

**Publicação**
- [x] Termos de uso, privacidade e regulamento
- [x] Virada para o Brasileirão 2026 real ([[2026-10-27 — Virada para o Brasileirão 2026]])

### Passes de rodada (decidido em 27/10/2026)
- [x] JOA-151 · Schema de passes: produtos, pedidos e lotes com RLS
- [x] JOA-152 · Exigir passe para escalar e consumir na trava (atrás de `passes_obrigatorios`, desligada)
- [ ] JOA-153 · Pagamento via PIX com webhook idempotente
- [ ] JOA-154 · UI de passes: a contagem e a explicação existem; a compra aparece como "Disponível em breve"
- [ ] JOA-155 · Admin de pedidos: nota manual, cortesias e estornos

### Depois da validação (só se passar)
- [ ] Parcial ao vivo (API Pro)
- [ ] Prêmio: CNPJ, antifraude, pagamento de prêmio, IR (independente da receita dos passes)
- [ ] Patrocínio da rodada
- [ ] PRO de verdade
- [ ] Modo Rápido (Tiers), capitão, mais ligas (Série B, estaduais)

---

*Criado em 28/09/2026. Backlog conferido contra o código em 06/11/2026.*
