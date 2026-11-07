---
titulo: Onboarding por Convite
tipo: planejamento
projeto: Fantasy Futebol
criado-em: 2026-09-29
atualizado-em: 2026-11-06
tags:
  - projeto/fantasy-futebol
  - area/produto
  - area/design
---

# Onboarding por Convite

← [[Index]] · Fluxo: [[Fluxo de Telas]] · Dados: [[Banco de Dados — Modelo e Campos]] · Métricas: [[Plano de Validação]] · Entrada pública: [[Landing e Lista de Espera]]

> [!info] Conferido contra o código em 06/11/2026
> O plano de 29/09 previa login por telefone e OTP por SMS e um link `/convite/[codigo]`. O que foi construído usa **login com Google** e uma **lista de e-mails autorizados por grupo**. O plano original está resumido no fim da nota.

## Decisão

O beta continua fechado: só entra quem tem um convite válido **e** foi autorizado pelo gestor do grupo. Não há cadastro aberto nem criação de grupo pelo usuário; grupos são criados e geridos no painel admin. A pessoa entra sabendo para qual grupo vai jogar.

O convite não é autenticação. A identidade vem do login com Google; o e-mail da conta precisa estar autorizado no grupo (`ligas_convites_email`).

## Como alguém chega ao grupo

```text
Landing pública (/) → lista de espera (nome, WhatsApp, e-mail)
  → admin aceita a inscrição num grupo (/admin/convites)
     → o e-mail entra em ligas_convites_email
  → admin manda o link do grupo pelo WhatsApp
Link /convite/[token]  (ou código de 8 caracteres em /convite)
  → prévia do grupo: nome e temporada
  → Entrar com Google (/entrar?convite=…)
  → e-mail autorizado? senão: /entrar?erro=convite_email
  → onboarding: apelido, clube do coração opcional, aceite dos termos
  → entra no grupo e ganha 2 passes de cortesia
  → /inicio
```

O admin também pode autorizar um e-mail direto no grupo ou adicionar um perfil que já existe (`/admin/grupos/[id]`).

## Regras de produto (implementadas)

- Link inválido, expirado ou de grupo arquivado: "Este link não é válido", sem campos de login.
- Logado sem grupo e sem convite: volta para `/entrar?erro=sem_liga`. Grupo inativado: `/entrar?erro=grupo_inativado`.
- Logado com e-mail fora da lista do grupo: `/entrar?erro=convite_email`.
- Apelido, termos e clube são validados no servidor (`app/onboarding/actions.ts`).
- Quem já é membro e abre o convite vai direto para o app, sem duplicar o vínculo.
- O link público usa `token_convite` (UUID); o código curto (`codigo_convite`, 8 caracteres sem 0/O e 1/I) é a alternativa digitável em `/convite`.
- Eventos: `cadastro` (com origem de convite) e `convite_aceito`.

## Ainda não existe

- Compartilhar o convite de dentro do app (`convite_enviado`): hoje quem convida é o gestor, pelo admin.
- Registro de `convidado_por` a partir do link de um amigo.
- Prazo de expiração preenchido nos grupos (`convite_expira_em` existe, mas é opcional).

## Plano original (29/09/2026, não seguido)

Login por telefone e OTP por SMS, link `/convite/[codigo]` com "Marcos convidou você", RPC `fn_entrar_liga(codigo)` e task ONB-01. Trocado por Google e e-mails autorizados.

---

*Planejado em 29/09/2026. Reescrito em 06/11/2026 a partir do código.*
