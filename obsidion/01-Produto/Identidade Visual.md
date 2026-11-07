---
titulo: Identidade Visual
tipo: produto
projeto: Fantasy Futebol
criado-em: 2026-11-06
tags:
  - projeto/fantasy-futebol
  - area/produto
  - area/design
---

# Identidade Visual

← [[Index]] · Telas: [[Fluxo de Telas]] · Prompt original: [[Prompt de Design]]

> [!abstract] Em uma frase
> **Placar de estádio e prancheta do técnico:** fundo escuro, gramado cortado em faixas, traço de giz e números grandes em fonte condensada. Mobile primeiro e só tema escuro.

## Cores (tokens em `app/globals.css`)

| Token | Valor | Uso |
|---|---|---|
| `background` | `#050505` | fundo, sobre a foto de estádio escurecida |
| `primary` | `#C5F920` (lima) | pontos, posição, ação principal |
| `giz` | `#f3f7e8` | texto e traços de giz |
| `gramado` / `gramado-escuro` | `#0d4a32` / `#06261a` | painéis com faixas de gramado |
| `warning` | `#ffc933` | o que está ao vivo e avisos |

## Tipografia

- **Sofia Sans Extra Condensed** (800/900) para números e títulos, em caixa alta nos títulos: o "placar".
- **Sofia Sans** para o texto.
- Definidas em `app/fonts.ts` e usadas pela landing e pelo app.

## Peças que se repetem

| Peça | Onde | Código |
|---|---|---|
| Painel de gramado | topo do Início, da liga e estados vazios | `pitchPanel` em `components/ui/scoreboard.ts` |
| Número de placar | contagem para a trava, pontos, saldo, posição | `scoreboard` |
| Painel neutro | listas e resumos | `quietPanel` |
| Campo a giz | escalação, com marcações irregulares | `components/ui/pitch-lines.tsx` |
| Tabela de classificação | ranking da liga, com faixa do líder (lima) e do lanterna (vermelha) | `app/ligas/[id]/standings-table.tsx` |

## Clubes e jogadores

O app mostra os **escudos dos clubes** (da API-Football, com cópias locais em `public/escudos/`) e o nome dos jogadores. Isso muda a decisão de 28/09 de usar só camisa genérica e sigla (ver [[Origem do projeto e decisões iniciais]]); a troca não tem nota de decisão própria, e o risco de imagem e marca continua listado em [[Jurídico e Riscos]].

## Princípios

- Uma coisa em destaque por tela: o número que importa naquele momento.
- Estrutura visual com significado: faixa do líder, tique de jogo encerrado ou ao vivo, legenda quando há código de cor.
- Alvos de toque de pelo menos 44px e texto de pelo menos 11px.
- Sem linguagem de aposta, prêmio ou odds.

---

*Criado em 06/11/2026, depois do redesign de Início, Escalar e Ligas.*
