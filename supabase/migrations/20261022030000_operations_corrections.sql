create table public.rotina_falhas(id uuid primary key default gen_random_uuid(),rotina text not null check(length(rotina)<=80),codigo text not null check(length(codigo)<=80),criado_em timestamptz not null default now());
alter table public.rotina_falhas enable row level security;
create policy failures_admin on public.rotina_falhas for select to authenticated using(private.has_role(auth.uid(),'admin'));
grant select on public.rotina_falhas to authenticated;
create function private.log_job_failure(job_name text,error_code text) returns void language plpgsql security definer set search_path='' as $$begin perform private.service_guard();insert into public.rotina_falhas(rotina,codigo) values(left(job_name,80),left(error_code,80));end;$$;
create function public.registrar_falha_rotina(job_name text,error_code text) returns void language sql set search_path='' as $$select private.log_job_failure(job_name,error_code)$$;
revoke all on function private.log_job_failure(text,text),public.registrar_falha_rotina(text,text) from public;grant execute on function private.log_job_failure(text,text),public.registrar_falha_rotina(text,text) to service_role;
create function private.job_status() returns jsonb language plpgsql stable security definer set search_path='' as $$begin perform private.admin_guard();return jsonb_build_object('falhas_24h',(select count(*) from public.rotina_falhas where criado_em>now()-interval '24 hours'),'ultimas',coalesce((select jsonb_agg(x) from(select rotina,codigo,criado_em from public.rotina_falhas order by criado_em desc limit 20)x),'[]'));end;$$;
create function public.status_rotinas() returns jsonb language sql stable set search_path='' as $$select private.job_status()$$;
revoke all on function private.job_status(),public.status_rotinas() from public;grant execute on function private.job_status(),public.status_rotinas() to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('revistas','revistas',true,20971520,array['application/pdf']),('importacoes','importacoes',false,5242880,array['text/csv']) on conflict(id) do nothing;
create policy magazines_staff_insert on storage.objects for insert to authenticated with check(bucket_id='revistas' and (private.has_role(auth.uid(),'admin') or private.has_role(auth.uid(),'editor')));
create policy imports_admin_insert on storage.objects for insert to authenticated with check(bucket_id='importacoes' and private.has_role(auth.uid(),'admin'));
create policy imports_admin_read on storage.objects for select to authenticated using(bucket_id='importacoes' and private.has_role(auth.uid(),'admin'));

