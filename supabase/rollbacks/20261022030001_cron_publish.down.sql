do $$begin if exists(select 1 from pg_extension where extname='pg_cron') then perform cron.unschedule(jobid) from cron.job where jobname='patri-publish';end if;end$$;
