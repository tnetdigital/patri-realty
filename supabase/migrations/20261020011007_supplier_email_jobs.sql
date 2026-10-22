create function public.reservar_emails_fornecedor() returns setof public.email_outbox language plpgsql security definer set search_path='' as $$begin
 -- Lease expires after ten minutes. Resend idempotency keys protect retried deliveries.
 update public.email_outbox set status='pendente' where status='processando' and atualizado_em<now()-interval '10 minutes' and tentativas<5;
 return query with candidates as (select id from public.email_outbox where status='pendente' and tentativas<5 order by criado_em limit 20 for update skip locked)
 update public.email_outbox e set status='processando',tentativas=tentativas+1 from candidates c where e.id=c.id returning e.*;
end$$;
revoke all on function public.reservar_emails_fornecedor() from public;
grant execute on function public.reservar_emails_fornecedor() to service_role;
-- Configured cron prepares reminders; delivery is scheduled externally with a protected Edge Function.
do $$begin if exists(select 1 from pg_extension where extname='pg_cron') then
 perform cron.schedule('supplier-profile-reminders','0 8 * * *','select public.preparar_lembretes_fornecedor()');
 end if;end$$;
