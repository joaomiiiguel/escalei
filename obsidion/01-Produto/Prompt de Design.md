---
titulo: Prompt de Design
tipo: prompt-de-design
projeto: Fantasy Futebol
versao: 1
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/design
---

# Prompt de Design

← [[Index]] · Telas: [[Fluxo de Telas]] · Regras: [[Regras do Jogo]]

> [!note] Versão 1 (28/09/2026)
> Somente mobile, sem apostas, sem prêmio, pontos lançados a cada jogo encerrado. Em relação ao prompt entregue no chat, as posições passaram a ser **GOL · DEF · MEI · ATA**, porque a API-Football não separa zagueiro de lateral (ver [[Regras do Jogo]]).

**Como usar:** no Figma Make ou Stitch, comece pela página de componentes e depois peça as telas na ordem do fluxo clicável. Troque `[NOME DO APP]` quando houver nome.

```text
Crie o protótipo de alta fidelidade de um app mobile de FANTASY FUTEBOL GRATUITO (estilo Cartola FC)
para o Brasileirão Série A. É um produto independente, novo, em fase de validação: não tem apostas,
não tem prêmios em dinheiro e não tem pagamento. O objetivo das telas é fazer o usuário montar o
time em poucos minutos, voltar a cada jogo encerrado para ver os pontos e convidar amigos para ligas
privadas. Idioma: português do Brasil.

PLATAFORMA — SOMENTE MOBILE
- App web instalável (PWA), frame 390×844. NÃO gere desktop nem tablet.
- Navbar inferior fixa com 4 itens: Início · Meu Time · Ligas · Perfil.
- Safe areas respeitadas, uso com uma mão, CTA principal em barra fixa acima da navbar.
- Padrões: bottom sheets com alça, pull-to-refresh, skeleton loading, toasts no topo, estados vazios
  com ilustração simples.

IDENTIDADE VISUAL (marca nova — proponha)
- Nome provisório do app: [NOME DO APP]. Crie um logotipo simples só com texto e um ícone.
- Proponha uma identidade própria, esportiva e moderna, com tema escuro e tema claro. NÃO use
  glassmorphism nem a combinação azul-marinho + magenta.
- Sugestão de ponto de partida (pode ajustar): base grafite, cor principal verde-gramado vibrante,
  apoio em amarelo para destaques e pódio. Verde para pontos positivos, vermelho para negativos.
- Tipografia sans-serif geométrica (ex.: Inter, Manrope ou Plus Jakarta Sans), números tabulares nos
  placares e pontuações. Cantos 12–16px. Alvos de toque ≥ 44px.
- Todas as cores como tokens (primary, surface, surface-elevated, text-primary, text-secondary,
  success, danger, highlight). Nada de cor fixa nos componentes.
- JOGADORES E CLUBES: sem fotos de atletas e sem escudos. Cada jogador é uma CAMISA GENÉRICA nas
  cores do clube com o número; cada clube é uma SIGLA de 3 letras (FLA, PAL, COR, SAO, BOT...).
  Nomes de jogadores e clubes inventados.

REGRAS DO JOGO QUE A INTERFACE PRECISA DEIXAR CLARAS
- A cada rodada do Brasileirão o usuário escala 11 jogadores numa formação (4-3-3, 4-4-2 ou 3-5-2),
  dentro de um orçamento de C$ 100 (cartoletas). Posições: GOL, DEF, MEI, ATA (não há separação entre
  zagueiro e lateral). O preço de cada jogador sobe ou desce conforme a média dos últimos jogos.
- A escalação TRAVA no início do primeiro jogo da rodada (contagem regressiva sempre visível).
- NÃO há parcial ao vivo. Os pontos de cada jogador aparecem QUANDO O JOGO DELE TERMINA, e o ranking
  se atualiza a cada jogo encerrado. A pontuação oficial da rodada fecha no dia seguinte ao último jogo.
- Status da rodada: Aberta → Em andamento (x de 10 jogos encerrados) → Fechada.
- Status de cada jogo: A jogar (horário) · Em andamento (sem placar, só "em andamento") · Encerrado
  (placar + "pontuado ✓").
- Pontuação por scouts numa tabela pública: gol +8, assistência +5, finalização no gol +1,2,
  finalização para fora +0,8, desarme +1,5, falta sofrida +0,5, defesa (GOL) +1,3, defesa de pênalti
  +7, jogo sem sofrer gol (GOL/DEF) +5, gol sofrido (GOL) −1, falta cometida −0,3, impedimento
  −0,1, amarelo −1, vermelho −3, pênalti perdido −4, gol contra −3.
- Não existe prêmio. A motivação é o ranking geral, as ligas entre amigos e o "vale-a-pena" de
  acertar a escalação. Não mostre R$, prêmios, saldo, apostas ou odds em lugar nenhum
  (a única exceção é o preço hipotético na tela Seja PRO).

TELAS
1. Boas-vindas e cadastro — 3 slides curtos do "como funciona", entrar com Google ou e-mail (link
   mágico), escolher apelido e time do coração (sigla). Estado: chegou por convite de liga (mostra
   "Você foi convidado para a liga Resenha do Trabalho por Marcos").
2. Início (rodada atual) — "Rodada 29 · Brasileirão", contagem para a trava ou barra de progresso
   "4 de 10 jogos encerrados", card "Meu time" (pontos da rodada, posição geral e na melhor liga, CTA
   "Escalar" ou "Ver pontos"), lista "Jogos da rodada" com os três estados de jogo, atalho para ligas.
   Estados: ainda não escalou (CTA forte), escalado com rodada aberta, rodada em andamento, rodada
   fechada.
3. Montar Time — campo com seletor de formação, 11 slots (GOL, DEF, MEI, ATA) com "+" nos vazios.
   Barra fixa: "Restam C$ 23,40 · média C$ 5,85 por vaga", botão "Escalação automática", CTA
   "Salvar time". Estados: vazio, parcial, completo, orçamento estourado (CTA desabilitado), jogador
   com status de dúvida ou lesionado no slot.
4. Mercado de Jogadores — bottom sheet: chips de posição, filtro de clube (siglas), faixa de preço,
   busca, ordenar por preço/média/mais escalados. Card: camisa, nome, sigla, posição, preço, variação
   de preço (▲▼), média, status (Provável ✓, Dúvida ?, Lesionado ✚, Suspenso). Estados: já escalado,
   fora do orçamento (esmaecido), nenhum resultado.
5. Detalhe do Jogador — bottom sheet: média, últimos 5 jogos com pontos e scouts, próximo adversário,
   % de times que escalaram, botão Escalar/Remover.
6. Time Salvo — confirmação, "Você pode alterar até sáb 16:00", bloco de convite "Jogue contra seus
   amigos" com botões Criar liga e Compartilhar no WhatsApp.
7. Meu Time na Rodada — campo com o time. Jogadores de jogos encerrados mostram os pontos no chip
   (toque abre os scouts); os de jogos não encerrados mostram "aguardando" e o horário. Topo: pontos
   parciais, posição geral e na liga, "próximo jogo que pontua: SAO × BOT, 18:30". Estados: nenhum jogo
   encerrado, alguns encerrados, rodada fechada, jogador de jogo adiado (0 pts com explicação),
   pontuação atrasada ("os pontos de FLA × PAL vão aparecer em breve").
8. Ranking — abas [Geral | Minhas ligas | Por clube do coração]. Linha: posição, apelido, pontos,
   variação de posição (▲▼); linha do usuário fixada no rodapé; paginação. Selo "atualizado após
   FLA × PAL".
9. Ligas — lista das minhas ligas (posição e pontos em cada); criar liga (nome, emoji, liga aberta ou
   por convite); tela da liga com ranking dos membros, botão "Convidar" (link + WhatsApp) e
   histórico de campeões da rodada. Estados: nenhuma liga, liga com 1 membro ("convide pelo menos 3").
10. Fim de Rodada — card/modal compartilhável: "Rodada 29 fechada · 62,4 pts · 1.203º no geral ·
    3º na Resenha do Trabalho · Craque do seu time: R. Almeida 14,2 pts", botões Compartilhar e
    "Escalar a próxima".
11. Seja PRO (teste de interesse) — tela com benefícios hipotéticos (até 3 times por rodada,
    estatísticas avançadas, sem anúncios, ligas personalizadas), preço "R$ 9,90/mês", CTA
    "Quero ser avisado". Ao tocar: "O PRO está chegando! Vamos te avisar." Nada de formulário de
    pagamento.
12. Pesquisa — bottom sheet de 3 perguntas rápidas (nota de 0 a 10 para recomendar, "o que faria
    você jogar toda rodada?" com opções, campo livre opcional). Estado de agradecimento.
13. Como Funciona — passo a passo, tabela de pontuação completa, trava, preços, jogo adiado,
    desempate.
14. Perfil — apelido, time do coração, tema claro/escuro, notificações por e-mail (liga/desliga),
    termos, privacidade, sair e excluir conta.
15. Instalar o app — banner discreto na Início e bottom sheet explicando "Adicionar à tela inicial"
    (iPhone e Android).

ENTREGÁVEIS
- Todas as telas no frame 390×844, com os estados listados; telas com rolagem também em versão
  estendida. Mostrar tema escuro em todas e tema claro em Início, Montar Time e Ranking.
- Fluxo clicável do caminho feliz: Convite → Cadastro → Montar Time → Mercado → Time Salvo →
  Meu Time (jogos encerrando) → Ranking da liga → Fim de Rodada → Compartilhar.
- Página de componentes: card de jogo (3 estados), chip de jogador no campo (preço / pontos /
  aguardando), card de jogador no mercado, barra de orçamento, badge de status da rodada, linha de
  ranking, card de liga, card de fim de rodada, bottom sheet, toast, estado vazio.
- Dados fictícios realistas; nenhum nome, foto ou escudo real.
```

---

*Criado em 28/09/2026.*
