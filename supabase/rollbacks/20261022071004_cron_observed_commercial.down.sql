-- Does not install extensions or call external providers.
do $migration$begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
 perform cron.schedule('patri-commercial','0 8 * * *',$command$select set_config('request.jwt.claims','{"role":"service_role"}',true);select public.alertas_comerciais();$command$);
 end if;end$migration$;
