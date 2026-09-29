# Escalei — instruções para agentes

## Produto e escopo

Escalei é um PWA mobile-first de fantasy futebol gratuito para o Brasileirão Série A.

- O produto não possui apostas, prêmio em dinheiro ou linguagem que sugira jogo de azar.
- A meta do MVP é validar retenção por rodada e competição entre amigos.
- A interface, documentação e mensagens ao usuário devem estar em português do Brasil (`pt-BR`).
- A fonte de requisitos do produto está em `obsidion/`. Consulte-a antes de tomar decisões de regra de negócio, escopo ou UX.

## Stack

- Next.js 15, App Router e React 19.
- TypeScript com aliases `@/*` definidos em `tsconfig.json`.
- Tailwind CSS v4, carregado por `@import "tailwindcss"` em `app/globals.css` e pelo plugin `@tailwindcss/postcss`.
- Supabase para autenticação e Postgres, usando `@supabase/ssr`.
- CSS global e componentes de UI reutilizáveis já existem; adote Tailwind para estilos novos e evolua o CSS existente de modo incremental, sem regressões visuais.

## Estrutura do repositório

```text
app/                     Rotas, páginas e Server Actions do Next.js
app/*/actions.ts          Mutação relacionada à rota correspondente
app/api/auth/callback/    Callback de autenticação Supabase
components/ui/            Biblioteca visual reutilizável
lib/supabase/             Clientes browser, server e administrativo
supabase/migrations/      Migrations SQL versionadas
obsidion/                 Especificação, decisões, regras e planejamento
```

## Convenções de implementação

- Prefira Server Components. Adicione `"use client"` somente quando houver interatividade real do navegador.
- Use `next/link` para navegação interna e mantenha URLs internas funcionais; não deixe CTAs apontando para rotas inexistentes.
- Deixe Server Actions na pasta da rota em `actions.ts`. Valide entrada no servidor e trate erros de forma amigável.
- Use os clientes corretos:
  - `lib/supabase/server.ts` em Server Components, rotas e Server Actions;
  - `lib/supabase/client.ts` somente no navegador;
  - `lib/supabase/admin.ts` somente em contexto confiável do servidor. Nunca o importe em código cliente.
- Componentes genéricos ficam em `components/ui/`; componentes específicos de uma tela podem ficar ao lado da rota.
- Preserve o visual mobile, escuro e verde. A largura de referência é mobile; telas maiores não podem quebrar a experiência.
- Priorize semântica HTML, `aria-label` em controles somente icônicos, foco visível e contraste suficiente.
- Não introduza dados fictícios como se fossem dados reais da API. Estados de exemplo devem ser claramente identificáveis ou isolados em mocks.

## Design e Tailwind

- Antes de criar um novo componente, verifique `components/ui/index.tsx` e reutilize `Button`, `Card`, `Badge`, `Chip`, `TextField`, `Toast` e demais primitivos disponíveis.
- Não remova `app/globals.css`: ela contém tokens e estilos ativos. Migrações para utilitários Tailwind devem ser graduais.
- Evite `style={{ ... }}` para estilos novos. Prefira utilitários Tailwind; quando a regra for repetida ou estrutural, use uma classe CSS bem nomeada.
- Não instale bibliotecas de componentes ou ícones sem necessidade explícita.

## Supabase e dados

- Nunca leia, imprima, versione ou cole valores de `.env`, tokens, chaves de API ou a `service_role`.
- Mantenha `.env` fora do Git. Atualize somente `.env.example` com nomes de variáveis seguros, quando necessário.
- Toda mudança de schema deve ser uma nova migration em `supabase/migrations/`; migrations já aplicadas são imutáveis.
- Não desabilite RLS e não crie políticas amplas para contornar um erro. Preserve o isolamento por usuário em `perfis`, `times` e `times_jogadores`.
- Consultas de catálogo (`clubes`, `rodadas`, `jogadores`) são públicas por design; dados de perfil e time pertencem exclusivamente ao usuário autenticado.
- Ao mexer em banco, políticas, funções ou migrations, siga também as instruções de Postgres/Supabase disponibilizadas ao agente e valide a alteração no ambiente adequado.
- Não execute operações destrutivas no banco sem pedido explícito e confirmação do alvo.

## Autenticação

- O acesso usa Google OAuth e link mágico. Não substitua fluxos de autenticação por identificadores vindos do cliente.
- Proteja rotas privadas no servidor obtendo o usuário via Supabase e redirecionando visitantes para `/entrar`.
- O onboarding cria/completa `perfis`; valide apelido, aceite de termos e clube opcional no servidor.
- Nunca use `getSession()` como única prova de identidade para ações sensíveis; privilegie a verificação de usuário no servidor.

## Regras essenciais do fantasy

- Formaçōes permitidas: `4-3-3`, `4-4-2` e `3-5-2`.
- Posições: `GOL`, `DEF`, `MEI`, `ATA`.
- O custo máximo de escalação é C$ 100,00.
- Uma escalação é única por usuário e rodada.
- Não permita salvar ou alterar o time depois da trava da rodada.
- Use as regras e a tabela de pontuação de `obsidion/Regras do Jogo.md` como fonte de verdade antes de implementar cálculos.

## API-Football

- A cobertura da API e o plano contratado podem mudar: não assuma que o plano gratuito possui dados de estatísticas sem verificação.

## Qualidade e validação

Execute, no mínimo, antes de concluir uma mudança de código:

```bash
npm run build
git diff --check
```

- Corrija falhas de tipos, build e espaços em branco antes de prosseguir.
- Teste manualmente os fluxos afetados quando houver servidor disponível: login, onboarding, rota protegida, salvar time e estados de rodada.
- Ao alterar uma migration, valide também a aplicação da migration e as políticas RLS em uma base de desenvolvimento antes de declarar a tarefa pronta.
- Não use `npm audit fix --force` sem solicitação explícita; pode alterar dependências de forma incompatível.

## Git e Linear

Para cada issue do Linear:

1. Parta de uma `main` atualizada e limpa.
2. Crie uma branch no formato `feature/joa-XX-descricao-curta`.
3. Implemente somente o escopo da issue e valide a build.
4. Faça commits pequenos e descritivos em inglês, por exemplo: `feat: implement home and current round flow`.
5. Faça merge sem fast-forward em `main`, por exemplo: `merge: JOA-XX descricao`.
6. Atualize a issue no Linear para `Done` somente após o merge bem-sucedido.

- Não faça push, force-push, rebase de branches compartilhadas, reset destrutivo ou altere o status de uma issue fora desse fluxo sem instrução explícita.
- Preserve alterações não relacionadas já presentes no diretório de trabalho. Pare e informe se elas bloquearem a implementação.
- Não marque uma issue como concluída se ainda houver links quebrados, requisitos principais pendentes ou validação falha.

## Comunicação

- Informe de forma objetiva: arquivos alterados, validações executadas, limitações e próximos passos.
- Diferencie claramente implementado, protótipo visual e integração real com dados externos.
- Nunca afirme que uma integração de API, autenticação ou migration está validada sem ter executado uma verificação correspondente.
