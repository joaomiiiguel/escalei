# Verificação da API-Football

Execute a verificação da JOA-40 com uma chave de API-Football válida:

```bash
API_FOOTBALL_KEY="sua-chave" node scripts/verify-api-football.mjs
```

O script valida a Série A (league id `71`) na temporada `2026`, a cobertura de estatísticas de jogadores e um payload real de `/fixtures/players`. Ele imprime um JSON com a decisão:

- `Free plan accepted for the MVP`: cobertura suficiente para continuar no plano gratuito.
- `Review Pro plan for one month (US$ 19) before implementation`: contratar o Pro por um mês antes de iniciar a integração.

Não registre a chave em arquivos versionados ou no Linear.
