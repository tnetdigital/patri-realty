-- DESTRUCTIVE development rollback. Never run against production data.
begin;
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.fornecedores, public.user_roles, public.consentimentos, public.audit_log, public.configuracoes, public.segmentos, public.cidades, public.estados, public.profiles cascade;
drop function if exists public.has_role(uuid, public.app_role);
drop schema if exists private cascade;
drop type if exists public.app_role;
commit;
