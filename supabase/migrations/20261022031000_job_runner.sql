create function private.run_job(job_name text) returns boolean language plpgsql security definer set search_path='' as $$begin
 perform private.service_guard();
 if job_name not in ('publicar_agendadas','preparar_alertas_orcamento','processar_ciclo_planos','alertas_comerciais','rotinas_crescimento','retencao_privacidade','preparar_lembretes_fornecedor') then raise exception 'Rotina inválida';end if;
 begin execute format('select public.%I()',job_name);exception when others then insert into public.rotina_falhas(rotina,codigo) values(job_name,sqlstate);return false;end;return true;end;$$;
create function public.executar_rotina(job_name text) returns boolean language sql set search_path='' as $$select private.run_job(job_name)$$;
revoke all on function private.run_job(text),public.executar_rotina(text) from public;grant execute on function private.run_job(text),public.executar_rotina(text) to service_role;
