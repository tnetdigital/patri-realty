drop policy magazines_staff_insert on storage.objects;drop policy imports_admin_insert on storage.objects;drop policy imports_admin_read on storage.objects;
-- Bucket metadata is intentionally retained when objects exist; never remove stored files.
delete from storage.buckets where id in ('revistas','importacoes') and not exists(select 1 from storage.objects where bucket_id=storage.buckets.id);
drop function public.status_rotinas();drop function private.job_status();drop function public.registrar_falha_rotina(text,text);drop function private.log_job_failure(text,text);drop table public.rotina_falhas;
