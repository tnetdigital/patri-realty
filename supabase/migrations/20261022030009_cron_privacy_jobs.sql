do $migration$begin
 if exists(select 1 from pg_extension where extname='pg_cron') and to_regclass('vault.decrypted_secrets') is not null and exists(select 1 from pg_extension where extname='pg_net') then
 if exists(select 1 from vault.decrypted_secrets where name='privacy-jobs_url') and exists(select 1 from vault.decrypted_secrets where name='supplier_jobs_secret') then
 perform cron.schedule('patri-privacy-jobs','* * * * *',$command$select net.http_post(url:=(select decrypted_secret from vault.decrypted_secrets where name='privacy-jobs_url'),headers:=jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='supplier_jobs_secret')),body:='{}'::jsonb);$command$);
 end if;end if;end$migration$;
