# Verificação da API-Football

Execute a verificação da JOA-40 com uma chave de API-Football válida:

```bash
API_FOOTBALL_KEY="sua-chave" node scripts/verify-api-football.mjs
```

O script valida a Série A (league id `71`) na temporada `2026`, a cobertura de estatísticas de jogadores e um payload real de `/fixtures/players`. Ele imprime um JSON com a decisão:

- `Free plan accepted for the MVP`: cobertura suficiente para continuar no plano gratuito.
- `Review Pro plan for one month (US$ 19) before implementation`: contratar o Pro por um mês antes de iniciar a integração.

Não registre a chave em arquivos versionados ou no Linear.

## Aplicação

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env` e preencha as variáveis do Supabase. A migration inicial está em `supabase/migrations/202609290001_foundation.sql` e deve ser aplicada ao projeto Supabase antes de testar login, onboarding e perfil.

## Login por SMS

O acesso usa telefone brasileiro e um código OTP de seis dígitos. Antes de testar, habilite **Phone** em Authentication → Providers no projeto Supabase e configure um provedor de SMS. A migration `202609300001_perfis_telefone_verificado.sql` adiciona o telefone verificado ao perfil; aplique-a antes de concluir o onboarding.

Para testar somente as telas sem disparar SMS, defina `AUTH_PHONE_OTP_MODE=mock` no `.env` de desenvolvimento. O código padrão é `000000` e pode ser alterado com `AUTH_PHONE_OTP_MOCK_CODE`. Em produção, o modo mock é ignorado e o app sempre usa o Supabase. Esse modo simula a validação visual; não cria usuário nem sessão no Supabase.

## Sincronização de clubes

O catálogo de times vem da API-Football e não possui dados de exemplo. Aplique primeiro a migration `202609300002_clubes_logo_url.sql`. Depois, execute `npm run sync:clubs`; o comando carrega automaticamente `API_FOOTBALL_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do arquivo `.env`. O script consulta `teams?league=71&season=2024`, valida IDs e siglas de três caracteres e faz upsert seguro por ID, incluindo `logo_url` fornecida pela API.
