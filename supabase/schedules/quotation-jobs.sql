-- Apply on the hosted Supabase project after enabling pg_cron, pg_net and Vault.
-- Store supplier_jobs_url (full Edge URL) and supplier_jobs_secret in Vault first.
-- This is deliberately separate from migrations: no unconfigured external calls.
select cron.schedule('patri-quotation-notifications','* * * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='supplier_jobs_url'),
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='supplier_jobs_secret')),
  body:='{}'::jsonb,timeout_milliseconds:=30000
 );
$job$);
-- Worker runs every minute for notifications. prepare_lead_reminders is idempotent
-- and therefore can check the 48h cutoff more often than once an hour safely.
