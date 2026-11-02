-- Avisos da rodada no tom de zoeira entre amigos. A primeira frase, até o "!", vira o título do push.
create or replace function public.fn_texto_aviso_whatsapp(p_tipo text, p_numero smallint, p_trava_em timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case p_tipo
    when 'MERCADO_ABERTO' then format(
      E'🟢 Acorda, cabeça de bagre! O mercado da rodada %s abriu.\nEscala até %s às %s, ou vai culpar o juiz de novo?',
      p_numero,
      to_char(p_trava_em at time zone 'America/Sao_Paulo', 'DD/MM'),
      to_char(p_trava_em at time zone 'America/Sao_Paulo', 'HH24"h"MI')
    )
    when 'FALTA_1H' then format(
      E'⏰ Falta 1 hora, craque de várzea! O mercado da rodada %s fecha às %s.\nDepois não adianta chorar no grupo.',
      p_numero,
      to_char(p_trava_em at time zone 'America/Sao_Paulo', 'HH24"h"MI')
    )
    when 'MERCADO_FECHADO' then format(
      E'🔒 Já era, parceiro! As escalações da rodada %s travaram.\nSe deixou aquele perna de pau no time, agora é rezar.',
      p_numero
    )
    when 'RODADA_ENCERRADA' then format(
      E'🏁 Acabou a rodada %s, professor! Os pontos saíram e o ranking não perdoa.\nVai lá ver quem passou vergonha no grupo.',
      p_numero
    )
  end
$$;
