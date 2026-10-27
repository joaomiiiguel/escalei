-- Pausa a simulação da temporada 2024 para iniciar a migração ao Brasileirão
-- 2026 real (JOA-147). Os jobs ficam inativos, não removidos: para retomar,
-- use cron.alter_job(jobid, active := true).
--   sincronizar-rodada-horaria → Edge Function sync-round (de hora em hora)
--   avancar-rodada-simulada    → Edge Function advance-simulated-round (a cada 2 min)
select cron.alter_job(job.jobid, active := false)
from cron.job job
where job.jobname in ('sincronizar-rodada-horaria', 'avancar-rodada-simulada');
