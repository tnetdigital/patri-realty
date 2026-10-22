-- Destructive schema reversal: disposable databases or reviewed restore procedure only.
-- Reverse newer migrations first. Backup required for business data.
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='verificar_login' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='verificar_login' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
drop table if exists private.login_falhas cascade;
