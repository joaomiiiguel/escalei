---
titulo: Arquitetura
tipo: arquitetura
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/tecnico
  - stack/nextjs
  - stack/supabase
---

# Arquitetura

← [[Index]] · Dados: [[Banco de Dados — Modelo e Campos]] · Fonte: [[API-Football]]

> [!abstract] Em uma frase
> **Next.js (PWA) na Vercel + Supabase (Auth, Postgres, Cron) + PostHog**, tudo nos planos grátis. Os jobs leem a API-Football e gravam no banco; o app só lê o banco.

## Stack

| Camada      | Escolha                                           |                   Custo | Por quê                                   |
| ----------- | ------------------------------------------------- | ----------------------: | ----------------------------------------- |
| Front + API | Next.js (App Router), PWA instalável              |     R$ 0 (Vercel Hobby) | Um projeto só, deploy por push            |
| Login       | Supabase Auth: telefone + OTP por SMS             |                    R$ 0 | Sem senha para gerenciar                  |
| Banco       | Supabase Postgres + RLS                           |           R$ 0 (500 MB) | Regras de segurança no banco              |
| Jobs        | Supabase Cron (`pg_cron`) chamando Edge Functions |                    R$ 0 | Não depende do limite de cron da Vercel   |
| Métricas    | PostHog                                           | R$ 0 (1 mi eventos/mês) | Funil, retenção por coorte, questionários |
| E-mail      | Resend ou o SMTP do Supabase                      |                    R$ 0 | Lembrete de trava e fim de rodada         |
| Domínio     | .com.br                                           |              ~R$ 40/ano |                                           |

> [!note] Plano Hobby da Vercel
> O plano Hobby é para **uso não comercial**. Na validação, sem receita, está ok. Quando entrar anúncio, patrocínio ou PRO: plano Pro (~US$ 20/mês) ou outro host.

## Fluxo de dados

```
API-Football ──(jobs, service role)──► Postgres (Supabase)
                                         ▲        │
                                         │        ▼
                           Next.js (RLS, anon/auth) ──► navegador (PWA)
                                                    └──► PostHog (eventos)
```

## Jobs

| Job | Quando | Faz |
|---|---|---|
| `sync-elencos` | Segunda de manhã | `/players/squads` × 20 → `jogadores` |
| `sync-lesoes` | Diário, 10h | `/injuries` → `jogadores.status` |
| `sync-rodada` | A cada 20 min, 16h–24h, em dia de jogo | `/fixtures?round=` → `jogos.status`, placar e `rodadas.trava_em` |
| `pontuar-jogo` | Disparado quando um jogo muda para `ENCERRADO` | `/fixtures?id=` → `estatisticas_jogador` → `fn_pontuar_jogo` |
| `conferir-rodada` | Dia seguinte ao último jogo, 12h | 2ª leitura de cada jogo → `fn_fechar_rodada` → `fn_atualizar_precos` |
| `abrir-rodada` | Logo depois do fechamento | Rodada seguinte `ABERTA` + e-mail "a rodada abriu" |
| `lembrete-trava` | 3 h antes de `trava_em` | E-mail para quem ainda não escalou |

Todo job grava em `sync_execucoes` e respeita a reserva de cota.

## Estrutura do projeto

```
app/
  (auth)/entrar, convite/[codigo]
  inicio/  time/montar  time/rodada  ranking/  ligas/[id]  pro/  como-funciona/  perfil/
lib/
  supabase/ (clients server/browser)
  pontuacao.ts        ← função pura: scouts × tabela → pontos (100% testada)
  preco.ts            ← função pura: fórmula de preço
  formacao.ts         ← validação de formação e orçamento (espelha a trigger)
supabase/
  migrations/         ← schema, enums, RLS, funções
  functions/          ← edge functions dos jobs + cliente da API-Football
  seed.sql            ← clubes com sigla/cores, tabela_pontuacao v1
tests/
  fixtures/api-football/  ← respostas reais gravadas (usar nos testes, não na API)
```

> [!tip] Testar com resposta real gravada
> Na primeira chamada bem-sucedida, salvar o JSON em `tests/fixtures/`. Os testes de `pontuacao.ts` e dos jobs rodam contra esses arquivos, sem gastar cota e sem depender de dia de jogo.

## Decisões técnicas

- **Pontuação calculada no banco** (`fn_pontuar_jogo`), com `pontuacao.ts` idêntica para exibir a prévia no front. O teste garante que os dois batem.
- **Ranking materializado** (`ranking_rodada`) regravado a cada jogo pontuado. Com 500 usuários, cada recálculo leva milissegundos.
- **Sem tempo real (websocket)** no MVP: o front recarrega ao abrir e no pull-to-refresh.

---

*Criado em 28/09/2026.*
