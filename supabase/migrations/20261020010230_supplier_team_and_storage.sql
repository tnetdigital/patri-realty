create function private.team_supplier(sid uuid) returns jsonb language sql stable security definer set search_path='' as $$select case when private.can_edit_supplier(sid) then jsonb_build_object(
'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'user_id',m.user_id,'nome',p.nome,'email',u.email,'status',case when m.ativo then 'ativo' else 'revogado' end)) from public.fornecedor_membros m join public.profiles p on p.id=m.user_id join auth.users u on u.id=m.user_id where m.fornecedor_id=sid),'[]'),
'invites',case when private.owns_supplier(sid) then coalesce((select jsonb_agg(jsonb_build_object('id',id,'nome','','email',email,'status',case when revogado_em is not null then 'revogado' when expira_em<=now() then 'expirado' else 'pendente' end,'expira_em',expira_em)) from public.convites where fornecedor_id=sid and usado_em is null),'[]') else '[]'::jsonb end) else null end$$;
create function private.invite_member(sid uuid,address text) returns jsonb language plpgsql security definer set search_path='' as $$declare raw text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');invite_id uuid;company text;slots int;begin
 if not private.owns_supplier(sid) then raise exception 'Somente o dono pode convidar';end if;
 perform 1 from public.fornecedores where id=sid for update;
 address:=lower(trim(address));if address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(address)>254 then raise exception 'E-mail inválido';end if;
 if exists(select 1 from auth.users u join public.fornecedores f on f.dono_id=u.id where f.id=sid and lower(u.email)=address) then raise exception 'O dono já faz parte da empresa';end if;
 if exists(select 1 from public.fornecedor_membros m join auth.users u on u.id=m.user_id where m.fornecedor_id=sid and m.ativo and lower(u.email)=address) then raise exception 'Este membro já faz parte da equipe';end if;
 if exists(select 1 from public.convites where fornecedor_id=sid and email=address and usado_em is null and revogado_em is null and expira_em>now()) then raise exception 'Já existe convite pendente para este e-mail';end if;
 select (select count(*) from public.fornecedor_membros where fornecedor_id=sid and ativo)+(select count(*) from public.convites where fornecedor_id=sid and usado_em is null and revogado_em is null and expira_em>now()) into slots;
 if slots>=(private.limits_supplier()->>'membros')::integer then raise exception 'Limite de membros atingido';end if;
 insert into public.convites(token_hash,email,fornecedor_id,autor_id,expira_em) values(encode(sha256(convert_to(raw,'UTF8')),'hex'),address,sid,auth.uid(),now()+interval '14 days') returning id into invite_id;
 select nome_fantasia into company from public.fornecedores where id=sid;
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(sid,address,'convite_equipe','convite:'||invite_id,jsonb_build_object('empresa',company,'token',raw));
 insert into public.audit_log(ator_id,acao,tabela,registro_id,depois) values(auth.uid(),'CONVIDAR','convites',invite_id,jsonb_build_object('email',address,'fornecedor_id',sid));
 return jsonb_build_object('id',invite_id,'email',address,'expira_em',now()+interval '14 days');end$$;
create function private.inspect_invite(raw text) returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('empresa',f.nome_fantasia,'email',c.email,'expira_em',c.expira_em) from public.convites c join public.fornecedores f on f.id=c.fornecedor_id join public.profiles p on p.id=f.dono_id where length(raw)=64 and c.token_hash=encode(sha256(convert_to(raw,'UTF8')),'hex') and c.usado_em is null and c.revogado_em is null and c.expira_em>now() and p.ativo$$;
create function private.accept_invite(raw text) returns void language plpgsql security definer set search_path='' as $$declare c public.convites;address text;begin
 if not private.is_active() then raise exception 'Entre com uma conta ativa';end if;
 select * into c from public.convites where length(raw)=64 and token_hash=encode(sha256(convert_to(raw,'UTF8')),'hex') for update;
 if c.id is null or c.usado_em is not null or c.revogado_em is not null or c.expira_em<=now() then raise exception 'Convite inválido ou expirado';end if;
 select lower(email) into address from auth.users where id=auth.uid();if address<>c.email then raise exception 'Entre com o mesmo e-mail do convite';end if;
 perform 1 from public.fornecedores where id=c.fornecedor_id for update;
 if not exists(select 1 from public.fornecedores f join public.profiles p on p.id=f.dono_id where f.id=c.fornecedor_id and p.ativo) then raise exception 'Empresa indisponível';end if;
 if (select count(*) from public.fornecedor_membros where fornecedor_id=c.fornecedor_id and ativo)>=(private.limits_supplier()->>'membros')::integer then raise exception 'Limite de membros atingido';end if;
 insert into public.fornecedor_membros(fornecedor_id,user_id) values(c.fornecedor_id,auth.uid()) on conflict(fornecedor_id,user_id) do update set ativo=true;
 insert into public.user_roles(user_id,role) values(auth.uid(),'fornecedor') on conflict(user_id,role) do nothing;
 update public.convites set usado_em=now() where id=c.id;
end$$;
create function private.revoke_member(sid uuid,target uuid,is_invite boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.owns_supplier(sid) then raise exception 'Somente o dono pode revogar';end if;
 perform 1 from public.fornecedores where id=sid for update;
 if is_invite then update public.convites set revogado_em=now() where id=target and fornecedor_id=sid and usado_em is null;
 else update public.fornecedor_membros set ativo=false where id=target and fornecedor_id=sid;end if;
 insert into public.audit_log(ator_id,acao,tabela,registro_id,depois) values(auth.uid(),'REVOGAR',case when is_invite then 'convites' else 'fornecedor_membros' end,target,jsonb_build_object('fornecedor_id',sid));end$$;
create function private.claim_supplier(document text,proof text,message text) returns void language plpgsql security definer set search_path='' as $$declare sid uuid;begin
 if not private.is_active() then raise exception 'Entre com uma conta ativa';end if;
 select id into sid from public.fornecedores where cnpj=regexp_replace(document,'\D','','g');
 if sid is null or private.can_edit_supplier(sid) then raise exception 'Não há página elegível para reivindicação';end if;
 if proof !~ '^https://' or length(message) not between 20 and 2000 or not private.text_safe(message) then raise exception 'Informe um comprovante HTTPS e explique o vínculo em ao menos 20 caracteres';end if;
 insert into public.reivindicacoes(fornecedor_id,solicitante_id,prova_url,mensagem) values(sid,auth.uid(),proof,message);
end$$;
create function public.equipe_fornecedor(sid uuid) returns jsonb language sql stable set search_path='' as $$select private.team_supplier(sid)$$;
create function public.convidar_membro(sid uuid,address text) returns jsonb language sql set search_path='' as $$select private.invite_member(sid,address)$$;
create function public.inspecionar_convite(raw text) returns jsonb language sql stable set search_path='' as $$select private.inspect_invite(raw)$$;
create function public.aceitar_convite(raw text) returns void language sql set search_path='' as $$select private.accept_invite(raw)$$;
create function public.revogar_membro(sid uuid,target uuid,is_invite boolean) returns void language sql set search_path='' as $$select private.revoke_member(sid,target,is_invite)$$;
create function public.reivindicar_fornecedor(document text,proof text,message text) returns void language sql set search_path='' as $$select private.claim_supplier(document,proof,message)$$;
revoke all on function private.team_supplier(uuid),private.invite_member(uuid,text),private.inspect_invite(text),private.accept_invite(text),private.revoke_member(uuid,uuid,boolean),private.claim_supplier(text,text,text) from public;
grant execute on function private.team_supplier(uuid),private.invite_member(uuid,text),private.accept_invite(text),private.revoke_member(uuid,uuid,boolean),private.claim_supplier(text,text,text) to authenticated;
grant execute on function private.inspect_invite(text) to anon,authenticated;
revoke all on function public.equipe_fornecedor(uuid),public.convidar_membro(uuid,text),public.inspecionar_convite(text),public.aceitar_convite(text),public.revogar_membro(uuid,uuid,boolean),public.reivindicar_fornecedor(text,text,text) from public;
grant execute on function public.equipe_fornecedor(uuid),public.convidar_membro(uuid,text),public.aceitar_convite(text),public.revogar_membro(uuid,uuid,boolean),public.reivindicar_fornecedor(text,text,text) to authenticated;
grant execute on function public.inspecionar_convite(text) to anon,authenticated;
-- Reminders are queued once per supplier/day; an Edge Function delivers and logs them.
create function public.preparar_lembretes_fornecedor() returns integer language plpgsql security definer set search_path='' as $$declare n integer;begin
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload)
 select f.id,u.email,'perfil_incompleto','incompleto:'||f.id||':'||floor(extract(epoch from (now()-f.cadastro_em))/86400)::int,jsonb_build_object('empresa',f.nome_fantasia,'dia',floor(extract(epoch from (now()-f.cadastro_em))/86400)::int)
 from public.fornecedores f join auth.users u on u.id=f.dono_id join public.profiles p on p.id=f.dono_id
 where p.ativo and f.status in ('rascunho','ajuste_solicitado') and (f.logo_url='' or f.descricao_curta='' or f.whatsapp='' or not exists(select 1 from public.fornecedor_segmentos where fornecedor_id=f.id and deletado_em is null) or not exists(select 1 from public.cobertura where fornecedor_id=f.id and deletado_em is null)) and floor(extract(epoch from (now()-f.cadastro_em))/86400)::int in (2,5,7)
 on conflict(chave) do nothing;get diagnostics n=row_count;return n;end$$;
revoke all on function public.preparar_lembretes_fornecedor() from public;
grant execute on function public.preparar_lembretes_fornecedor() to service_role;
-- Storage is installed by Supabase; lightweight SQL harnesses may not include it.
do $$begin if to_regclass('storage.buckets') is not null then
 insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('fornecedores','fornecedores',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
 execute $policy$create policy supplier_media_read on storage.objects for select to authenticated using(bucket_id='fornecedores' and private.can_edit_supplier((split_part(name,'/',1))::uuid))$policy$;
 execute $policy$create policy supplier_media_insert on storage.objects for insert to authenticated with check(bucket_id='fornecedores' and private.can_edit_supplier((split_part(name,'/',1))::uuid) and exists(select 1 from public.fornecedores where id=(split_part(name,'/',1))::uuid and status in ('rascunho','ajuste_solicitado','publicado')))$policy$;
 -- New files receive immutable UUID names: replacing an asset never overwrites the published file.
 end if;end$$;

create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$declare m jsonb:=new.raw_user_meta_data;kind public.app_role;c public.convites;begin

if m->>'tipo'='membro_fornecedor' then
 select * into c from public.convites where length(m->>'convite')=64 and token_hash=encode(sha256(convert_to(m->>'convite','UTF8')),'hex') and email=lower(new.email) and usado_em is null and revogado_em is null and expira_em>now() for update;
 if c.id is null then raise exception 'Convite inválido ou expirado';end if;
 perform 1 from public.fornecedores where id=c.fornecedor_id for update;
 if not exists(select 1 from public.fornecedores f join public.profiles p on p.id=f.dono_id where f.id=c.fornecedor_id and p.ativo) then raise exception 'Empresa indisponível';end if;
 if (select count(*) from public.fornecedor_membros where fornecedor_id=c.fornecedor_id and ativo)>=(private.limits_supplier()->>'membros')::integer then raise exception 'Limite de membros atingido';end if;
 if coalesce(m->>'termos','false')<>'true' or coalesce(m->>'termos_versao','')='' or coalesce(m->>'privacidade_versao','')='' then raise exception 'Aceite os documentos';end if;
 insert into public.profiles(id,nome) values(new.id,m->>'nome');
 insert into public.user_roles(user_id,role) values(new.id,'fornecedor');
 insert into public.fornecedor_membros(fornecedor_id,user_id) values(c.fornecedor_id,new.id);
 insert into public.consentimentos(user_id,documento,versao,origem) values(new.id,'termos',m->>'termos_versao','convite'),(new.id,'privacidade',m->>'privacidade_versao','convite');
 update public.convites set usado_em=now() where id=c.id;
 return new;
end if;
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
