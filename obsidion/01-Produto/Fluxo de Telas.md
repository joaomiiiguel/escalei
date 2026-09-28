---
titulo: Fluxo de Telas
tipo: produto
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/produto
  - area/design
---

# Fluxo de Telas

← [[Index]] · Prompt: [[Prompt de Design]] · Dados de cada tela: [[Banco de Dados — Modelo e Campos]]

## Navegação

```
Link de convite ─► [1] Boas-vindas/Cadastro ─► [2] Início
                                                 │
Navbar: Início · Meu Time · Ligas · Perfil       │
                                                 ├─► [3] Montar Time ◄──► [4] Mercado ─► [5] Jogador
                                                 │         └─► [6] Time Salvo ─► convite de liga
                                                 ├─► [7] Meu Time na Rodada ─► [5] Jogador (scouts)
                                                 ├─► [8] Ranking (Geral · Minhas ligas · Por clube)
                                                 ├─► [9] Ligas ─► criar · convidar · ranking da liga
                                                 ├─► [10] Fim de Rodada (compartilhável)
                                                 ├─► [11] Seja PRO (teste de interesse)
                                                 └─► [13] Como Funciona
Perfil ─► [14] tema, e-mails, termos, excluir conta
Transversais: [12] Pesquisa (bottom sheet) · [15] Instalar o app
```

## Telas e dados

| # | Tela | Lê do banco | Evento de métrica |
|---|---|---|---|
| 1 | Boas-vindas e cadastro | `ligas` (se veio por convite), `clubes` | `cadastro` |
| 2 | Início | `rodadas`, `jogos`, `times`, `ranking_rodada` | `inicio_visto` |
| 3 | Montar Time | `jogadores`, `configuracoes.orcamento` | `time_escalado` (+ segundos gastos) |
| 4 | Mercado | `jogadores`, `historico_precos` | — |
| 5 | Detalhe do Jogador | `estatisticas_jogador` (últimos 5), `jogos` | — |
| 6 | Time Salvo | `times` | `convite_enviado` |
| 7 | Meu Time na Rodada | `times_jogadores`, `jogos` | `pontos_vistos` (+ se foi ≤ 24 h após um jogo encerrado) |
| 8 | Ranking | `ranking_rodada`, views de liga e de clube | `ranking_visto` |
| 9 | Ligas | `ligas`, `ligas_membros` | `liga_criada`, `convite_aceito` |
| 10 | Fim de Rodada | `ranking_rodada`, `times_jogadores` | `fim_rodada_compartilhado` |
| 11 | Seja PRO | — | `clique_pro` → `interesse_pro` |
| 12 | Pesquisa | — | `pesquisa_respondida` → `pesquisas_respostas` |
| 13 | Como Funciona | `tabela_pontuacao` | — |
| 14 | Perfil | `perfis` | `conta_excluida` |
| 15 | Instalar o app | — | `pwa_instalado` |

## Estados que toda tela precisa ter

- Carregando (skeleton)
- Vazio (com ilustração e próximo passo)
- Erro de rede (tentar de novo)
- **Pontuação atrasada** (API fora): "Os pontos de FLA × PAL vão aparecer em breve"

---

*Criado em 28/09/2026.*
