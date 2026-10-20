# Análise técnica e oportunidades de IA

Data da análise: 16/10/2026

## Escopo e método

Esta análise foi feita somente por inspeção estática do repositório, sem acessar banco de dados, variáveis de ambiente, APIs externas ou dados de usuários. A `main` estava limpa e sincronizada com `origin/main` no commit `b304708`.

Há uma distinção importante entre a documentação de produto em `obsidion/` e o que está implementado hoje. Este documento descreve ambos quando necessário, marcando itens planejados ou ainda não verificados como tal.

## 1. Framework e arquitetura atual

### Stack identificada

| Camada | Implementação |
|---|---|
| Web | Next.js 15.2, App Router, React 19 e TypeScript estrito |
| Interface | Tailwind CSS v4, shadcn/ui/Base UI e Lucide |
| Autenticação | Supabase Auth com Google OAuth; callback em `/api/auth/callback` |
| Dados | Supabase Postgres com RLS, funções SQL, triggers e RPCs |
| Back-end do app | Server Components, Server Actions e Route Handlers do Next.js |
| Jobs de domínio | Supabase Edge Functions (Deno), `pg_cron` e scripts Node executados localmente/operacionalmente |
| Fonte esportiva | API-Football v3 (`v3.football.api-sports.io`) |
| Distribuição | PWA mobile-first; a documentação aponta Vercel para o front |

Não há dependências de LangChain, LangGraph, SDK de LLM, banco vetorial ou ferramenta de observabilidade/analytics no `package.json` atual. A documentação cita PostHog e Resend/SMTP como opções arquiteturais, mas não há integração de código correspondente no repositório.

### Organização e responsabilidades

```text
Navegador
  └─ Next.js App Router
       ├─ Server Components: leitura de sessão e dados Supabase
       ├─ Client Components: formulários, seleção de escalação e interações
       ├─ Server Actions: mutações autenticadas
       └─ Route Handlers: APIs internas para catálogo e escalação automática

Supabase
  ├─ Auth: sessão via cookies e Google OAuth
  ├─ Postgres: catálogo, perfis, rodadas, times, ligas e saldo
  ├─ RLS: isolamento de dados por usuário e visibilidade condicionada à trava
  ├─ SQL/RPC: pontuação, preços e crédito de saldo
  ├─ Edge Functions: sincronização, pontuação e orquestração de rodada simulada
  └─ pg_cron: disparo periódico do orquestrador simulado

API-Football
  └─ clubes, jogadores, partidas, eventos e scouts → catálogo/estatísticas locais
```

A aplicação privilegia Server Components. Os componentes cliente aparecem onde há estado do navegador, como montagem de time, filtros de mercado, countdown, modal de perfil, seletor de rodada e formulário de lista de espera.

A autenticação é reforçada em três níveis:

1. O middleware redireciona visitantes de rotas privadas para `/entrar`.
2. As páginas e Server Actions consultam `supabase.auth.getUser()` no servidor.
3. RLS protege o acesso direto ao Postgres; operações administrativas usam `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor.

O acesso a ligas é fechado: o convite é validado no servidor contra a allowlist de e-mail da liga. A seleção e gravação de time também revalidam no servidor a rodada aberta, a trava, os 11 jogadores, a formação, disponibilidade e saldo.

## 2. Mapa de rotas, páginas e componentes

### Rotas do App Router

| Rota | Tipo | Finalidade | Proteção/dados principais |
|---|---|---|---|
| `/` | página | Início e estado da rodada atual | Exige sessão, perfil e liga ativa; lê rodada, time, jogos, clubes e estatísticas |
| `/entrar` | página + action | Início via Google OAuth | Pública; preserva convite válido em cookie HTTP-only |
| `/api/auth/callback` | Route Handler | Troca o código OAuth por sessão e encaminha onboarding/convite | Pública; valida convite e liga no servidor |
| `/onboarding` | página + action | Criação/complemento de perfil | Exige sessão e convite ou participação ativa; grava `perfis` e entrada na liga |
| `/convite` | página + action | Entrada por código de convite | Pública; converte código em token de convite |
| `/convite/[token]` | página + action | Visualização e aceite de convite | Token UUID validado e e-mail autorizado no servidor |
| `/escalar` | página + action | Montagem, edição e consulta do time da rodada | Exige sessão, perfil e liga ativa; lê saldo/catálogo e grava `times`/`times_jogadores` |
| `/api/jogadores?posicao=` | Route Handler GET | Catálogo de jogadores por posição para o montador | Valida posição; retorna apenas jogadores ativos |
| `/api/escalacao-automatica?formacao=` | Route Handler GET | Sugere escalação dentro do saldo | Exige sessão; valida formação e mercado aberto |
| `/ligas` | página | Lista de ligas do usuário | Exige sessão, perfil e liga ativa |
| `/ligas/[id]` | página | Ranking e membros de uma liga por rodada | Confirma participação antes de ler dados da liga |
| `/perfil` | página + actions | Preferências, dados de perfil, logout e exclusão de conta | Exige sessão; atualização do próprio perfil; exclusão usa Admin API no servidor |
| `/como-funciona` | página + fluxo cliente | Explicação visual das regras | Exige sessão, perfil e liga ativa |
| `/admin` | página | Redirecionamento/área administrativa | Layout valida registro em `administradores` |
| `/admin/participantes` | página | Participantes do beta | Área administrativa |
| `/admin/grupos` | página | Lista e gestão de grupos/ligas | Área administrativa |
| `/admin/grupos/novo` | página | Criação de grupo | Área administrativa |
| `/admin/grupos/[id]` | página | Gestão de membros e convites por e-mail | Área administrativa |
| `/beta` | página pública | Landing page do beta e lista de espera | Pública; formulário é somente protótipo visual no estado atual |
| `/termos` | página | Termos | Pública |
| `/privacidade` | página | Política de privacidade | Pública |
| `loading.tsx` | estado global | Fallback de carregamento | Global |

### Componentes de domínio

| Grupo | Componentes | Responsabilidade |
|---|---|---|
| Rodada inicial | `active-round-view`, `default-round-view`, `lock-countdown` | Exibir mercado, andamento, jogos, bloqueio e estados de rodada |
| Escalação | `lineup-builder`, `lineup-formation`, `lineup-pitch`, `lineup-summary`, `saved-lineup`, `market-player-card`, `budget-bar`, `field-player-chip` | Escolha dos 11 jogadores, formação, orçamento e time salvo |
| Ligas/ranking | `league-card`, `ranking-row`, `round-recap-card`, `round-badge`, `round-selector` | Navegação e classificação de ligas/rodadas |
| Jogo | `match-card`, `player-status`, `player-shirt`, `score-card`, `team-logo` | Exibição de partidas, jogadores, status e identidade visual |
| Navegação/feedback | `navbar`, `app-nav`, `mobile-status-bar`, `install-banner`, `empty-state`, `toast`, `how-it-works-modal` | Navegação mobile, PWA e estados de interface |
| Primitivos | `button`, `input`, `select`, `toggle`, `badge`, `card`, `bottom-sheet`, `checkbox` e outros em `components/ui`/`components/shadcn` | Biblioteca reutilizável de UI |

### Observações relevantes do mapeamento

- O layout raiz injeta a navbar e calcula se existe time na rodada atual.
- A página de liga calcula hoje o ranking com consultas administrativas e soma de scouts; há também a tabela `ranking_rodada`, atualizada pela função SQL de pontuação, que é a fonte materializada prevista para ranking geral.
- A página `/beta` coleta nome, WhatsApp, e-mail e consentimento apenas no estado React e simula sucesso com `setTimeout`; não há Route Handler, Server Action ou persistência de lista de espera. Não se deve tratar esse formulário como captação real de dados.

## 3. APIs e integrações

### APIs internas do Next.js

| Endpoint | Consumidor | Comportamento |
|---|---|---|
| `GET /api/jogadores?posicao=GOL|DEF|MEI|ATA` | `lineup-formation` | Valida a posição e devolve até 300 jogadores ativos com clube e preço |
| `GET /api/escalacao-automatica?formacao=4-3-3|4-4-2|3-5-2` | `lineup-builder` | Requer usuário autenticado, mercado aberto e saldo; ranqueia candidatos por médias, jogos, mando, força recente do adversário e orçamento |
| `GET /api/auth/callback?code=` | Supabase OAuth | Troca código por sessão, verifica elegibilidade do convite e direciona o usuário |

As mutações da interface não seguem uma API REST pública: usam Server Actions co-localizadas (`entrar`, `onboarding`, `escalar`, `perfil`, `convite` e `admin`).

### Integrações Supabase

| Serviço | Uso implementado |
|---|---|
| Auth | Google OAuth, atualização de e-mail, logout e remoção de conta |
| Postgres | Persistência de domínio, consultas de Server Components, RLS e RPCs |
| Edge Functions | `sync-round`, `score-match`, `advance-simulated-round` |
| Cron | Migration agenda o orquestrador de rodada simulada; a documentação prevê cron também para operação real |
| Admin API | Operações confiáveis no servidor: consulta administrativa de ligas, allowlist de convites e exclusão de conta |

### API-Football

A integração atual usa a API-Football v3 com a chave mantida somente no ambiente servidor/Edge Functions. Os fluxos observados são:

- Scripts Node: sincronização de clubes e jogadores.
- `sync-round`: carrega partidas de uma rodada e atualiza `rodadas`/`jogos`.
- `advance-simulated-round`: consulta o placar final de partidas históricas simuladas, fecha jogos e chama `score-match`.
- `score-match`: lê scouts por jogador e eventos, normaliza os dados, persiste em `estatisticas_jogador` e chama `fn_pontuar_jogo`.

A documentação alerta que o plano gratuito pode não fornecer a temporada atual; a implementação usa 2024 como padrão para ambiente de teste. A cobertura e os limites da chave de produção continuam sendo uma dependência operacional a validar antes de usar dados atuais.

### Integrações planejadas, mas não encontradas no código

- PostHog para funil, coortes e retenção.
- Resend ou SMTP para lembretes da trava e avisos de fim/início de rodada.
- API de WhatsApp/grupo oficial para o fluxo de beta.

## 4. Armazenamento e integridade dos dados

### Modelo de dados efetivamente migrado

| Grupo | Tabelas e finalidade |
|---|---|
| Identidade | `auth.users` (Supabase Auth) e `perfis` (apelido, e-mail, telefone, clube, preferências e aceite) |
| Catálogo esportivo | `clubes`, `jogadores`, `rodadas`, `jogos`, `estatisticas_jogador`, `tabela_pontuacao`, `versoes_pontuacao`, `historico_precos`, `configuracoes` |
| Jogo do usuário | `times`, `times_jogadores`, `ranking_rodada` |
| Social/administração | `administradores`, `ligas`, `ligas_membros`, `ligas_convites_email` |
| Economia | `carteiras`, `movimentacoes_saldo` |
| Operação | `sync_execucoes`, com registro de tipo, referência, requisições, cota, sucesso e erro |

Dados relacionais e valores de pontos/preços são armazenados em Postgres. IDs de catálogo são inteiros; entidades do app e autenticação usam UUID. Preços, saldo e pontos usam `numeric`, evitando erro de ponto flutuante em orçamento e ranking. A tabela de estatísticas guarda `payload_api` em `jsonb` para auditoria e recálculo.

### Regras de domínio aplicadas no banco

- Uma escalação por usuário e rodada: unicidade em `(usuario_id, rodada_id)`.
- Uma carteira por usuário; um rendimento por usuário/rodada/tipo.
- Formações permitidas no app: `4-3-3`, `4-4-2` e `3-5-2`.
- Pontuação reproduzível: cada rodada aponta para uma versão de regra; `fn_pontuar_jogo` atualiza scouts, time e ranking.
- Atualização de preço e crédito de saldo usam `pg_advisory_xact_lock` e são idempotentes por fotos/índices únicos.
- Convites usam token UUID e allowlist de e-mail normalizado.

### Segurança e isolamento

- RLS separa catálogo público de dados pessoais e times do usuário.
- Antes da trava, outros participantes não leem escalações; após a trava, as políticas liberam leitura para efeito de competição.
- `carteiras` e `movimentacoes_saldo` são legíveis apenas pelo próprio usuário autenticado.
- Funções críticas (`fn_pontuar_jogo`, `fn_atualizar_precos`, `fn_creditar_saldos_rodada`) só concedem execução a `service_role`.
- Service role aparece somente em arquivos de servidor, scripts operacionais e Edge Functions. Ela não deve ser exposta a qualquer componente cliente, ferramenta de IA ou prompt.

### Lacunas e pontos de atenção observados

1. O formulário público de beta apresenta confirmação sem gravar nem enviar dados. Para uma integração real, é necessário armazenamento, validação no servidor, rate limit, consentimento versionado, retenção e canal de revogação LGPD.
2. A documentação técnica é mais ampla do que as migrations encontradas em alguns pontos: não foram localizadas as funções/triggers documentadas `fn_validar_time` e `fn_bloquear_pos_trava`, nem migrations para `interesse_pro` e `pesquisas_respostas`. A aplicação revalida a escalação em Server Action, mas a ausência dos triggers planejados deve ser confirmada e tratada antes de considerar essas invariantes exclusivamente garantidas no banco.
3. A documentação antiga menciona `football-data.org` e login por telefone/OTP; o código atual integra API-Football e Google OAuth. O texto de arquitetura deve ser atualizado para não induzir decisões erradas.
4. A automação de escalação é uma heurística determinística, não IA generativa. Isso é positivo para previsibilidade e custo; recomendações futuras devem preservar transparência dos critérios.

## 5. Proposta de arquitetura multiagente com LangGraph

### Objetivo recomendado

Adicionar assistência explicável para o fantasy sem delegar ao modelo decisões autoritativas de negócio, persistência ou autorização. Exemplos apropriados:

- explicar uma recomendação de escalação;
- responder dúvidas sobre regras, trava, pontuação e funcionamento;
- resumir o estado público da rodada;
- comparar alternativas de jogadores com base nos dados locais já autorizados;
- gerar rascunhos de comunicação operacional para revisão humana.

Não é recomendado permitir que agentes salvem escalações, gerenciem usuários, mudem saldo, acionem `service_role`, aceitem convites ou executem jobs de pontuação. Essas ações permanecem determinísticas, auditáveis e protegidas pelas Server Actions/RPCs atuais.

### Topologia sugerida

Usar LangGraph.js para permanecer no ecossistema TypeScript. A execução deve ficar no servidor, em um módulo/worker de IA separado da UI, e não em Client Components.

```text
Chat/CTA no Next.js
  └─ POST para endpoint autenticado de IA
       └─ contexto mínimo do usuário (id obtido da sessão)
            └─ LangGraph: supervisor/router
                 ├─ Agente de regras e suporte (RAG documental)
                 ├─ Agente de análise de rodada (ferramentas de leitura)
                 ├─ Agente de recomendação explicável (ferramentas de leitura)
                 ├─ Agente de segurança/política (guardrail)
                 └─ Síntese com citações e aviso de dados indisponíveis
                      └─ resposta sem efeito colateral
```

### Estado do grafo

O estado mínimo deve conter:

- `threadId` opaco por conversa;
- `userId` obtido exclusivamente da sessão no servidor;
- intenção classificada;
- pergunta normalizada;
- contexto autorizado e minimizado;
- documentos recuperados com fonte, versão e score;
- chamadas de ferramentas e resultados estruturados;
- resposta com citações e flags de segurança;
- identificação de que a resposta é informativa, não garantia de resultado.

Persistir checkpoints e histórico em Postgres com RLS por `user_id`, ou inicialmente manter conversas efêmeras no servidor. Não gravar prompts/respostas contendo e-mail, telefone, tokens, chaves ou dados privados de outros usuários. Se houver retenção, definir prazo e exclusão junto à política de privacidade.

### Agentes e ferramentas permitidas

| Nó/agente | Responsabilidade | Ferramentas permitidas |
|---|---|---|
| Router/Supervisor | Identificar intenção e selecionar fluxo | Classificador estruturado; sem acesso direto ao banco |
| Guardrail | Bloquear pedido de ação sensível, promessa de rendimento, dados de terceiros pré-trava e instruções inseguras | Política estática + verificação de escopo |
| Regras e suporte | Explicar regras, formações, cálculo e estados de rodada | RAG somente sobre documentos aprovados |
| Analista da rodada | Resumir jogos, mercado e estatísticas já disponíveis | Funções de consulta com colunas e filtros pré-definidos |
| Recomendador | Comparar alternativas e explicar trade-offs | Dados locais de jogadores/rodada; usa a heurística existente como sinal, não como verdade do modelo |
| Verificador de resposta | Exigir citações, conferir que não há dado inventado e aplicar limites de linguagem | Validador estruturado e filtros |

As ferramentas devem ser funções de domínio pequenas, com contratos de entrada/saída tipados. Por exemplo: `getCurrentRoundForUser`, `getAuthorizedMarketPlayers`, `getPublicPlayerStatistics` e `getMyLineup`. Elas devem derivar o usuário da sessão e nunca aceitar um `usuario_id` do modelo ou navegador como prova de acesso.

### Modelo de execução e segurança

1. O Route Handler verifica a sessão Supabase e aplica rate limit por usuário/IP.
2. O servidor cria o contexto autorizado a partir do `user.id`; o LLM nunca escolhe o escopo de dados.
3. O router só pode invocar ferramentas allowlisted e de leitura.
4. Consultas usam o cliente Supabase de servidor com RLS, ou uma camada de leitura que reaplica explicitamente as regras atuais. `createAdminClient` não deve ficar disponível para agentes de usuário.
5. O agente responde com fontes e datas dos dados. Quando não houver dado, diz que não sabe.
6. Todas as chamadas têm timeout, limite de tokens, limite de ferramentas, observabilidade sem PII e fallback de indisponibilidade.
7. Qualquer futura ação de escrita precisa ser uma intenção estruturada, revisão/consentimento explícito na UI e execução pela Server Action existente — nunca pelo texto livre do agente.

### Entrega incremental recomendada

| Fase | Entrega | Risco/controlos |
|---|---|---|
| 1 | Assistente de regras com RAG somente leitura | Baixo; fonte documental versionada e citações obrigatórias |
| 2 | Explicação do time e comparador de jogadores autenticado | Médio; ferramentas tipadas, RLS e nenhuma escrita |
| 3 | Resumo de rodada e notificações em rascunho | Médio; revisão humana e status de dado externo explícito |
| 4 | Proposta de alterações no time | Alto; somente proposta estruturada; salvar continua por Server Action e confirmação do usuário |

## 6. Oportunidades de RAG

### Prioridade alta: base de conhecimento de regras e produto

Fontes candidatas:

- `obsidion/01-Produto/Regras do Jogo.md`;
- `obsidion/01-Produto/Fluxo de Telas.md`;
- `obsidion/02-Tecnico/Pontuacao.md`;
- documentação pública de termos e privacidade;
- conteúdo curado da tela `como-funciona`.

Casos de uso:

- “Por que meu jogador não pontuou?”
- “Até quando posso escalar?”
- “Como funciona empate no ranking?”
- “Quais formações são válidas?”
- “O que acontece se a API atrasar os scouts?”

Este é o melhor primeiro uso porque depende de conteúdo relativamente estável, não precisa acessar dados pessoais e pode responder com citação de fonte e versão da regra.

### Prioridade média: explicação contextual do mercado

Em vez de indexar dados mutáveis de jogadores em vetores, usar ferramentas determinísticas para obter os dados atuais do Postgres e usar RAG apenas para a explicação das regras. Exemplos:

- explicar por que o orçamento não permite uma combinação;
- comparar média, preço e status de dois jogadores;
- explicar a recomendação automática existente;
- descrever o que significa um status de jogador.

Isso evita respostas obsoletas e reduz duplicação do catálogo no índice vetorial.

### Prioridade média: suporte operacional interno

Indexar documentação operacional aprovada para responder a administradores sobre:

- fluxo de convite e allowlist;
- significado de estados de rodada;
- procedimentos de sincronização;
- tratamento de falha da API-Football;
- checklist de beta.

Esse índice deve ser separado do índice de usuário e só pode ser consultado após autorização administrativa no servidor.

### Arquitetura de RAG sugerida

1. **Ingestão controlada:** CI ou job administrativo lê somente diretórios/documentos aprovados; converte Markdown em chunks semânticos com título, seção e links.
2. **Versionamento:** cada chunk deve registrar `source_path`, hash do documento, título, seção, data de indexação, versão e público (`publico`, `autenticado`, `admin`).
3. **Armazenamento:** Supabase Postgres com extensão `pgvector` é compatível com a arquitetura existente e evita introduzir um novo banco no MVP. Usar tabelas próprias, por exemplo `ai_documentos` e `ai_chunks`, com RLS.
4. **Recuperação híbrida:** combinar busca vetorial com full-text search do Postgres e filtro obrigatório de audiência/versão.
5. **Geração fundamentada:** exigir que o nó de síntese cite os trechos recuperados; sem evidência suficiente, deve responder que não encontrou a informação.
6. **Avaliação:** manter um conjunto de perguntas em pt-BR com resposta/citação esperada; medir precisão de recuperação, cobertura de citação, respostas sem suporte e latência.

### Conteúdo que não deve entrar em RAG

- `.env`, chaves de API, service role, tokens, cookies e logs sensíveis;
- dados de autenticação, e-mail e telefone;
- escalações de terceiros antes da trava;
- dados completos de perfil e conversas privadas;
- payloads crus da API-Football, salvo necessidade específica, autorização e política de retenção;
- SQL operacional que permita instruções de mutação sem revisão.

## Decisões recomendadas antes de implementar IA

1. Definir o primeiro caso de uso: recomenda-se “assistente de regras com citações”, não escalação autônoma.
2. Escolher provedor de LLM e embeddings, política de retenção, região e custo máximo por usuário.
3. Atualizar a documentação arquitetural para refletir Google OAuth e API-Football, removendo referências obsoletas quando confirmadas.
4. Definir modelo de privacidade para chat, logs e exclusão de dados LGPD.
5. Criar contratos de ferramenta de leitura e testes de autorização antes de conectar qualquer agente ao banco.
6. Criar avaliação offline com perguntas de regras e cenários de segurança antes de expor a funcionalidade no beta.

## Referências inspecionadas

- `AGENTS.md`
- `package.json`, `tsconfig.json`
- `app/`, `components/`, `lib/`, `middleware.ts`
- `supabase/migrations/`, `supabase/functions/` e `supabase/tests/rls_privacidade.sql`
- `scripts/`
- `obsidion/02-Tecnico/Arquitetura.md`
- `obsidion/02-Tecnico/Banco de Dados — Modelo e Campos.md`
- `obsidion/02-Tecnico/API-Football.md`
- `obsidion/02-Tecnico/Orquestrador da Rodada.md`
- `obsidion/01-Produto/Fluxo de Telas.md`
