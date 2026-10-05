-- Run AFTER migrations in the Supabase SQL editor as postgres.
-- Do not run in PGlite: its test runtime has no scheduler.
create extension if not exists pg_cron;
select cron.schedule('beautyhub-maintenance','* * * * *','select private.maintenance();');
-- Prevent scheduler logs from consuming the Free database indefinitely.
select cron.schedule('beautyhub-cron-log-retention','17 3 * * *',
 $$delete from cron.job_run_details where end_time < now() - interval '7 days' and jobid in (select jobid from cron.job where jobname like 'beautyhub-%')$$);
