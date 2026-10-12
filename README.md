# API-Football — ambiente de teste

O produto usará a API-Football como fonte de elencos, jogos e scouts. Como o plano gratuito não dá acesso à temporada corrente, o ambiente de teste simula a Série A de **2024**, a temporada mais recente disponível para esta finalidade.

```bash
API_FOOTBALL_KEY="sua-chave" API_FOOTBALL_SEASON=2024 node scripts/verify-api-football.mjs
```

O script valida a Série A (league id `71`) na temporada configurada, a cobertura de estatísticas de jogadores e um payload real de `/fixtures/players`.

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

O catálogo de times vem da API-Football e não possui dados de exemplo. Aplique primeiro a migration `202609300002_clubes_logo_url.sql` e a migration de IDs da API-Football. Depois, execute `npm run sync:clubs`; o comando deve usar `API_FOOTBALL_KEY`, `API_FOOTBALL_LEAGUE_ID=71` e `API_FOOTBALL_SEASON=2024`, além das credenciais de servidor do Supabase. A rodada simulada é lida do banco pela chave `rodada_simulada_atual`; o fechamento da rodada deve avançar essa chave para a próxima. A mudança para dados da temporada corrente exige um plano que a libere e alteração explícita da variável de temporada.
