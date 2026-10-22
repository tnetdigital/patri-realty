-- Minimal Auth identity for isolated PostgreSQL policy tests.
-- The full GoTrue integration is exercised separately by auth-live.spec.ts.
create schema auth;
create schema extensions;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,email_confirmed_at timestamptz,encrypted_password text default '');
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now(),updated_at timestamptz default now());
create table auth.refresh_tokens(id bigint generated always as identity primary key,user_id varchar,token text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;

-- Storage schema contract for policy tests only; this is not the Storage HTTP service.
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert,update on storage.objects to authenticated;

create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
grant execute on function auth.jwt() to anon,authenticated,service_role;
