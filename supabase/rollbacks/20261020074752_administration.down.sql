-- Destructive schema reversal: disposable databases or reviewed restore procedure only.
-- Reverse newer migrations first. Backup required for business data.
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='password_changed' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='admin_guard' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='admin_list' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='admin_owner_invite' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='admin_action' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='admin_import' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='accept_owner_invite' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='admin_listar' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='admin_agir' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='admin_importar' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='aceitar_propriedade' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='segment_redirect' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='redirecionamento_segmento' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
drop table if exists public.segmento_redirects cascade;
drop table if exists public.creditos_extrato cascade;
drop table if exists public.convites_proprietario cascade;
drop table if exists private.admin_import_batches cascade;
drop table if exists private.testes_cnpj cascade;
drop trigger if exists patri_password_changed on auth.users;
drop policy if exists supplier_media_insert on storage.objects;
alter table public.profiles drop column if exists senha_pendente cascade;
alter table public.fornecedores drop column if exists verificado cascade;
create or replace function private.has_role(uid uuid,requested public.app_role) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id where r.user_id=uid and r.role=requested and p.ativo)$$;
create or replace function private.protect_profile() returns trigger language plpgsql set search_path='' as $$begin if current_user in ('anon','authenticated') and not private.has_role(auth.uid(),'admin') and (new.ativo is distinct from old.ativo or new.id is distinct from old.id) then raise exception 'Campo protegido';end if;return new;end$$;
create or replace function private.can_edit_supplier(sid uuid) returns boolean language sql stable security definer set search_path='' as $$select private.is_active() and exists(select 1 from public.fornecedores f where f.id=sid and (f.dono_id=auth.uid() or private.has_role(auth.uid(),'admin') or exists(select 1 from public.fornecedor_membros m where m.fornecedor_id=f.id and m.user_id=auth.uid() and m.ativo)))$$;
create or replace function private.owns_supplier(sid uuid) returns boolean language sql stable security definer set search_path='' as $$select private.is_active() and exists(select 1 from public.fornecedores where id=sid and dono_id=auth.uid())$$;
create or replace function private.save_supplier(sid uuid,step integer,data jsonb,version timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.fornecedores; lim jsonb; item jsonb; k text; v text; oldval text; n integer:=0;begin
 if not private.can_edit_supplier(sid) then raise exception 'Acesso negado';end if;
 select * into f from public.fornecedores where id=sid for update;
 if f.status not in ('rascunho','ajuste_solicitado','publicado') then raise exception 'A edição está pausada durante a análise';end if;
 if version is not null and version<>f.atualizado_em then raise exception 'O perfil foi alterado em outra sessão. Recarregue antes de salvar';end if;
 if step not between 0 and 4 then raise exception 'Etapa inválida';end if;
 lim:=private.limits_supplier();
 for k,v in select key,value#>>'{}' from jsonb_each(data) loop if jsonb_typeof(data->k)='string' and not private.text_safe(v) then raise exception 'Remova HTML ou conteúdo inseguro';end if;end loop;
 if step=0 then
  if length(trim(coalesce(data->>'nome_fantasia','')))<2 or length(data->>'nome_fantasia')>120 then raise exception 'Nome fantasia obrigatório';end if;
  if not private.valid_cnpj(data->>'cnpj') then raise exception 'CNPJ inválido';end if;
  if regexp_replace(coalesce(data->>'whatsapp',''),'\D','','g') !~ '^\d{10,11}$' then raise exception 'WhatsApp inválido';end if;
  if coalesce(data->>'telefone','')<>'' and regexp_replace(data->>'telefone','\D','','g') !~ '^\d{10,11}$' then raise exception 'Telefone inválido';end if;
  if coalesce(data->>'site','')<>'' and (data->>'site' !~ '^https://[^/@[:space:]]+([/:?#]|$)' or data->>'site' ~ '^https://[^/]*@') then raise exception 'Use https:// no site';end if;
  if coalesce(data->>'instagram','') !~ '^[a-zA-Z0-9._]*$' then raise exception 'Instagram sem @';end if;
  if coalesce(data->>'email','')<>'' and data->>'email' !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido';end if;
  if exists(select 1 from public.fornecedores where cnpj=regexp_replace(data->>'cnpj','\D','','g') and id<>sid) then raise exception 'CNPJ_DUPLICADO: solicite a reivindicação da página';end if;
  update public.fornecedores set nome_fantasia=trim(data->>'nome_fantasia'),razao_social=left(coalesce(data->>'razao_social',''),160),cnpj=regexp_replace(data->>'cnpj','\D','','g'),whatsapp=regexp_replace(data->>'whatsapp','\D','','g'),telefone=coalesce(data->>'telefone',''),email=coalesce(data->>'email',''),site=coalesce(data->>'site',''),instagram=coalesce(data->>'instagram',''),cep=coalesce(data->>'cep',''),endereco=left(coalesce(data->>'endereco',''),240),cidade_id=nullif(data->>'cidade_id','')::uuid where id=sid;
 elsif step=1 then
  foreach k in array array['logo_url','logo_thumb_url','capa_url','capa_thumb_url'] loop if not private.media_safe(data->>k,sid) then raise exception 'Imagem fora da pasta da empresa';end if;end loop;
  update public.fornecedores set logo_url=coalesce(data->>'logo_url',''),logo_thumb_url=coalesce(data->>'logo_thumb_url',''),capa_url=coalesce(data->>'capa_url',''),capa_thumb_url=coalesce(data->>'capa_thumb_url','') where id=sid;
 elsif step=2 then
  if length(trim(coalesce(data->>'descricao_curta','')))=0 or length(data->>'descricao_curta')>160 or length(coalesce(data->>'sobre',''))>2000 then raise exception 'Descrição inválida';end if;
  if coalesce(data->>'sobre','') ~* '([[:alnum:].+_-]+@[[:alnum:].-]+\.[a-z]{2,}|(\+?55[[:space:]]*)?(\(?[0-9]{2}\)?[ .-]*)?[0-9]{4,5}[ .-]?[0-9]{4})' then raise exception 'Não inclua contato no texto Sobre';end if;
  if jsonb_typeof(data->'segmentos') is distinct from 'array' or jsonb_array_length(data->'segmentos') not between 1 and (lim->>'segmentos')::integer then raise exception 'Escolha de 1 a 3 segmentos';end if;
  update public.fornecedores set descricao_curta=trim(data->>'descricao_curta'),sobre=coalesce(data->>'sobre',''),ano_fundacao=nullif(data->>'ano_fundacao','')::integer where id=sid;
  if nullif(data->>'ano_fundacao','')::integer>extract(year from now()) then raise exception 'Ano inválido';end if;
  update public.fornecedor_segmentos set deletado_em=now() where fornecedor_id=sid and deletado_em is null;
  for v in select jsonb_array_elements_text(data->'segmentos') loop
   if not exists(select 1 from public.segmentos where id=v::uuid and ativo) then raise exception 'Segmento inválido';end if;
   insert into public.fornecedor_segmentos(fornecedor_id,segmento_id) values(sid,v::uuid);
  end loop;
 elsif step=3 then
  if jsonb_typeof(data->'cobertura') is distinct from 'array' or jsonb_array_length(data->'cobertura') not between 1 and 100 then raise exception 'Adicione uma região válida';end if;
  update public.cobertura set deletado_em=now() where fornecedor_id=sid and deletado_em is null;
  for item in select jsonb_array_elements(data->'cobertura') loop
   if nullif(item->>'cidade_id','') is not null and not exists(select 1 from public.cidades where id=(item->>'cidade_id')::uuid and uf=item->>'uf') then raise exception 'Cidade não pertence ao estado';end if;
   insert into public.cobertura(fornecedor_id,estado_uf,cidade_id) values(sid,item->>'uf',nullif(item->>'cidade_id','')::uuid);
  end loop;
 else
  foreach k in array array['servicos','midias','cases','faqs','certificacoes','instagram_posts'] loop
   if jsonb_typeof(data->k) is distinct from 'array' then raise exception 'Conteúdo inválido';end if;
   n:=case k when 'servicos' then (lim->>'servicos')::int when 'midias' then (lim->>'fotos')::int when 'cases' then (lim->>'cases')::int when 'faqs' then (lim->>'faqs')::int when 'certificacoes' then 20 else 6 end;
   if jsonb_array_length(data->k)>n then raise exception 'Limite de conteúdo excedido';end if;
   for item in select jsonb_array_elements(data->k) loop
    if jsonb_typeof(item)='object' then for v in select value#>>'{}' from jsonb_each(item) loop if not private.text_safe(v) then raise exception 'Conteúdo inseguro';end if;end loop;
    elsif not private.text_safe(item#>>'{}') or length(item#>>'{}')>200 then raise exception 'Conteúdo inválido';end if;
   end loop;
  end loop;
  if coalesce(data->>'video_url','')<>'' and (not (lim->>'video')::boolean or data->>'video_url' !~ '^https://(www\.)?(youtube\.com/(watch\?v=|embed/|shorts/)|youtu\.be/)[a-zA-Z0-9_-]{11}([?&].*)?$') then raise exception 'Vídeo inválido';end if;
  for v in select jsonb_array_elements_text(data->'instagram_posts') loop if v !~ '^https://(www\.)?instagram\.com/(p|reel)/[a-zA-Z0-9_-]+/?$' then raise exception 'Publicação inválida';end if;end loop;
  update public.servicos set deletado_em=now() where fornecedor_id=sid and deletado_em is null;
  update public.midias set deletado_em=now() where fornecedor_id=sid and deletado_em is null;
  update public.cases set deletado_em=now() where fornecedor_id=sid and deletado_em is null;
  update public.faqs set deletado_em=now() where fornecedor_id=sid and deletado_em is null;
  n:=0;for item in select jsonb_array_elements(data->'servicos') loop if not private.media_safe(item->>'foto_url',sid) then raise exception 'Foto inválida';end if;insert into public.servicos(fornecedor_id,titulo,descricao,foto_url,ordem) values(sid,item->>'titulo',coalesce(item->>'descricao',''),coalesce(item->>'foto_url',''),n);n:=n+1;end loop;
  n:=0;for item in select jsonb_array_elements(data->'midias') loop if not private.media_safe(item->>'url',sid) or coalesce(item->>'url','')='' then raise exception 'Foto inválida';end if;insert into public.midias(fornecedor_id,url,legenda,ordem) values(sid,item->>'url',coalesce(item->>'legenda',''),n);n:=n+1;end loop;
  n:=0;for item in select jsonb_array_elements(data->'cases') loop if not private.media_safe(item->>'foto_url',sid) then raise exception 'Foto inválida';end if;insert into public.cases(fornecedor_id,condominio,descricao,foto_url,ordem) values(sid,item->>'condominio',coalesce(item->>'descricao',''),coalesce(item->>'foto_url',''),n);n:=n+1;end loop;
  n:=0;for item in select jsonb_array_elements(data->'faqs') loop insert into public.faqs(fornecedor_id,pergunta,resposta,ordem) values(sid,item->>'pergunta',item->>'resposta',n);n:=n+1;end loop;
  update public.fornecedores set certificacoes=data->'certificacoes',instagram_posts=data->'instagram_posts',video_url=coalesce(data->>'video_url','') where id=sid;
 end if;
 -- Published sensitive fields are proposals, not immediate public changes.
 if f.status='publicado' then
  foreach k in array array['nome_fantasia','cnpj','logo_url'] loop
   select to_jsonb(x)->>k into v from public.fornecedores x where id=sid;oldval:=to_jsonb(f)->>k;
   if v is distinct from oldval then
    insert into public.fornecedor_alteracoes(fornecedor_id,autor_id,campo,antes,depois) values(sid,auth.uid(),k,oldval,v) on conflict(fornecedor_id,campo) where pendente do update set depois=excluded.depois,autor_id=excluded.autor_id,atualizado_em=now();
    execute format('update public.fornecedores set %I=$1 where id=$2',k) using oldval,sid;
   end if;
  end loop;
  if step=1 then update public.fornecedores set logo_thumb_url=f.logo_thumb_url where id=sid;end if;
 end if;
 update public.fornecedores set etapa=step,completude=private.calcular_completude(sid),slug=coalesce(slug,public.gerar_slug(nome_fantasia)||'-'||left(id::text,8)) where id=sid;
 return private.supplier_snapshot(sid);
end$$;
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
create or replace function private.directory_payload(sid uuid) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'id',f.id,'slug',f.slug,'nome_fantasia',f.nome_fantasia,
 'descricao_curta',f.descricao_curta,'sobre',f.sobre,'ano_fundacao',f.ano_fundacao,
 'logo_url',f.logo_url,'logo_thumb_url',f.logo_thumb_url,'capa_url',f.capa_url,
 'whatsapp',f.whatsapp,'telefone',f.telefone,'site',f.site,'instagram',f.instagram,
 'endereco',f.endereco,'cep',f.cep,'video_url',f.video_url,
 'certificacoes',f.certificacoes,'instagram_posts',f.instagram_posts,'atualizado_em',f.atualizado_em,
 'cidade',case when c.id is not null then jsonb_build_object('id',c.id,'nome',c.nome,'uf',c.uf,'slug',c.slug) else null end,
 'segmentos',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'nome',s.nome,'slug',s.slug,'icone',s.icone) order by s.ordem,s.nome)
 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id
 where fs.fornecedor_id=f.id and fs.deletado_em is null and s.ativo),'[]'),
 'cobertura',coalesce((select jsonb_agg(jsonb_build_object('uf',r.estado_uf,'cidade_id',r.cidade_id,'cidade_nome',coalesce(cc.nome,''),'cidade_slug',coalesce(cc.slug,'')))
 from public.cobertura r left join public.cidades cc on cc.id=r.cidade_id where r.fornecedor_id=f.id and r.deletado_em is null),'[]'),
 'servicos',coalesce((select jsonb_agg(jsonb_build_object('id',id,'titulo',titulo,'descricao',descricao,'foto_url',foto_url) order by ordem)
 from public.servicos where fornecedor_id=f.id and deletado_em is null and not oculto_por_plano),'[]'),
 'midias',coalesce((select jsonb_agg(jsonb_build_object('id',id,'url',url,'legenda',legenda) order by ordem)
 from public.midias where fornecedor_id=f.id and deletado_em is null and not oculto_por_plano and tipo='foto'),'[]'),
 'cases',coalesce((select jsonb_agg(jsonb_build_object('id',id,'condominio',condominio,'descricao',descricao,'foto_url',foto_url) order by ordem)
 from public.cases where fornecedor_id=f.id and deletado_em is null),'[]'),
 'faqs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'pergunta',pergunta,'resposta',resposta) order by ordem)
 from public.faqs where fornecedor_id=f.id and deletado_em is null),'[]'),
 'verificado',false,'patrocinado',false,'nota',null,'avaliacoes',0)
 from public.fornecedores f left join public.cidades c on c.id=f.cidade_id
 where f.id=sid and private.is_supplier_public(f.id) and f.slug is not null;
$$;
create or replace function private.prepare_lead_reminders() returns integer language plpgsql security definer set search_path='' as $$declare l record;total integer:=0;begin
 for l in select x.id,x.fornecedor_id,f.nome_fantasia,u.email from public.leads x join public.fornecedores f on f.id=x.fornecedor_id join public.profiles p on p.id=f.dono_id join auth.users u on u.id=f.dono_id where x.status in ('novo','visto') and x.respondido_em is null and x.criado_em<=now()-interval '48 hours' and p.ativo for update of x skip locked loop
 update public.leads set status='sem_resposta' where id=l.id;
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(l.fornecedor_id,l.email,'orcamento_sem_resposta','48h:'||l.id,jsonb_build_object('empresa',l.nome_fantasia,'lead_id',l.id)) on conflict(chave) do nothing;total:=total+1;end loop;
 delete from private.quotation_requests r where r.criado_em<now()-interval '2 days' and not exists(select 1 from public.leads where pedido_id=r.id);
 return total;end;$$;
