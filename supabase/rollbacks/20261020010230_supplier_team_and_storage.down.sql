create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$declare m jsonb:=new.raw_user_meta_data;kind public.app_role;begin
if coalesce(m->>'tipo','') not in ('sindico','fornecedor') or coalesce(m->>'termos','false')<>'true' or coalesce(m->>'termos_versao','')='' or coalesce(m->>'privacidade_versao','')='' then raise exception 'Cadastro inválido: tipo e consentimentos obrigatórios';end if;
kind:=(m->>'tipo')::public.app_role;
if kind='sindico' and not exists(select 1 from public.cidades where uf=m->>'estado' and nome=m->>'cidade') then raise exception 'Cidade inválida';end if;
if kind='fornecedor' and (coalesce(m->>'empresa','')='' or length(regexp_replace(coalesce(m->>'telefone',''),'\D','','g')) not between 10 and 11) then raise exception 'Empresa e telefone obrigatórios';end if;
if coalesce(m->>'cargo','') not in ('','sindico','morador','administrador') or length(coalesce(m->>'condominio_nome',''))>160 then raise exception 'Cargo ou condomínio inválido';end if;
insert into public.profiles(id,nome,telefone,cidade,estado,condominio_nome,cargo) values(new.id,m->>'nome',m->>'telefone',m->>'cidade',m->>'estado',nullif(m->>'condominio_nome',''),nullif(m->>'cargo',''));
insert into public.user_roles(user_id,role) values(new.id,kind);
insert into public.consentimentos(user_id,documento,versao,origem) values(new.id,'termos',m->>'termos_versao','cadastro'),(new.id,'privacidade',m->>'privacidade_versao','cadastro');
if coalesce(m->>'newsletter','false')='true' then insert into public.consentimentos(user_id,documento,versao,origem) values(new.id,'newsletter',m->>'privacidade_versao','cadastro');end if;
if kind='fornecedor' then insert into public.fornecedores(dono_id,nome_fantasia,cnpj) values(new.id,m->>'empresa',regexp_replace(m->>'cnpj','\D','','g'));end if;return new;end$$;

DO $$declare item record;begin for item in select n.nspname,p.oid::regprocedure::text signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname=any(array['team_supplier','invite_member','inspect_invite','accept_invite','revoke_member','claim_supplier','equipe_fornecedor','convidar_membro','inspecionar_convite','aceitar_convite','revogar_membro','reivindicar_fornecedor','preparar_lembretes_fornecedor']) loop execute 'drop function if exists '||item.signature||' cascade';end loop;end$$;
DO $$begin if to_regclass('storage.objects') is not null then drop policy if exists supplier_media_read on storage.objects;drop policy if exists supplier_media_insert on storage.objects;end if;end$$;
