-- Does not install extensions or call external providers.
do $migration$begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
 perform cron.schedule('patri-supplier','0 * * * *',$command$select set_config('request.jwt.claims','{"role":"service_role"}',true);select public.preparar_lembretes_fornecedor();$command$);
 end if;end$migration$;
