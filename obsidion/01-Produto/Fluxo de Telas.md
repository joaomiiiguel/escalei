---
titulo: Fluxo de Telas
tipo: produto
projeto: Fantasy Futebol
criado-em: 2026-09-28
atualizado-em: 2026-11-06
tags:
  - projeto/fantasy-futebol
  - area/produto
  - area/design
---

# Fluxo de Telas

← [[Index]] · Visual: [[Identidade Visual]] · Prompt original: [[Prompt de Design]] · Dados de cada tela: [[Banco de Dados — Modelo e Campos]]

> [!info] Conferido contra o código em 06/11/2026
> As 15 telas de 28/09 eram o plano do MVP. A tabela abaixo mostra o que existe hoje; o que ficou de fora está em "Planejado e não construído".

## Navegação

```
/ (landing pública + lista de espera)
/convite/[token] ou /convite ─► /entrar (Google) ─► /onboarding ─► /inicio

Navbar fixa: Início · Meu time · Ligas · Perfil   (+ botão "Como funciona" flutuante)

/inicio ──► /escalar ──► mercado (bottom sheet)
        └─► jogos da rodada e resumo de fim de rodada (na própria tela)
/ligas ──► /ligas/[id] (ranking da rodada · ranking do campeonato)
/perfil ──► editar apelido e time do coração, notificação da rodada, termos, excluir conta
/admin ──► grupos, convites (lista de espera), participantes
```

## Telas e dados

| Rota | Tela | Lê do banco | Evento |
|---|---|---|---|
| `/` | Landing pública com lista de espera | — (grava `lista_espera`) | — |
| `/convite/[token]`, `/convite` | Prévia do convite e código | `ligas` | `convite_aceito` |
| `/entrar` | Login com Google | — | — |
| `/onboarding` | Apelido, clube do coração, termos | `clubes` | `cadastro` |
| `/inicio` | Placar da rodada, jogos da rodada, resumo da rodada fechada | `rodadas`, `jogos`, `clubes`, `times`, `estatisticas_jogador`, `ranking_rodada` | `inicio_visto`, `pontos_vistos`, `fim_rodada_compartilhado` |
| `/escalar` | Montar time, time salvo e time na rodada | `jogadores`, `carteiras`, `times`, `estatisticas_jogador`, passes | `time_escalado` |
| mercado | Bottom sheet com busca e filtros | `/api/jogadores` | — |
| `/ligas`, `/ligas/[id]` | Minhas ligas e tabela de classificação | `ligas`, `ligas_membros`, `times`, `fn_ranking_campeonato` | `ranking_visto` |
| `/perfil` | Preferências, termos e exclusão de conta | `perfis`, `push_inscricoes` | — |
| `/como-funciona` | Regras e tabela de pontuação | `tabela_pontuacao` | — |
| `/termos`, `/privacidade`, `/regulamento` | Documentos legais | — | — |
| `/admin/*` | Grupos, convites, participantes | tudo pelo servidor | — |
| transversal | Instalar o app, convite para notificações | — | `pwa_instalado` |

## Estados

- Carregando (skeleton) em `/inicio`, `/escalar` e na raiz.
- Vazio: sem rodada, sem escalação e sem liga, sempre com o próximo passo.
- Erro de rede: "Rodada indisponível" com "Tentar de novo".
- Escalação tardia: aviso na tela de escalar enquanto a janela estiver aberta.

## Planejado e não construído

| Tela do plano | Situação |
|---|---|
| Detalhe do Jogador (últimos 5 jogos, scouts) | Não existe; o mercado mostra só preço, status e titular/reserva |
| Ranking geral e por clube do coração | Não existe; há só o ranking dentro de cada grupo |
| Criar liga pelo usuário | Não existe; grupos são criados no admin |
| Fim de Rodada como tela própria | Virou uma seção do Início com "Compartilhar resumo" |
| Seja PRO (fake door) | Não existe |
| Pesquisa (bottom sheet) | Não existe |
| Pontuação atrasada ("Os pontos de FLA × PAL vão aparecer em breve") | Não existe um estado dedicado |

---

*Criado em 28/09/2026. Atualizado em 06/11/2026 a partir do código.*
