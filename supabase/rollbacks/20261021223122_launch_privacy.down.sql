-- Destructive schema reversal: disposable databases or reviewed restore procedure only.
-- Reverse newer migrations first. Backup required for business data.
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='exportar_conta' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='exportar_minha_conta' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='anonimizar_conta' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='anonimizar_conta' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='concluir_exclusao_auth' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='exclusoes_auth_pendentes' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='retencao_privacidade' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='validar_sessao_conta' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='limitar_conta' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
drop table if exists private.conta_tentativas cascade;
drop table if exists private.contas_exclusoes cascade;
