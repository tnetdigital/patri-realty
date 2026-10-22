create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$declare m jsonb:=new.raw_user_meta_data;kind public.app_role;begin
if coalesce(m->>'tipo','') not in ('sindico','fornecedor') or coalesce(m->>'termos','false')<>'true' or coalesce(m->>'termos_versao','')='' or coalesce(m->>'privacidade_versao','')='' then raise exception 'Cadastro inválido: tipo e consentimentos obrigatórios';end if;
kind:=(m->>'tipo')::public.app_role;
if kind='sindico' and not exists(select 1 from public.cidades where uf=m->>'estado' and nome=m->>'cidade') then raise exception 'Cidade inválida';end if;
if kind='fornecedor' and (coalesce(m->>'empresa','')='' or length(regexp_replace(coalesce(m->>'telefone',''),'\D','','g')) not between 10 and 11) then raise exception 'Empresa e telefone obrigatórios';end if;
insert into public.profiles(id,nome,telefone,cidade,estado) values(new.id,m->>'nome',m->>'telefone',m->>'cidade',m->>'estado');
insert into public.user_roles(user_id,role) values(new.id,kind);
insert into public.consentimentos(user_id,documento,versao,origem) values(new.id,'termos',m->>'termos_versao','cadastro'),(new.id,'privacidade',m->>'privacidade_versao','cadastro');
if coalesce(m->>'newsletter','false')='true' then insert into public.consentimentos(user_id,documento,versao,origem) values(new.id,'newsletter',m->>'privacidade_versao','cadastro');end if;
if kind='fornecedor' then insert into public.fornecedores(dono_id,nome_fantasia,cnpj) values(new.id,m->>'empresa',regexp_replace(m->>'cnpj','\D','','g'));end if;return new;end$$;
