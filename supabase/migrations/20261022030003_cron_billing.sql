-- Does not install extensions or call external providers.
do $migration$begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
 perform cron.schedule('patri-billing','15 * * * *',$command$select set_config('request.jwt.claims','{"role":"service_role"}',true);select public.processar_ciclo_planos();$command$);
 end if;end$migration$;
