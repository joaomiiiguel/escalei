---
titulo: Ativação de Produção — Calendário e Orquestração
tipo: operacao
projeto: Fantasy Futebol
status: planejado
criado-em: 2026-10-15
tags:
  - projeto/fantasy-futebol
  - area/tecnico
  - supabase
  - api-football
  - producao
---

# Ativação de Produção — Calendário e Orquestração

← [[Index]] · Simulação atual: [[Orquestrador da Rodada Simulada]] · Fonte: [[API-Football]]

> [!important] Esta nota é para a ativação do plano pago da API-Football
> A função `advance-simulated-round` usa a temporada histórica de 2024,
> `inicio_simulado_em` e a configuração `rodada_simulada_atual`. Ela é útil no
> teste, mas **não deve ser promovida para produção sem adaptação**.

## Objetivo da operação

Na produção, o sistema mantém o calendário oficial no banco e decide o estado
de cada rodada e jogo a partir dos horários e status retornados pela
API-Football. O app continua consumindo apenas o Supabase; a chave da API nunca
vai para o navegador.

```text
API-Football ──► sincronizador de calendário ──► rodadas + jogos
                      │                                │
                      └──► orquestrador de produção ───┘
                                                       │
                              score-match ◄──────── jogos encerrados
                                                       │
                                                ranking e interface
```

## Dados que precisam existir no banco

- Uma rodada por etapa oficial, com `numero`, `temporada`, `abre_em` e
  `trava_em` em UTC.
- Cada jogo associado à rodada, com `api_football_id`, clubes, `inicio_em` e
  status. O identificador externo é a chave de idempotência da sincronização.
- Clubes já conciliados com os IDs da API-Football.
- A rodada seguinte pode ficar `AGENDADA`; não é necessário criá-la no instante
  do fechamento da rodada anterior.

Para o Brasileirão, o sincronizador deve consultar primeiro as rodadas em
`GET /fixtures/rounds?league=<liga>&season=<temporada>` e então os jogos em
`GET /fixtures?league=<liga>&season=<temporada>`, preferindo filtros por
`round`, `from`/`to` ou `date` quando a cota exigir. A cobertura da temporada
contratada deve ser verificada em `/leagues` antes da ativação.

O *upsert* deve preservar resultados e pontuações já consolidados. Uma alteração
de tabela pela fonte atualiza somente campos de calendário que ainda não foram
fechados e deixa um registro para conferência humana.

## Regras de horário do produto

Os horários são calculados e gravados em UTC, mas seguem o fuso
`America/Fortaleza` para a regra de negócio:

| Campo | Regra |
|---|---|
| `abre_em` | 00:00 do dia seguinte ao último jogo da rodada anterior. |
| `trava_em` | Uma hora antes do primeiro jogo oficial da própria rodada. |
| `fechamento_em` | Uma hora após a pontuação do último jogo, para a segunda conferência. |

O calendário pode ser corrigido pela organização do campeonato. Por isso,
`trava_em` deve sempre ser recalculada enquanto a rodada estiver `AGENDADA` ou
`ABERTA`; depois da trava, qualquer mudança deve gerar alerta operacional em
vez de alterar silenciosamente a regra aplicada aos usuários.

## Máquina de estados de produção

```text
AGENDADA ── abre_em ──► ABERTA ── trava_em ──► EM_ANDAMENTO
                                                     │
                       todos os jogos confirmados ──┘
                                                     ▼
                    pontuação + 1 h de conferência ► FECHADA
```

1. `AGENDADA → ABERTA`: o orquestrador abre a rodada quando `abre_em` for
   alcançada. A interface passa a mostrar a rodada e aceita escalação.
2. `ABERTA → EM_ANDAMENTO`: em `trava_em`, bloqueia alterações de escalação.
3. Jogos: o sincronizador converte os status oficiais para `A_JOGAR`,
   `EM_ANDAMENTO` e `ENCERRADO`. Somente `FT`, `AET` ou `PEN` confirmados pela
   API permitem encerrar um jogo e chamar `score-match`.
4. Pontuação: `score-match` coleta eventos e estatísticas, persiste os scouts e
   chama `fn_pontuar_jogo`. É seguro repetir a chamada quando `pontuado_em`
   estiver vazio.
5. Conferência: quando todos os jogos estiverem pontuados, agenda uma releitura
   para uma hora depois. A rodada só fica `FECHADA` se a segunda leitura tiver
   êxito.
6. Próxima rodada: a abertura é independente e ocorre no seu próprio
   `abre_em`. Ao fechar a anterior, a tela informa a data de abertura já
   gravada para a próxima.

Partidas adiadas ou interrompidas não são tratadas como finalizadas. A rodada
permanece em andamento até que haja decisão de produto documentada para aquele
caso; o orquestrador não deve inventar resultado ou pontuação.

## Jobs e uso da cota

Frequências abaixo são uma proposta inicial e devem ser ajustadas à cota do
plano efetivamente contratado e à cobertura confirmada da competição.

| Job | Janela | Responsabilidade |
|---|---|---|
| Sincronização de calendário | A cada 6–12 h e após anúncio de mudança | Cria ou atualiza rodadas e jogos futuros. |
| Sincronização de jogos | A cada 1–5 min apenas enquanto há partidas relevantes | Atualiza status e resultados oficiais. |
| Orquestrador de produção | A cada 2 min | Aplica aberturas, travas, pendências de pontuação e conferências. |
| Reprocessamento final | Após cada confirmação de término e na conferência | Busca scouts e recalcula somente o jogo afetado. |

Fora de janelas de jogos, não deve haver consulta frequente de placares. Cada
execução precisa registrar início, término, fonte, quantidade de jogos e erro
em `sync_execucoes`, para permitir auditoria e controle da cota.

## Idempotência, falhas e recuperação

- Um novo disparo nunca duplica rodada, jogo, scout ou pontos; utiliza IDs da
  API e campos de processamento já persistidos.
- Erro temporário da API mantém o estado anterior e agenda nova tentativa com
  atraso. Não fecha rodada por ausência de resposta.
- Erro em `score-match` deixa o jogo `ENCERRADO` e não pontuado, permitindo
  reexecução segura.
- A função usa `SUPABASE_SERVICE_ROLE_KEY` somente no ambiente confiável. A
  chave `API_FOOTBALL_KEY` fica em segredo de Edge Function/Vault, nunca em
  `.env` versionado nem no cliente.
- Alertar a operação quando houver falhas repetidas, jogo encerrado sem scouts,
  alteração de horário depois da trava ou rodada que exceder sua janela normal.

## Checklist de ativação

1. Confirmar no painel/API a cobertura do Brasileirão e da temporada atual para
   fixtures, eventos, estatísticas de jogadores e elencos.
2. Configurar os segredos de produção (`API_FOOTBALL_KEY`, identificador da liga
   e temporada) no Supabase, sem registrá-los neste repositório.
3. Executar uma sincronização completa em ambiente de desenvolvimento com
   respostas reais salvas como fixtures de teste.
4. Criar e validar o sincronizador de calendário oficial e o orquestrador de
   produção separados do fluxo simulado.
5. Desativar o cron de simulação e qualquer job legado que possa sobrescrever
   status ou horários de produção; manter um único responsável por cada campo.
6. Validar manualmente uma rodada inteira: abertura, trava, jogo ao vivo,
   encerramento, pontuação, uma hora de conferência, fechamento e abertura da
   rodada seguinte.
7. Verificar RLS, registros em `sync_execucoes`, alertas e um procedimento de
   pausa/retomada do cron antes de liberar usuários reais.

## Referências externas

- [API-Football — rodadas e fixtures](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide)
- [API-Football — cobertura e uso de cota](https://www.api-football.com/news/post/how-to-optimize-api-sports-calls-and-quota-usage)
