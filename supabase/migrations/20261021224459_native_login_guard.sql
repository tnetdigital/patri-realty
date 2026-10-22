-- Native Auth hook guards direct password API calls as well as the portal gateway.
create table private.login_falhas(id uuid primary key default gen_random_uuid(),user_id uuid not null,criado_em timestamptz not null default now());
alter table private.login_falhas enable row level security;
create index on private.login_falhas(user_id,criado_em);
create function private.verificar_login(event jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$declare u uuid;begin
 if current_user not in('postgres','supabase_auth_admin') then raise exception 'Acesso negado';end if;
 u:=(event->>'user_id')::uuid;
 if u is null then raise exception 'Evento inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,12));
 delete from private.login_falhas where criado_em<now()-interval '15 minutes';
 if (select count(*) from private.login_falhas where user_id=u)>=5 then
  return jsonb_build_object('decision','reject','message','E-mail ou senha incorretos. Aguarde 15 minutos para tentar novamente.','should_logout_user',false);
 end if;
 if (event->>'valid')::boolean is true then
  delete from private.login_falhas where user_id=u;
 else insert into private.login_falhas(user_id) values(u);end if;
 return jsonb_build_object('decision','continue');
end $$;
create function public.verificar_login(event jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.verificar_login(event)$$;
revoke all on function private.verificar_login(jsonb),public.verificar_login(jsonb) from public,anon,authenticated,service_role;
-- Managed Supabase supplies this role; the isolated local stack uses postgres.
do $$begin
 if exists(select 1 from pg_roles where rolname='supabase_auth_admin') then
  execute 'grant usage on schema public,private to supabase_auth_admin';
  execute 'grant execute on function private.verificar_login(jsonb),public.verificar_login(jsonb) to supabase_auth_admin';
  execute 'grant select,insert,delete on private.login_falhas to supabase_auth_admin';
  execute 'create policy login_auth_only on private.login_falhas for all to supabase_auth_admin using(true) with check(true)';
 end if;
end $$;
