---
titulo: Landing e Lista de Espera
tipo: produto
projeto: Fantasy Futebol
criado-em: 2026-11-06
tags:
  - projeto/fantasy-futebol
  - area/produto
  - area/marketing
---

# Landing e Lista de Espera

← [[Index]] · Entrada no grupo: [[Onboarding por Convite]] · Divulgação: [[Primeiros 9 posts]]

> [!info] Fonte
> Descrição do que está no código em 06/11/2026 (`app/(landing)/`, `app/_landing/`, `app/actions.ts`, `app/admin/convites/`). A decisão de abrir a landing não tem nota própria; o motivo não foi registrado.

## O que é

A raiz do domínio (`/`) é uma landing pública para quem ainda não tem conta. Quem já está logado é redirecionado para `/inicio`. É o destino do "link na bio" das peças de divulgação.

## Conteúdo

- Título "Mostre que você entende de futebol." e o selo "Grátis na fase de testes · Sem apostas".
- Formulário da lista de espera logo no topo.
- Seções: como funciona, demonstração interativa do mercado (dados fictícios, só ilustrativos), grupos, saldo em C$, preço, perguntas frequentes e chamada final.
- Preço explicado: grátis durante os testes; depois R$ 4,99 por rodada ou R$ 19,99 o pacote com 5, com 2 passes de presente. Ver [[2026-10-27 — Passes de rodada pagos]].

## Lista de espera

| Campo | Regra |
|---|---|
| Nome | 2–60 caracteres |
| WhatsApp | DDD + número, 10 ou 11 dígitos |
| E-mail | único |
| Consentimento | obrigatório; data guardada em `consentimento_em` |
| Origem | `beta` por padrão |

Gravada pelo servidor em `lista_espera`. No admin (`/admin/convites`), a inscrição pode ser **aceita num grupo**, o que autoriza o e-mail em `ligas_convites_email`, ou **excluída**, o que revoga a autorização ainda não usada. Depois do aceite, o gestor manda o link do grupo pelo WhatsApp.

## Identidade

Usa a mesma linguagem do app: Sofia Sans Extra Condensed, traço de giz e gramado listrado. Ver [[Identidade Visual]].

---

*Criado em 06/11/2026 a partir do código.*
