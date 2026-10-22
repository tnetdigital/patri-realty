-- Phase 5. Administrative writes are narrow RPCs with fresh database role checks.
alter table public.profiles add column senha_pendente boolean not null default false;
create or replace function private.has_role(uid uuid,requested public.app_role) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id where r.user_id=uid and r.role=requested and p.ativo and not p.senha_pendente)$$;
create or replace function private.protect_profile() returns trigger language plpgsql set search_path='' as $$begin if current_user in ('anon','authenticated') and not private.has_role(auth.uid(),'admin') and (new.ativo is distinct from old.ativo or new.id is distinct from old.id or new.senha_pendente is distinct from old.senha_pendente) then raise exception 'Campo protegido';end if;return new;end$$;
create function private.password_changed() returns trigger language plpgsql security definer set search_path='' as $$begin if new.encrypted_password is distinct from old.encrypted_password and coalesce(new.encrypted_password,'')<>'' then update public.profiles set senha_pendente=false where id=new.id and senha_pendente;end if;return new;end;$$;
create trigger patri_password_changed after update of encrypted_password on auth.users for each row execute function private.password_changed();
revoke all on function private.password_changed() from public;
create or replace function private.can_edit_supplier(sid uuid) returns boolean language sql stable security definer set search_path='' as $$select private.is_active() and exists(select 1 from public.profiles where id=auth.uid() and not senha_pendente) and exists(select 1 from public.fornecedores f where f.id=sid and (f.dono_id=auth.uid() or private.has_role(auth.uid(),'admin') or exists(select 1 from public.fornecedor_membros m where m.fornecedor_id=f.id and m.user_id=auth.uid() and m.ativo)))$$;

create or replace function private.owns_supplier(sid uuid) returns boolean language sql stable security definer set search_path='' as $$select private.can_edit_supplier(sid) and exists(select 1 from public.fornecedores where id=sid and dono_id=auth.uid())$$;

alter table public.fornecedores alter column dono_id drop not null;
alter table public.fornecedores add column verificado boolean not null default false,add column plano_codigo text not null default 'gratuito' check(plano_codigo in ('gratuito','teste','premium','destaque')),add column teste_inicio timestamptz,add column teste_fim timestamptz;
create table private.testes_cnpj(cnpj text primary key,inicio timestamptz not null,fim timestamptz not null);
alter table private.testes_cnpj enable row level security;
create table private.admin_import_batches(id uuid primary key,ator_id uuid not null references public.profiles(id),payload_hash text not null,result jsonb not null,criado_em timestamptz not null default now());
alter table private.admin_import_batches enable row level security;
create table public.convites_proprietario(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id),email text not null,token_hash text not null unique,autor_id uuid not null references public.profiles(id),expira_em timestamptz not null default now()+interval '14 days',usado_em timestamptz,revogado_em timestamptz,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
alter table public.convites_proprietario enable row level security;
create policy owner_invites_admin on public.convites_proprietario for select to authenticated using(private.has_role(auth.uid(),'admin'));
create index on public.convites_proprietario(fornecedor_id);
create index on public.convites_proprietario(autor_id);
create table public.creditos_extrato(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id),tipo text not null check(tipo in ('compra','uso','ajuste','cortesia')),quantidade integer not null check(quantidade<>0),valor numeric(12,2) not null default 0,lead_id uuid references public.leads(id),stripe_payment_id text unique,motivo text not null default '',criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
alter table public.creditos_extrato enable row level security;
create policy credits_read on public.creditos_extrato for select to authenticated using(private.can_edit_supplier(fornecedor_id));
grant select on public.creditos_extrato to authenticated;
create index on public.creditos_extrato(fornecedor_id);
create index on public.creditos_extrato(lead_id);
create table public.segmento_redirects(id uuid primary key default gen_random_uuid(),slug_antigo text not null unique,slug_novo text not null,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
alter table public.segmento_redirects enable row level security;
create policy segment_redirects_admin on public.segmento_redirects for all to authenticated using(private.has_role(auth.uid(),'admin')) with check(private.has_role(auth.uid(),'admin'));
do $$declare t text;begin foreach t in array array['convites_proprietario','creditos_extrato','segmento_redirects'] loop execute format('create trigger set_atualizado_em before update on public.%I for each row execute function private.set_atualizado_em()',t);execute format('create trigger gravar_audit after insert or update or delete on public.%I for each row execute function private.gravar_audit()',t);end loop;end$$;
create function private.admin_guard() returns void language plpgsql stable security definer set search_path='' as $$begin if auth.uid() is null or not private.has_role(auth.uid(),'admin') then raise exception 'Acesso administrativo negado';end if;end;$$;
create function private.admin_list(p_kind text,p_filters jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare source_sql text;result jsonb;page integer:=coalesce((p_filters->>'pagina')::integer,1);q text:=lower(extensions.unaccent(trim(coalesce(p_filters->>'q',''))));begin
 if q ~ '^[0-9./-]+$' and length(regexp_replace(q,'\D','','g'))=14 then q:=regexp_replace(q,'\D','','g');end if;
 if not private.has_role(auth.uid(),'admin') and not (private.has_role(auth.uid(),'comercial') and p_kind in ('fornecedores','pedidos','dashboard')) then raise exception 'Acesso administrativo negado';end if;
 if page not between 1 and 100000 or length(q)>120 or coalesce(p_filters->>'ordem','criado_em') not in ('criado_em','nome') then raise exception 'Filtros inválidos';end if;
 case p_kind
 when 'fornecedores' then source_sql:=$sql$select to_jsonb(f)||jsonb_build_object('nome',f.nome_fantasia,'cidade',coalesce(c.nome,''),'uf',coalesce(c.uf,''),'segmentos',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'nome',s.nome,'slug',s.slug)) from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null),'[]'),'pedidos_mes',(select count(*) from public.leads l where l.fornecedor_id=f.id and l.criado_em>=date_trunc('month',now())),'creditos',(select coalesce(sum(quantidade),0) from public.creditos_extrato e where e.fornecedor_id=f.id)) d from public.fornecedores f left join public.cidades c on c.id=f.cidade_id$sql$;
 when 'pedidos' then source_sql:=$sql$select (to_jsonb(l)-'pedido_id'-'consentimento_id')||jsonb_build_object('nome',l.condominio_nome,'empresa',f.nome_fantasia,'segmento',(select nome from public.segmentos where id=l.segmento_id)) d from public.leads l join public.fornecedores f on f.id=l.fornecedor_id$sql$;
 when 'usuarios' then source_sql:=$sql$select to_jsonb(p)||jsonb_build_object('email',u.email,'confirmado',u.email_confirmed_at is not null,'papeis',coalesce((select jsonb_agg(role) from public.user_roles where user_id=p.id),'[]')) d from public.profiles p join auth.users u on u.id=p.id$sql$;
 when 'segmentos' then source_sql:=$sql$select to_jsonb(s)||jsonb_build_object('fornecedores',(select count(*) from public.fornecedor_segmentos fs where fs.segmento_id=s.id and fs.deletado_em is null)) d from public.segmentos s$sql$;
 when 'auditoria' then source_sql:=$sql$select to_jsonb(a)||jsonb_build_object('nome',coalesce(p.nome,'Sistema')) d from public.audit_log a left join public.profiles p on p.id=a.ator_id$sql$;
 when 'alteracoes' then source_sql:=$sql$select to_jsonb(a)||jsonb_build_object('nome',f.nome_fantasia) d from public.fornecedor_alteracoes a join public.fornecedores f on f.id=a.fornecedor_id$sql$;
 when 'reivindicacoes' then source_sql:=$sql$select to_jsonb(a)||jsonb_build_object('nome',f.nome_fantasia) d from public.reivindicacoes a join public.fornecedores f on f.id=a.fornecedor_id$sql$;
 when 'configuracoes' then source_sql:=$sql$select to_jsonb(c)||jsonb_build_object('nome',c.chave) d from public.configuracoes c$sql$;
 when 'emails' then source_sql:=$sql$select to_jsonb(e)||jsonb_build_object('nome',e.destinatario) d from public.email_log e$sql$;
 when 'dashboard' then return jsonb_build_object('analise',(select count(*) from public.fornecedores where status='em_analise'),'ajustes',(select count(*) from public.fornecedores where status='ajuste_solicitado'),'incompletos',(select count(*) from public.fornecedores where completude<100 and criado_em<now()-interval '7 days'),'testes_vencendo',(select count(*) from public.fornecedores where teste_fim between now() and now()+interval '15 days'),'pedidos_semana',(select count(*) from public.leads where criado_em>now()-interval '7 days'),'sem_resposta',(select count(*) from public.leads where status='sem_resposta'),'semanas',(select jsonb_agg(x) from (select date_trunc('week',w)::date semana,(select count(*) from public.fornecedores where criado_em>=w and criado_em<w+interval '1 week') cadastros,(select count(*) from public.leads where criado_em>=w and criado_em<w+interval '1 week') pedidos from generate_series(date_trunc('week',now())-interval '7 weeks',date_trunc('week',now()),interval '1 week')w)x));
 else raise exception 'Lista inválida';end case;
 execute 'with source as ('||source_sql||'),filtered as(select d from source where ($1='''' or strpos(lower(extensions.unaccent(d::text)),$1)>0) and ($2 is null or d->>''status''=$2) and ($3 is null or d->>''uf''=$3) and ($4 is null or d->>''plano_codigo''=$4) and ($5 is null or exists(select 1 from jsonb_array_elements(coalesce(d->''segmentos'',''[]''))x where x->>''slug''=$5)) and ($6 is null or d->>''criado_em''>=$6) and ($7 is null or d->>''criado_em''<=$7) and ($8 is null or d->>''ator_id''=$8) and ($9 is null or d->>''tabela''=$9) and ($10 is null or d->>''acao''=$10) and ($14 is null or ((d->>''completude'')::int<100 and (d->>''criado_em'')::timestamptz<now()-interval ''7 days'')) and ($15 is null or (d->>''teste_fim'')::timestamptz between now() and now()+interval ''15 days'') and ($16 is null or d->>''verificado''=$16) and ($17 is null or d->>''fornecedor_id''=$17) and ($18 is null or strpos(lower(extensions.unaccent(coalesce(d->>''cidade'',''''))),lower(extensions.unaccent($18)))>0) and ($19 is null or d->>''segmento_id''=$19)),paged as(select d from filtered order by case when $11=''nome'' then d->>''nome'' end asc,case when $11<>''nome'' then d->>''criado_em'' end desc,d->>''id'' limit 25 offset $12) select jsonb_build_object(''items'',coalesce((select jsonb_agg(d)from paged),''[]''),''total'',(select count(*)from filtered),''pagina'',$13,''paginas'',ceil((select count(*)from filtered)::numeric/25))' into result using q,nullif(p_filters->>'status',''),nullif(p_filters->>'uf',''),nullif(p_filters->>'plano',''),nullif(p_filters->>'segmento',''),nullif(p_filters->>'de',''),nullif(p_filters->>'ate',''),nullif(p_filters->>'ator',''),nullif(p_filters->>'tabela',''),nullif(p_filters->>'acao',''),coalesce(p_filters->>'ordem','criado_em'),(page-1)*25,page,nullif(p_filters->>'incompletos',''),nullif(p_filters->>'testes',''),nullif(p_filters->>'verificado',''),nullif(p_filters->>'fornecedor_id',''),nullif(p_filters->>'cidade',''),nullif(p_filters->>'segmento_id','');
 return result;end;$$;
create function private.admin_owner_invite(sid uuid) returns void language plpgsql security definer set search_path='' as $$declare f public.fornecedores;token text;begin perform private.admin_guard();select * into f from public.fornecedores where id=sid for update;if f.dono_id is not null or f.email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Informe um e-mail válido em uma empresa sem proprietário';end if;
 token:=encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex');update public.convites_proprietario set revogado_em=now() where fornecedor_id=sid and usado_em is null and revogado_em is null;
 insert into public.convites_proprietario(fornecedor_id,email,token_hash,autor_id) values(sid,lower(f.email),encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid());
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(sid,lower(f.email),'convite_proprietario','dono:'||sid||':'||gen_random_uuid(),jsonb_build_object('empresa',f.nome_fantasia,'token',token));end;$$;
create function private.admin_action(p_kind text,p_id uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.fornecedores;l public.leads;a public.fornecedor_alteracoes;r public.reivindicacoes;s public.segmentos;cid uuid;neighbor public.segmentos;old_slug text;new_slug text;reason text:=trim(coalesce(p_data->>'motivo',''));mail text;old_value jsonb;new_role public.app_role;begin
 perform private.admin_guard();if length(p_data::text)>65536 then raise exception 'Dados muito grandes';end if;
 if p_kind='fornecedores' then
 select * into f from public.fornecedores where id=p_id for update;if not found then raise exception 'Empresa não encontrada';end if;
 if p_data ? 'versao' and (p_data->>'versao')::timestamptz<>f.atualizado_em then raise exception 'O registro mudou. Recarregue antes de decidir';end if;
 if p_action='aprovar' then
 if f.status<>'em_analise' or not private.is_active() or f.dono_id is null or not exists(select 1 from public.profiles where id=f.dono_id and ativo) then raise exception 'A empresa precisa estar em análise e ter um dono ativo';end if;
 if f.logo_url='' or f.descricao_curta='' or f.whatsapp !~ '^\d{10,11}$' or not exists(select 1 from public.fornecedor_segmentos where fornecedor_id=p_id and deletado_em is null) or not exists(select 1 from public.cobertura where fornecedor_id=p_id and deletado_em is null) then raise exception 'Perfil sem requisitos mínimos';end if;
 if not coalesce((p_data->'checklist'->>'logo')::boolean,false) or not coalesce((p_data->'checklist'->>'texto')::boolean,false) or not coalesce((p_data->'checklist'->>'cnpj')::boolean,false) or not coalesce((p_data->'checklist'->>'fotos')::boolean,false) or not coalesce((p_data->'checklist'->>'segmentos')::boolean,false) then raise exception 'Conclua o checklist de revisão';end if;
 insert into private.testes_cnpj(cnpj,inicio,fim) values(f.cnpj,now(),now()+interval '1 day'*coalesce((select (valor->>'dias_teste')::integer from public.configuracoes where chave='prazos_operacionais'),90)) on conflict do nothing;
 update public.fornecedores set status='publicado',motivo_status='',slug=coalesce(slug,public.gerar_slug(nome_fantasia)||'-'||left(id::text,8)),teste_inicio=coalesce(teste_inicio,(select inicio from private.testes_cnpj where cnpj=f.cnpj)),teste_fim=coalesce(teste_fim,(select fim from private.testes_cnpj where cnpj=f.cnpj)),plano_codigo=case when teste_inicio is null and (select fim>now() from private.testes_cnpj where cnpj=f.cnpj) then 'teste' else plano_codigo end where id=p_id;
 elsif p_action in ('ajuste','recusar','suspender') then if length(reason) not between 10 and 2000 or not private.text_safe(reason) then raise exception 'Informe um motivo de 10 a 2000 caracteres';end if;update public.fornecedores set status=case p_action when 'ajuste' then 'ajuste_solicitado' when 'recusar' then 'recusado' else 'suspenso' end,motivo_status=reason where id=p_id;
 elsif p_action='reativar' then if f.status<>'suspenso' then raise exception 'A empresa não está suspensa';end if;update public.fornecedores set status='em_analise',motivo_status='' where id=p_id;
 elsif p_action='verificado' then update public.fornecedores set verificado=coalesce((p_data->>'valor')::boolean,false) where id=p_id;
 elsif p_action='plano' then if p_data->>'plano' not in ('gratuito','teste','premium','destaque') then raise exception 'Plano inválido';end if;update public.fornecedores set plano_codigo=p_data->>'plano' where id=p_id;
 elsif p_action='estender_teste' then if f.teste_inicio is null or (p_data->>'dias')::integer not between 1 and 365 or length(reason)<10 then raise exception 'Informe um teste existente, dias de 1 a 365 e motivo';end if;update public.fornecedores set teste_fim=greatest(teste_fim,now())+((p_data->>'dias')::integer*interval '1 day') where id=p_id;
 elsif p_action='creditos' then if coalesce((p_data->>'quantidade')::integer,0)=0 or abs((p_data->>'quantidade')::integer)>10000 or length(reason)<10 then raise exception 'Informe quantidade válida e motivo';end if;insert into public.creditos_extrato(fornecedor_id,tipo,quantidade,motivo) values(p_id,'ajuste',(p_data->>'quantidade')::integer,reason);
 elsif p_action='convidar' then perform private.admin_owner_invite(p_id);
 elsif p_action='leitura' then insert into public.audit_log(ator_id,acao,tabela,registro_id,depois) values(auth.uid(),'VISUALIZACAO_FORNECEDOR','fornecedores',p_id,'{"modo":"somente_leitura"}');return private.supplier_snapshot(p_id);
 else raise exception 'Ação inválida';end if;
 if p_action in ('aprovar','ajuste','recusar','suspender','reativar') and f.dono_id is not null then select email into mail from auth.users where id=f.dono_id;insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(p_id,mail,'decisao_fornecedor','decisao:'||gen_random_uuid(),jsonb_build_object('empresa',f.nome_fantasia,'acao',p_action,'motivo',reason));end if;
 elsif p_kind='usuarios' then
 select to_jsonb(p) into old_value from public.profiles p where id=p_id for update;if old_value is null then raise exception 'Usuário não encontrado';end if;
 if p_action='ativo' then update public.profiles set ativo=(p_data->>'valor')::boolean where id=p_id;
 elsif p_action='papel' then new_role:=(p_data->>'papel')::public.app_role;if coalesce((p_data->>'valor')::boolean,false) then insert into public.user_roles(user_id,role) values(p_id,new_role) on conflict do nothing;else delete from public.user_roles where user_id=p_id and role=new_role;end if;
 elsif p_action in ('redefinir_senha','confirmacao') then
 if p_action='redefinir_senha' then
 if exists(select 1 from public.user_roles where user_id=p_id and role='admin') and not exists(select 1 from public.user_roles ur join public.profiles pr on pr.id=ur.user_id where ur.role='admin' and pr.ativo and not pr.senha_pendente and pr.id<>p_id) then raise exception 'O último admin deve usar a recuperação pessoal, sem bloqueio administrativo';end if;
 update public.profiles set senha_pendente=true where id=p_id;
 elsif exists(select 1 from auth.users where id=p_id and email_confirmed_at is not null) then raise exception 'A conta já confirmou o e-mail';end if;
 select email into mail from auth.users where id=p_id;insert into public.email_outbox(destinatario,template,chave,payload) values(mail,'conta_admin','conta:'||gen_random_uuid(),jsonb_build_object('acao',p_action));insert into public.audit_log(ator_id,acao,tabela,registro_id,depois) values(auth.uid(),'SOLICITACAO_EMAIL_CONTA','profiles',p_id,p_data);
 else raise exception 'Ação inválida';end if;
 elsif p_kind='pedidos' then
 select * into l from public.leads where id=p_id for update;if not found then raise exception 'Pedido não encontrado';end if;
 if p_action='spam' then update public.leads set status='spam' where id=p_id;
 elsif p_action='reenviar' then select u.email,f.nome_fantasia into mail,new_slug from public.fornecedores f join auth.users u on u.id=f.dono_id where f.id=l.fornecedor_id;insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(l.fornecedor_id,mail,'novo_orcamento','reenvio:'||gen_random_uuid(),jsonb_build_object('empresa',new_slug,'lead_id',l.id));insert into public.audit_log(ator_id,acao,tabela,registro_id,depois) values(auth.uid(),'REENVIO','leads',p_id,'{}');
 elsif p_action='encaminhar' then
 if not coalesce((p_data->>'consentimento_confirmado')::boolean,false) or length(reason)<10 then raise exception 'Confirme autorização do solicitante e registre o motivo do encaminhamento';end if;
 if not private.is_supplier_public((p_data->>'fornecedor_id')::uuid) or (p_data->>'fornecedor_id')::uuid=l.fornecedor_id or not exists(select 1 from public.fornecedor_segmentos where fornecedor_id=(p_data->>'fornecedor_id')::uuid and segmento_id=l.segmento_id and deletado_em is null) then raise exception 'Escolha outro fornecedor publicado da mesma especialidade';end if;
 insert into public.consentimentos(user_id,email,documento,versao,origem) values(l.solicitante_id,l.email,'privacidade','2026-10-20','encaminhamento_admin_autorizado') returning id into cid;
 insert into public.audit_log(ator_id,acao,tabela,registro_id,depois) values(auth.uid(),'AUTORIZACAO_ENCAMINHAMENTO','leads',l.id,jsonb_build_object('fornecedor_id',p_data->>'fornecedor_id','motivo',reason));
 insert into public.leads(pedido_id,fornecedor_id,segmento_id,solicitante_id,nome,email,telefone,condominio_nome,cidade,uf,unidades,urgencia,mensagem,consentimento_id,origem) values(l.pedido_id,(p_data->>'fornecedor_id')::uuid,l.segmento_id,l.solicitante_id,l.nome,l.email,l.telefone,l.condominio_nome,l.cidade,l.uf,l.unidades,l.urgencia,l.mensagem,cid,'encaminhamento_admin') on conflict(pedido_id,fornecedor_id) do nothing returning id into p_id;
 if p_id is not null then select u.email,f.nome_fantasia into mail,new_slug from public.fornecedores f join auth.users u on u.id=f.dono_id where f.id=(p_data->>'fornecedor_id')::uuid;insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values((p_data->>'fornecedor_id')::uuid,mail,'novo_orcamento','lead:'||p_id,jsonb_build_object('empresa',new_slug,'lead_id',p_id));end if;
 else raise exception 'Ação inválida';end if;
 elsif p_kind='alteracoes' then
 select * into a from public.fornecedor_alteracoes where id=p_id for update;if not found or not a.pendente then raise exception 'Alteração já decidida';end if;
 if p_action='aprovar' then
 if a.campo='cnpj' and not private.valid_cnpj(a.depois) then raise exception 'CNPJ inválido';end if;if a.campo='nome_fantasia' and (length(a.depois) not between 2 and 120 or not private.text_safe(a.depois)) then raise exception 'Nome inválido';end if;if a.campo='logo_url' and not private.media_safe(a.depois,a.fornecedor_id) then raise exception 'Logo fora da pasta da empresa';end if;
 select slug into old_slug from public.fornecedores where id=a.fornecedor_id for update;execute format('update public.fornecedores set %I=$1 where id=$2',a.campo) using a.depois,a.fornecedor_id;
 if a.campo='nome_fantasia' then new_slug:=public.gerar_slug(a.depois)||'-'||left(a.fornecedor_id::text,8);update public.fornecedores set slug=new_slug where id=a.fornecedor_id;if old_slug is not null and old_slug<>new_slug then insert into public.slug_redirects(tipo,slug_antigo,slug_novo) values('fornecedor',old_slug,new_slug) on conflict(tipo,slug_antigo) do update set slug_novo=excluded.slug_novo;end if;end if;
 elsif p_action<>'recusar' then raise exception 'Ação inválida';elsif length(reason)<10 then raise exception 'Informe o motivo da recusa';end if;update public.fornecedor_alteracoes set pendente=false,decidido_por=auth.uid() where id=p_id;
 elsif p_kind='reivindicacoes' then
 select * into r from public.reivindicacoes where id=p_id for update;if not found or r.status<>'pendente' or length(reason)<10 then raise exception 'Pedido já decidido ou motivo ausente';end if;
 if p_action='aprovar' then update public.fornecedores set dono_id=r.solicitante_id,status='em_analise',verificado=false where id=r.fornecedor_id;update public.fornecedor_membros set ativo=false where fornecedor_id=r.fornecedor_id;insert into public.user_roles(user_id,role) values(r.solicitante_id,'fornecedor') on conflict do nothing;elsif p_action<>'recusar' then raise exception 'Ação inválida';end if;update public.reivindicacoes set status=case when p_action='aprovar' then 'aprovada' else 'recusada' end,decidido_por=auth.uid() where id=p_id;
 elsif p_kind='segmentos' then
 if p_action='salvar' then
 if length(trim(coalesce(p_data->>'nome',''))) not between 2 and 120 or not private.text_safe(p_data->>'nome') or (p_data->>'ordem')::integer not between 0 and 10000 then raise exception 'Especialidade inválida';end if;
 select * into s from public.segmentos where id=p_id for update;new_slug:=public.gerar_slug(p_data->>'nome');
 if found then update public.segmentos set nome=p_data->>'nome',slug=new_slug,grupo=coalesce(nullif(p_data->>'grupo',''),grupo),ordem=(p_data->>'ordem')::integer,ativo=coalesce((p_data->>'ativo')::boolean,true) where id=p_id;if s.slug<>new_slug then update public.segmento_redirects set slug_novo=new_slug where slug_novo=s.slug;insert into public.segmento_redirects(slug_antigo,slug_novo) values(s.slug,new_slug) on conflict(slug_antigo) do update set slug_novo=excluded.slug_novo;end if;
 else insert into public.segmentos(nome,slug,icone,grupo,ordem,ativo) values(p_data->>'nome',new_slug,'Building2',coalesce(p_data->>'grupo','moradia'),(p_data->>'ordem')::integer,coalesce((p_data->>'ativo')::boolean,true));end if;
 elsif p_action='mover' then
 select * into s from public.segmentos where id=p_id for update;
 if p_data ? 'alvo_id' then select * into neighbor from public.segmentos where id=(p_data->>'alvo_id')::uuid for update;
 elsif p_data->>'direcao'='subir' then select * into neighbor from public.segmentos where (ordem,id)<(s.ordem,s.id) order by ordem desc,id desc limit 1 for update;
 else select * into neighbor from public.segmentos where (ordem,id)>(s.ordem,s.id) order by ordem,id limit 1 for update;end if;
 if neighbor.id is not null then update public.segmentos set ordem=case when id=s.id then neighbor.ordem else s.ordem end where id in (s.id,neighbor.id);end if;
 elsif p_action='excluir' then if exists(select 1 from public.fornecedor_segmentos where segmento_id=p_id) or exists(select 1 from public.leads where segmento_id=p_id) then raise exception 'Especialidade em uso: desative em vez de excluir';end if;delete from public.segmentos where id=p_id;
 else raise exception 'Ação inválida';end if;
 elsif p_kind='configuracoes' then
 if p_action<>'salvar' or not exists(select 1 from public.configuracoes where id=p_id and chave in ('limites_cadastro','portal_contato','textos_institucionais','prazos_operacionais')) then raise exception 'Configuração não editável nesta fase';end if;
 if p_data->'valor' is null then raise exception 'Valor obrigatório';end if;
 if exists(select 1 from public.configuracoes where id=p_id and chave='limites_cadastro') and (not p_data->'valor' ?& array['fotos','servicos','cases','faqs','video','segmentos','membros','upload_mb','dias_completude'] or exists(select 1 from jsonb_each(p_data->'valor') x where key<>'video' and (value::text !~ '^[0-9]{1,3}$' or (value::text)::int not between 1 and 200))) then raise exception 'Limites inválidos';end if;
 if exists(select 1 from public.configuracoes where id=p_id and chave='prazos_operacionais') and (coalesce((p_data->'valor'->>'dias_teste')::int,0) not between 1 and 365 or coalesce((p_data->'valor'->>'horas_alerta')::int,0) not between 1 and 720) then raise exception 'Prazos inválidos';end if;
 update public.configuracoes set valor=p_data->'valor' where id=p_id;
 else raise exception 'Recurso inválido';end if;
 return jsonb_build_object('ok',true);end;$$;
create function private.admin_import(p_rows jsonb,p_commit boolean,p_batch uuid,p_invite boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare x jsonb;report jsonb:='[]';rownum integer;issue text;doc text;sid uuid;cid uuid;segid uuid;existing uuid;hash text;old private.admin_import_batches;begin
 perform private.admin_guard();if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>100 then raise exception 'O lote deve conter até 100 linhas';end if;
 hash:=encode(sha256(convert_to(p_rows::text||p_invite::text,'UTF8')),'hex');
 if p_commit then if p_batch is null then raise exception 'Identificador do lote obrigatório';end if;perform pg_advisory_xact_lock(hashtextextended(p_batch::text,37));select * into old from private.admin_import_batches where id=p_batch;if found then if old.ator_id<>auth.uid() or old.payload_hash<>hash then raise exception 'Lote já usado com outros dados';end if;return old.result;end if;end if;
 for x in select value from jsonb_array_elements(p_rows) loop
 rownum:=(x->>'linha')::integer;issue:='';cid:=null;segid:=null;doc:=regexp_replace(coalesce(x->>'cnpj',''),'\D','','g');
 if length(trim(coalesce(x->>'nome_fantasia',''))) not between 2 and 120 or not private.text_safe(x->>'nome_fantasia') then issue:='Nome inválido';elsif not private.valid_cnpj(doc) then issue:='CNPJ inválido';end if;
 select id into cid from public.cidades where uf=upper(x->>'uf') and lower(extensions.unaccent(nome))=lower(extensions.unaccent(x->>'cidade'));
 select id into segid from public.segmentos where ativo and (slug=x->>'segmento' or lower(extensions.unaccent(nome))=lower(extensions.unaccent(x->>'segmento')) or exists(select 1 from unnest(apelidos)a where lower(extensions.unaccent(a))=lower(extensions.unaccent(x->>'segmento')))) order by ordem limit 1;
 if issue='' and cid is null then issue:='Cidade/UF não encontrada';end if;if issue='' and segid is null then issue:='Especialidade não encontrada';end if;
 if issue='' and regexp_replace(coalesce(x->>'whatsapp',''),'\D','','g') !~ '^\d{10,11}$' then issue:='WhatsApp inválido';end if;
 if issue='' and coalesce(x->>'email','')<>'' and x->>'email' !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then issue:='E-mail inválido';end if;
 if issue='' and p_invite and coalesce(x->>'email','')='' then issue:='E-mail obrigatório para convite';end if;
 if issue='' and coalesce(x->>'site','')<>'' and (x->>'site' !~ '^https://[^/@[:space:]]+([/:?#]|$)' or x->>'site' ~ '^https://[^/]*@') then issue:='Site precisa usar HTTPS';end if;
 if issue='' and coalesce(x->>'instagram','') !~ '^[a-zA-Z0-9._]*$' then issue:='Instagram sem @ ou URL';end if;
 if issue='' and (select count(*) from jsonb_array_elements(p_rows)z where regexp_replace(z->>'cnpj','\D','','g')=doc)>1 then issue:='CNPJ repetido no lote';end if;
 if issue<>'' then report:=report||jsonb_build_array(jsonb_build_object('linha',rownum,'status','erro','mensagem',issue));continue;end if;
 perform pg_advisory_xact_lock(hashtextextended(doc,39));select id into existing from public.fornecedores where cnpj=doc;
 if existing is not null then report:=report||jsonb_build_array(jsonb_build_object('linha',rownum,'status','ignorado','mensagem','CNPJ já cadastrado'));continue;end if;
 if p_commit then
 insert into public.fornecedores(nome_fantasia,cnpj,whatsapp,email,site,instagram,cidade_id) values(trim(x->>'nome_fantasia'),doc,regexp_replace(x->>'whatsapp','\D','','g'),lower(coalesce(x->>'email','')),coalesce(x->>'site',''),coalesce(x->>'instagram',''),cid) returning id into sid;
 insert into public.fornecedor_segmentos(fornecedor_id,segmento_id) values(sid,segid);insert into public.cobertura(fornecedor_id,estado_uf,cidade_id) values(sid,upper(x->>'uf'),cid);
 if p_invite then perform private.admin_owner_invite(sid);end if;
 end if;
 report:=report||jsonb_build_array(jsonb_build_object('linha',rownum,'status',case when p_commit then 'criado' else 'valido' end,'mensagem',case when p_commit then 'Rascunho sem proprietário' else 'Pronto para importar' end));
 end loop;
 if p_commit then insert into private.admin_import_batches values(p_batch,auth.uid(),hash,report,now());insert into public.audit_log(ator_id,acao,tabela,registro_id,depois) values(auth.uid(),'IMPORTACAO_CSV','fornecedores',p_batch,report);end if;
 return report;end;$$;
create function private.accept_owner_invite(token text) returns uuid language plpgsql security definer set search_path='' as $$declare i public.convites_proprietario;sid uuid;begin
 if not private.is_active() then raise exception 'Entre em uma conta ativa';end if;select * into i from public.convites_proprietario where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') for update;
 if not found or i.usado_em is not null or i.revogado_em is not null or i.expira_em<=now() then raise exception 'Convite inválido ou expirado';end if;
 if not exists(select 1 from auth.users where id=auth.uid() and lower(email)=i.email) then raise exception 'Entre com o mesmo e-mail do convite';end if;
 select id into sid from public.fornecedores where id=i.fornecedor_id and dono_id is null for update;if sid is null then raise exception 'A empresa já tem proprietário';end if;
 if exists(select 1 from public.fornecedores where dono_id=auth.uid()) then raise exception 'Sua conta já é proprietária de outra empresa';end if;
 update public.fornecedores set dono_id=auth.uid() where id=sid;insert into public.user_roles(user_id,role) values(auth.uid(),'fornecedor') on conflict do nothing;update public.convites_proprietario set usado_em=now() where id=i.id;return sid;end;$$;
create function public.admin_listar(p_kind text,p_filters jsonb default '{}') returns jsonb language sql set search_path='' as $$select private.admin_list(p_kind,p_filters)$$;
create function public.admin_agir(p_kind text,p_id uuid,p_action text,p_data jsonb default '{}') returns jsonb language sql set search_path='' as $$select private.admin_action(p_kind,p_id,p_action,p_data)$$;
create function public.admin_importar(p_rows jsonb,p_commit boolean default false,p_batch uuid default null,p_invite boolean default false) returns jsonb language sql set search_path='' as $$select private.admin_import(p_rows,p_commit,p_batch,p_invite)$$;
create function public.aceitar_propriedade(token text) returns uuid language sql set search_path='' as $$select private.accept_owner_invite(token)$$;
create function private.segment_redirect(slug text) returns text language sql stable security definer set search_path='' as $$select r.slug_novo from public.segmento_redirects r join public.segmentos s on s.slug=r.slug_novo where r.slug_antigo=$1 and s.ativo$$;
create function public.redirecionamento_segmento(slug text) returns text language sql stable set search_path='' as $$select private.segment_redirect(slug)$$;
revoke all on function private.segment_redirect(text) from public;grant execute on function private.segment_redirect(text) to anon,authenticated;
revoke all on function private.admin_guard(),private.admin_list(text,jsonb),private.admin_owner_invite(uuid),private.admin_action(text,uuid,text,jsonb),private.admin_import(jsonb,boolean,uuid,boolean),private.accept_owner_invite(text),public.admin_listar(text,jsonb),public.admin_agir(text,uuid,text,jsonb),public.admin_importar(jsonb,boolean,uuid,boolean),public.aceitar_propriedade(text),public.redirecionamento_segmento(text) from public;
grant execute on function private.admin_list(text,jsonb),private.admin_action(text,uuid,text,jsonb),private.admin_import(jsonb,boolean,uuid,boolean),private.accept_owner_invite(text),public.admin_listar(text,jsonb),public.admin_agir(text,uuid,text,jsonb),public.admin_importar(jsonb,boolean,uuid,boolean),public.aceitar_propriedade(text) to authenticated;
grant execute on function public.redirecionamento_segmento(text) to anon,authenticated;
insert into public.configuracoes(chave,valor,publica) values('portal_contato','{"email":"","telefone":""}',false),('textos_institucionais','{"sobre":""}',false),('prazos_operacionais','{"dias_teste":90,"horas_alerta":48}',false) on conflict(chave) do nothing;

create or replace function private.save_supplier(sid uuid,step integer,data jsonb,version timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.fornecedores; lim jsonb; item jsonb; k text; v text; oldval text; n integer:=0;begin
 if not private.can_edit_supplier(sid) then raise exception 'Acesso negado';end if;
 select * into f from public.fornecedores where id=sid for update;
 if f.status not in ('rascunho','ajuste_solicitado','publicado') and not private.has_role(auth.uid(),'admin') then raise exception 'A edição está pausada durante a análise';end if;
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
 if f.status='publicado' and not private.has_role(auth.uid(),'admin') then
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
if kind='fornecedor' and not exists(select 1 from public.fornecedores where cnpj=regexp_replace(m->>'cnpj','\D','','g') and dono_id is null) then insert into public.fornecedores(dono_id,nome_fantasia,cnpj) values(new.id,m->>'empresa',regexp_replace(m->>'cnpj','\D','','g'));end if;return new;end$$;
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
 'verificado',f.verificado,'patrocinado',false,'nota',null,'avaliacoes',0)
 from public.fornecedores f left join public.cidades c on c.id=f.cidade_id
 where f.id=sid and private.is_supplier_public(f.id) and f.slug is not null;
$$;

create or replace function private.prepare_lead_reminders() returns integer language plpgsql security definer set search_path='' as $$declare l record;total integer:=0;begin
 for l in select x.id,x.fornecedor_id,f.nome_fantasia,u.email from public.leads x join public.fornecedores f on f.id=x.fornecedor_id join public.profiles p on p.id=f.dono_id join auth.users u on u.id=f.dono_id where x.status in ('novo','visto') and x.respondido_em is null and x.criado_em<=now()-interval '1 hour'*coalesce((select (valor->>'horas_alerta')::int from public.configuracoes where chave='prazos_operacionais'),48) and p.ativo for update of x skip locked loop
 update public.leads set status='sem_resposta' where id=l.id;
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(l.fornecedor_id,l.email,'orcamento_sem_resposta','48h:'||l.id,jsonb_build_object('empresa',l.nome_fantasia,'lead_id',l.id)) on conflict(chave) do nothing;total:=total+1;end loop;
 delete from private.quotation_requests r where r.criado_em<now()-interval '2 days' and not exists(select 1 from public.leads where pedido_id=r.id);
 return total;end;$$;

do $$begin if to_regclass('storage.objects') is not null then drop policy if exists supplier_media_insert on storage.objects;create policy supplier_media_insert on storage.objects for insert to authenticated with check(bucket_id='fornecedores' and private.can_edit_supplier((split_part(name,'/',1))::uuid) and (private.has_role(auth.uid(),'admin') or exists(select 1 from public.fornecedores where id=(split_part(name,'/',1))::uuid and status in ('rascunho','ajuste_solicitado','publicado'))));end if;end$$;
