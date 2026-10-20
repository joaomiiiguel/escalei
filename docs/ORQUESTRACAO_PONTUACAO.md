# Orquestração de Pontuação — Documentação Técnica

## Visão Geral

O sistema usa **duas funções Edge** orquestradas por **pg_cron** para gerenciar o ciclo de vida da rodada e a pontuação dos jogos:

| Função | Cron | Responsabilidade |
|--------|------|------------------|
| `sync-round` | Horário (`0 * * * *`) | Sincroniza jogos/rodada da API-Football → `rodadas`, `jogos` |
| `advance-simulated-round` | 2 min (`*/2 * * * *`) | Orquestra status de jogos, pontuação, conferência, fechamento |

---

## Fluxo Completo (Simulação)

### 1. `sync-round` (Hourly)
- Lê `configuracoes.rodada_simulada_atual`
- Busca fixtures da API-Football para a rodada
- Upsert em `rodadas` (status `EM_ANDAMENTO`) + `jogos` (status `A_JOGAR`/`EM_ANDAMENTO`/`ENCERRADO`)

### 2. `advance-simulated-round` (Every 2 min)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Se rodada anterior FECHADA → abre próxima AGENDADA (abre_em) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Se rodada ABERTA e agora >= trava_em → status EM_ANDAMENTO   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Jogos A_JOGAR com inicio_simulado_em <= agora:               │
│    → Consulta API-Football (/fixtures?id=)                      │
│    → Se status FT/AET/PEN → atualiza jogo para ENCERRADO        │
│    → Chama score-match (jogoId) para pontuar                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Busca jogos ENCERRADO sem pontuado_em → chama score-match    │
│    (reprocessa qualquer jogo que falhou antes)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Se TODOS jogos da rodada têm pontuado_em:                    │
│    → Define fechamento_simulado_em = último pontuado_em + 1h    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Se agora >= fechamento_simulado_em:                          │
│    → Para jogos sem conferido_em → score-match (conferencia)   │
│    → Chama fn_atualizar_precos(rodada_id)                       │
│    → Chama fn_creditar_saldos_rodada(rodada_id)                 │
│    → Marca rodada FECHADA + fechada_em = now                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## `score-match` — Duas Fases

| Fase | Trigger | Parâmetro | O que faz |
|------|---------|-----------|-----------|
| **Scouts** | Jogo encerra | `{ jogoId }` | Busca scouts na API → upsert `estatisticas_jogador` → `fn_pontuar_jogo` |
| **Conferência** | Fechamento + 1h | `{ jogoId, conferencia: true }` | Re-lê scouts (versão 2) → recalcula → marca `jogos.conferido_em` |

---

## Produção — O que Falta

Para temporada real (não simulada), **não existe** o equivalente ao `advance-simulated-round`. Seria necessário:

1. **Job de abertura de rodada**: Detectar `rodadas` com `status=AGENDADA` e `abre_em <= now` → `ABERTA`
2. **Job de trava**: Detectar `rodadas` com `status=ABERTA` e `trava_em <= now` → `EM_ANDAMENTO`
3. **Job de pontuação**: Detectar `jogos` com `status=ENCERRADO` e `pontuado_em IS NULL` → `score-match`
4. **Job de conferência**: Agendar 1h após último jogo da rodada → re-chamar `score-match` conferência
5. **Job de fechamento**: Após conferência → `fn_atualizar_precos` + `fn_creditar_saldos_rodada` → `FECHADA`

### Sugestão de Implementação (Produção)

```sql
-- Job único a cada 2 min (como simulação) que faz tudo:
select cron.schedule(
  'avancar-rodada-producao',
  '*/2 * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_project_url') || '/functions/v1/advance-production-round',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key')
      ),
      body := '{}'::jsonb
    );
  $cron$
);
```

E criar `advance-production-round` similar ao simulado mas sem `simulada=true` filtros.

---

## Segurança

- **Service Role** usado apenas em Edge Functions (server-side)
- `pg_cron` usa `cron_publishable_key` (anon) + `Authorization: Bearer <service_role>` no header
- Secrets no **Supabase Vault** (`cron_project_url`, `cron_publishable_key`)
- RLS bypass intencional via `security definer` functions + service role

---

## Monitoramento

Tabela `sync_execucoes` registra:
- `tipo`: 'RODADA' (sync-round) ou futuramente 'PONTUACAO'
- `sucesso` + `erro` para debugging
- `requisicoes` para controle de cota API-Football