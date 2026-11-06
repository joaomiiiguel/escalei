---
titulo: Arquitetura
tipo: arquitetura
projeto: Fantasy Futebol
criado-em: 2026-09-28
atualizado-em: 2026-11-06
tags:
  - projeto/fantasy-futebol
  - area/tecnico
  - stack/nextjs
  - stack/supabase
---

# Arquitetura

← [[Index]] · Dados: [[Banco de Dados — Modelo e Campos]] · Fonte: [[API-Football]] · Operação: [[Ativação de Produção — Calendário e Orquestração]]

> [!abstract] Em uma frase
> **Next.js (PWA) + Supabase (Auth, Postgres, Edge Functions, `pg_cron`) + PostHog.** As Edge Functions leem a **API-Football** e gravam no banco; o app só lê o banco. Desde 27/10/2026 o sistema roda o **Brasileirão 2026 real**, a partir da rodada 33.

> [!info] Conferido contra o código em 06/11/2026
> A versão de 28/09 desta nota previa football-data.org, login por SMS, e-mails e jobs com outros nomes. Nada disso foi construído assim.

## Stack

| Camada | Escolha | Observação |
|---|---|---|
| Front + servidor | Next.js 15 (App Router), React 19, TypeScript | Server Components por padrão; mutações em Server Actions (`app/*/actions.ts`) |
| Interface | Tailwind CSS v4 + shadcn/ui (Base UI) + Lucide | Identidade em [[Identidade Visual]] |
| PWA | `app/manifest.ts`, service worker, convite para instalar | Push exige o app instalado no iPhone |
| Login | Supabase Auth com **Google** | Acesso ao grupo por convite autorizado por e-mail ([[Onboarding por Convite]]) |
| Banco | Supabase Postgres + RLS | Regras transacionais no banco (`fn_salvar_escalacao`) |
| Jobs | `pg_cron` chamando Edge Functions (Deno) | Toda chamada à API passa por `supabase/functions/_shared/api-football.ts` |
| Avisos | Web Push (VAPID) | Ver [[2026-11-02 — Avisos da rodada por push]] |
| Métricas | PostHog (`posthog-js`) | Eventos em `lib/analytics/events.ts` |
| Hospedagem | Vercel | |

## Fluxo de dados

```
API-Football ──(Edge Functions, service role)──► Postgres (Supabase)
                                                   ▲        │
                                                   │        ▼
                                  Next.js (RLS, usuário autenticado) ──► navegador (PWA)
                                                                     ├──► PostHog (eventos)
                                  notify-whatsapp ──(Web Push)──────► aparelhos inscritos
```

## Jobs (`pg_cron`)

| Cron | Quando | Edge Function | Faz |
|---|---|---|---|
| `avancar-rodada` | a cada 2 min | `advance-round` | Orquestrador real: abre a rodada em `abre_em`, trava em `trava_em` (consome passes), atualiza lesionados e suspensos, status e placar dos jogos em andamento, pontua os encerrados via `score-match`, confere 1 h depois do último jogo pontuado, atualiza preços, credita saldos e fecha |
| `sincronizar-calendario` | a cada 6 h (minuto 15) | `sync-calendar` | Calendário oficial: rodadas a partir de `rodada_estreia`, jogos, `abre_em` e `trava_em` |
| `sincronizar-catalogo` | segunda, 9h UTC | `sync-catalog` | Clubes e elencos da temporada, com posição e preço inicial |
| `notificar-avisos-whatsapp` | a cada 2 min | `notify-whatsapp` | Enfileira e envia os avisos da rodada por push |

`score-match` não tem cron: é chamada pelo orquestrador para cada jogo encerrado (e de novo na conferência). `advance-simulated-round` e `sync-round` são da simulação da temporada 2024 e ficaram **sem agendamento** desde a virada de 27/10 (ver [[Orquestrador da Rodada Simulada]]).

Todo job grava em `sync_execucoes` e respeita o orçamento diário da API em `configuracoes`.

## Estrutura do projeto

```
app/
  (landing)/              landing pública com lista de espera, termos, privacidade, regulamento
  entrar/  onboarding/  convite/  convite/[token]/
  inicio/  escalar/  ligas/  ligas/[id]/  perfil/  como-funciona/
  admin/                  grupos, convites (lista de espera) e participantes
  api/                    callback do login, jogadores do mercado, escalação automática
components/
  ui/                     biblioteca visual (campo, mercado, placar, botões)
  page/home/              seções do Início
  pwa/  analytics/
lib/                      regras puras: lineup-rules, round-home, league-ranking, round-pass,
                          round-recap, scoring-table, player-availability, auto-lineup…
lib/supabase/             clientes server, browser e admin
supabase/
  migrations/             schema, RLS, funções e crons (48 em 06/11/2026)
  functions/              Edge Functions + _shared (cliente da API, calendário, catálogo, lesões, retry)
tests/                    Vitest; fixtures com respostas reais da API em tests/fixtures/
```

## Decisões técnicas

- **Escalação validada no banco** (`fn_salvar_escalacao`): formação, saldo, trava, escalação tardia, jogadores indisponíveis e passe numa transação só.
- **Pontuação calculada no banco** (`fn_pontuar_jogo`) com regras versionadas (`versoes_pontuacao`).
- **Ranking da rodada materializado** (`ranking_rodada`), regravado a cada jogo pontuado; o do campeonato vem de `fn_ranking_campeonato`.
- **Sem tempo real (websocket):** a tela recarrega ao abrir.
- **Regras de interface em funções puras** em `lib/` (ex.: `round-home.ts`, `league-ranking.ts`), testadas sem React nem Supabase.
- **Orçamento diário da API** contado pelo próprio projeto, com pausa crescente entre tentativas (JOA-145).

---

*Criado em 28/09/2026. Reescrito em 06/11/2026 a partir do código.*
