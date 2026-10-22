-- Phase 2: writes go through authenticated, validated RPCs; no direct browser UPDATE grants.
alter table public.fornecedores
 add column razao_social text not null default '', add column slug text unique,
 add column whatsapp text not null default '', add column telefone text not null default '',
 add column email text not null default '', add column site text not null default '',
 add column instagram text not null default '', add column cep text not null default '',
 add column endereco text not null default '', add column cidade_id uuid references public.cidades(id) on delete restrict,
 add column logo_url text not null default '', add column logo_thumb_url text not null default '',
 add column capa_url text not null default '', add column capa_thumb_url text not null default '',
 add column descricao_curta text not null default '' check(length(descricao_curta)<=160),
 add column sobre text not null default '' check(length(sobre)<=2000),
 add column ano_fundacao integer check(ano_fundacao between 1800 and 2200),
 add column video_url text not null default '', add column certificacoes jsonb not null default '[]',
 add column instagram_posts jsonb not null default '[]', add column motivo_status text not null default '',
 add column completude integer not null default 0 check(completude between 0 and 100),
 add column etapa integer not null default 0 check(etapa between 0 and 4);
create table public.fornecedor_membros(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,user_id uuid not null references public.profiles(id) on delete restrict,papel text not null default 'editor' check(papel in ('dono','editor')),ativo boolean not null default true,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),unique(fornecedor_id,user_id));
create table public.fornecedor_segmentos(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,segmento_id uuid not null references public.segmentos(id) on delete restrict,deletado_em timestamptz,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create unique index supplier_segment_active on public.fornecedor_segmentos(fornecedor_id,segmento_id) where deletado_em is null;
create table public.cobertura(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,estado_uf text not null references public.estados(uf) on delete restrict,cidade_id uuid references public.cidades(id) on delete restrict,deletado_em timestamptz,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create unique index coverage_active on public.cobertura(fornecedor_id,estado_uf,cidade_id) nulls not distinct where deletado_em is null;
create table public.servicos(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,titulo text not null check(length(titulo) between 2 and 120),descricao text not null default '' check(length(descricao)<=1000),foto_url text not null default '',ordem integer not null default 0,oculto_por_plano boolean not null default false,deletado_em timestamptz,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.midias(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,tipo text not null default 'foto',url text not null,legenda text not null default '' check(length(legenda)<=160),ordem integer not null default 0,oculto_por_plano boolean not null default false,deletado_em timestamptz,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.cases(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,condominio text not null check(length(condominio) between 2 and 160),descricao text not null default '' check(length(descricao)<=1000),foto_url text not null default '',ordem integer not null default 0,deletado_em timestamptz,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.faqs(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,pergunta text not null check(length(pergunta) between 3 and 200),resposta text not null check(length(resposta) between 3 and 1000),ordem integer not null default 0,deletado_em timestamptz,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.fornecedor_alteracoes(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,autor_id uuid not null references public.profiles(id) on delete restrict,campo text not null check(campo in ('nome_fantasia','cnpj','logo_url')),antes text,depois text,pendente boolean not null default true,decidido_por uuid references public.profiles(id) on delete restrict,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create unique index supplier_pending_field on public.fornecedor_alteracoes(fornecedor_id,campo) where pendente;
create table public.convites(id uuid primary key default gen_random_uuid(),token_hash text not null unique,email text not null,tipo text not null default 'membro_fornecedor',fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,autor_id uuid not null references public.profiles(id) on delete restrict,expira_em timestamptz not null,usado_em timestamptz,revogado_em timestamptz,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.reivindicacoes(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,solicitante_id uuid not null references public.profiles(id) on delete restrict,prova_url text not null,mensagem text not null,status text not null default 'pendente' check(status in ('pendente','aprovada','recusada')),decidido_por uuid references public.profiles(id) on delete restrict,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.email_outbox(id uuid primary key default gen_random_uuid(),fornecedor_id uuid references public.fornecedores(id) on delete restrict,destinatario text not null,template text not null,payload jsonb not null default '{}',chave text not null unique,status text not null default 'pendente',tentativas integer not null default 0,processado_em timestamptz,erro text,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.email_log(id uuid primary key default gen_random_uuid(),destinatario text not null,template text not null,assunto text not null,status text not null,erro text,enviado_em timestamptz,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
insert into public.configuracoes(chave,valor,publica) values('limites_cadastro','{"fotos":12,"servicos":20,"cases":10,"faqs":20,"video":true,"segmentos":3,"membros":3,"upload_mb":5,"dias_completude":7}',true) on conflict(chave) do nothing;
create function private.can_edit_supplier(sid uuid) returns boolean language sql stable security definer set search_path='' as $$select private.is_active() and exists(select 1 from public.fornecedores f where f.id=sid and (f.dono_id=auth.uid() or private.has_role(auth.uid(),'admin') or exists(select 1 from public.fornecedor_membros m where m.fornecedor_id=f.id and m.user_id=auth.uid() and m.ativo)))$$;
create function private.owns_supplier(sid uuid) returns boolean language sql stable security definer set search_path='' as $$select private.is_active() and exists(select 1 from public.fornecedores where id=sid and dono_id=auth.uid())$$;
create function private.limits_supplier() returns jsonb language sql stable security definer set search_path='' as $$select valor from public.configuracoes where chave='limites_cadastro'$$;
create function private.text_safe(v text) returns boolean language sql immutable set search_path='' as $$select coalesce(v,'') !~* '(<[^>]*>|javascript:|data:text/html)'$$;
create function private.media_safe(v text,sid uuid) returns boolean language sql stable set search_path='' as $$select coalesce(v,'')='' or (v ~ '^https?://' and position('/storage/v1/object/public/fornecedores/'||sid::text||'/' in v)>0)$$;
create function public.gerar_slug(value text) returns text language sql immutable set search_path='' as $$select trim(both '-' from regexp_replace(lower(extensions.unaccent(value)),'[^a-z0-9]+','-','g'))$$;
create function private.supplier_snapshot(sid uuid) returns jsonb language sql stable security definer set search_path='' as $$select to_jsonb(f)||jsonb_build_object(
 'cidade_nome',coalesce(c.nome,''),'estado',coalesce(c.uf,''),'ano_fundacao',coalesce(f.ano_fundacao::text,''),'slug',coalesce(f.slug,''),'cidade_id',coalesce(f.cidade_id::text,''),'avaliacoes_publicadas',0,
 'segmentos',coalesce((select jsonb_agg(segmento_id) from public.fornecedor_segmentos where fornecedor_id=sid and deletado_em is null),'[]'),
 'cobertura',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'uf',r.estado_uf,'cidade_id',r.cidade_id,'cidade_nome',coalesce(cc.nome,''))) from public.cobertura r left join public.cidades cc on cc.id=r.cidade_id where r.fornecedor_id=sid and r.deletado_em is null),'[]'),
 'servicos',coalesce((select jsonb_agg(to_jsonb(s) order by ordem) from public.servicos s where fornecedor_id=sid and deletado_em is null),'[]'),
 'midias',coalesce((select jsonb_agg(to_jsonb(s) order by ordem) from public.midias s where fornecedor_id=sid and deletado_em is null),'[]'),
 'cases',coalesce((select jsonb_agg(to_jsonb(s) order by ordem) from public.cases s where fornecedor_id=sid and deletado_em is null),'[]'),
 'faqs',coalesce((select jsonb_agg(to_jsonb(s) order by ordem) from public.faqs s where fornecedor_id=sid and deletado_em is null),'[]'),
 'alteracoes_pendentes',coalesce((select jsonb_agg(jsonb_build_object('campo',campo,'depois',depois)) from public.fornecedor_alteracoes where fornecedor_id=sid and pendente),'[]'))
 from public.fornecedores f left join public.cidades c on c.id=f.cidade_id where f.id=sid and private.can_edit_supplier(sid)$$;
create function private.calcular_completude(sid uuid) returns integer language sql stable set search_path='' as $$select
 (case when logo_url<>'' then 10 else 0 end)+(case when capa_url<>'' then 10 else 0 end)+(case when descricao_curta<>'' then 10 else 0 end)+(case when length(sobre)>300 then 10 else 0 end)+
 (case when (select count(*) from public.midias where fornecedor_id=sid and deletado_em is null)>=5 then 10 else 0 end)+
 (case when (select count(*) from public.servicos where fornecedor_id=sid and deletado_em is null)>=3 then 10 else 0 end)+
 (case when exists(select 1 from public.cases where fornecedor_id=sid and deletado_em is null) then 10 else 0 end)+
 (case when (select count(*) from public.faqs where fornecedor_id=sid and deletado_em is null)>=3 then 5 else 0 end)+
 (case when exists(select 1 from public.cobertura where fornecedor_id=sid and deletado_em is null) then 10 else 0 end)+(case when instagram<>'' then 5 else 0 end)
 from public.fornecedores where id=sid$$;
create function private.save_supplier(sid uuid,step integer,data jsonb,version timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
create function private.submit_supplier(sid uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare f public.fornecedores;owner_email text;begin
 if not private.can_edit_supplier(sid) then raise exception 'Acesso negado';end if;select * into f from public.fornecedores where id=sid for update;
 if f.status not in ('rascunho','ajuste_solicitado') then raise exception 'Status não permite envio';end if;
 if f.logo_url='' or f.descricao_curta='' or f.whatsapp !~ '^\d{10,11}$' or not exists(select 1 from public.fornecedor_segmentos where fornecedor_id=sid and deletado_em is null) or not exists(select 1 from public.cobertura where fornecedor_id=sid and deletado_em is null) then raise exception 'Complete logo, descrição, segmento, região e WhatsApp';end if;
 update public.fornecedores set status='em_analise',motivo_status='' where id=sid;
 select email into owner_email from auth.users where id=f.dono_id;
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(sid,owner_email,'perfil_em_analise','analise:'||sid||':'||clock_timestamp(),jsonb_build_object('empresa',f.nome_fantasia));
 return private.supplier_snapshot(sid);end$$;
create function public.obter_fornecedor(sid uuid) returns jsonb language sql stable set search_path='' as $$select private.supplier_snapshot(sid)$$;
create function public.salvar_fornecedor(sid uuid,step integer,data jsonb,version timestamptz default null) returns jsonb language sql set search_path='' as $$select private.save_supplier(sid,step,data,version)$$;
create function public.enviar_fornecedor(sid uuid) returns jsonb language sql set search_path='' as $$select private.submit_supplier(sid)$$;
-- Tables default-deny. Own records are visible, including soft-deletion history for audit.
drop policy supplier_read on public.fornecedores;
create policy supplier_read on public.fornecedores for select to authenticated using(private.can_edit_supplier(id) or private.has_role(auth.uid(),'comercial'));
do $$declare t text;begin
 foreach t in array array['fornecedor_membros','fornecedor_segmentos','cobertura','servicos','midias','cases','faqs','fornecedor_alteracoes','convites','reivindicacoes','email_outbox','email_log'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create trigger set_atualizado_em before update on public.%I for each row execute function private.set_atualizado_em()',t);
  if t not in ('convites','email_outbox','email_log') then execute format('create trigger gravar_audit after insert or update or delete on public.%I for each row execute function private.gravar_audit()',t);end if;
 end loop;
 foreach t in array array['fornecedor_membros','fornecedor_segmentos','cobertura','servicos','midias','cases','faqs','fornecedor_alteracoes'] loop
  execute format('create policy own_read on public.%I for select to authenticated using(private.can_edit_supplier(fornecedor_id))',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create index on public.%I(fornecedor_id)',t);
 end loop;
end$$;
create policy claims_read on public.reivindicacoes for select to authenticated using((solicitante_id=auth.uid() and private.is_active()) or private.has_role(auth.uid(),'admin'));
create policy email_log_admin on public.email_log for select to authenticated using(private.has_role(auth.uid(),'admin'));
grant select on public.email_log,public.reivindicacoes to authenticated;
grant all on public.email_outbox,public.email_log to service_role;
create index on public.fornecedor_membros(user_id);create index on public.fornecedor_segmentos(segmento_id);create index on public.cobertura(cidade_id);create index on public.fornecedores(cidade_id);create index on public.convites(fornecedor_id);create index on public.convites(autor_id);create index on public.convites(expira_em);create index on public.email_outbox(status,criado_em);create index on public.email_outbox(fornecedor_id);create index on public.reivindicacoes(fornecedor_id);create index on public.reivindicacoes(solicitante_id);create index on public.reivindicacoes(decidido_por);create index on public.fornecedor_alteracoes(autor_id);create index on public.fornecedor_alteracoes(decidido_por);
revoke all on function private.can_edit_supplier(uuid),private.owns_supplier(uuid),private.limits_supplier(),private.text_safe(text),private.media_safe(text,uuid),private.supplier_snapshot(uuid),private.calcular_completude(uuid),private.save_supplier(uuid,integer,jsonb,timestamptz),private.submit_supplier(uuid) from public;
grant execute on function private.can_edit_supplier(uuid),private.owns_supplier(uuid),private.supplier_snapshot(uuid),private.save_supplier(uuid,integer,jsonb,timestamptz),private.submit_supplier(uuid) to authenticated;
revoke all on function public.obter_fornecedor(uuid),public.salvar_fornecedor(uuid,integer,jsonb,timestamptz),public.enviar_fornecedor(uuid) from public;
grant execute on function public.obter_fornecedor(uuid),public.salvar_fornecedor(uuid,integer,jsonb,timestamptz),public.enviar_fornecedor(uuid) to authenticated;
