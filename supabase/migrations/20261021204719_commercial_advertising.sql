-- Phase 8: manual commercial operations and time-safe placement reservations.
create extension if not exists btree_gist with schema extensions;
create table public.produtos_comerciais(id uuid primary key default gen_random_uuid(),codigo text unique not null,nome text not null,preco_centavos int not null default 0 check(preco_centavos>=0),ativo boolean not null default true,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
insert into public.produtos_comerciais(codigo,nome) values('banner','Banner'),('destaque','Destaque por especialidade e UF'),('materia','Matéria patrocinada'),('orcamentos','Pacote de orçamentos'),('plano','Plano');
create table public.banner_posicoes(id uuid primary key default gen_random_uuid(),slug text unique not null,nome text not null,largura int not null,altura int not null,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
insert into public.banner_posicoes(slug,nome,largura,altura) values('home_topo','Topo da home',1440,360),('home_meio','Meio da home',1200,320),('materia_meio','Na matéria',1000,300),('guia_topo','Topo do guia',1200,300),('segmento_topo','Topo da especialidade',1200,300);
create table public.contratos(id uuid primary key default gen_random_uuid(),fornecedor_id uuid references public.fornecedores(id),anunciante_nome text not null check(length(anunciante_nome) between 2 and 160),produto text not null references public.produtos_comerciais(codigo),valor_centavos int not null check(valor_centavos>=0),inicio timestamptz not null,fim timestamptz not null,status text not null default 'proposta' check(status in ('proposta','ativo','encerrado','cancelado')),pago boolean not null default false,renovacao_em date,observacao text not null default '',criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),check(fim>inicio));
create table public.banners(id uuid primary key default gen_random_uuid(),contrato_id uuid not null references public.contratos(id),anunciante_nome text not null,posicao_id uuid not null references public.banner_posicoes(id),imagem_desktop text not null,imagem_mobile text not null,link_destino text not null check(link_destino ~ '^https://'),segmento_id uuid references public.segmentos(id),uf text references public.estados(uf),inicio timestamptz not null,fim timestamptz not null,status text not null default 'rascunho' check(status in ('rascunho','ativo','pausado','encerrado')),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),check(fim>inicio));
create table public.destaques(id uuid primary key default gen_random_uuid(),contrato_id uuid not null references public.contratos(id),fornecedor_id uuid not null references public.fornecedores(id),segmento_id uuid not null references public.segmentos(id),uf text not null references public.estados(uf),cidade_id uuid references public.cidades(id),vaga int not null check(vaga between 1 and 3),inicio timestamptz not null,fim timestamptz not null,status text not null default 'ativo' check(status in ('ativo','pausado','encerrado')),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),check(fim>inicio),exclude using gist(segmento_id extensions.gist_uuid_ops with =,uf extensions.gist_text_ops with =,vaga extensions.gist_int4_ops with =,tstzrange(inicio,fim,'[)') with &&) where(status='ativo'));
create table public.banner_metricas_diarias(id uuid primary key default gen_random_uuid(),banner_id uuid not null references public.banners(id),dia date not null,impressoes bigint not null default 0,cliques bigint not null default 0,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),unique(banner_id,dia));
create table private.commercial_report_links(id uuid primary key default gen_random_uuid(),banner_id uuid not null unique references public.banners(id),token_hash text unique not null,expira_em timestamptz not null,criado_em timestamptz not null default now());
create table private.banner_events(id uuid primary key,banner_id uuid not null references public.banners(id),tipo text not null,criado_em timestamptz not null default now());
create table private.ad_rate_limit(id uuid primary key default gen_random_uuid(),ip_hash text not null,criado_em timestamptz not null default now());
create index on private.ad_rate_limit(ip_hash,criado_em);
create index on private.banner_events(banner_id,criado_em);
create index on public.contratos(fornecedor_id);
create index on public.contratos(produto);
create index on public.contratos(status,fim);
create index on public.banners(contrato_id);
create index on public.banners(posicao_id,status,inicio,fim);
create index on public.banners(segmento_id);
create index on public.banners(uf);
create index on public.destaques(contrato_id);
create index on public.destaques(fornecedor_id);
create index on public.destaques(cidade_id);
create function private.is_commercial() returns boolean language sql stable security definer set search_path='' as $$select private.has_role(auth.uid(),'admin') or private.has_role(auth.uid(),'comercial')$$;
do $$declare t text;begin foreach t in array array['produtos_comerciais','banner_posicoes','contratos','banners','destaques','banner_metricas_diarias'] loop execute format('alter table public.%I enable row level security',t);execute format('create trigger set_atualizado_em before update on public.%I for each row execute function private.set_atualizado_em()',t);if t<>'banner_metricas_diarias' then execute format('create trigger gravar_audit after insert or update or delete on public.%I for each row execute function private.gravar_audit()',t);end if;end loop;end$$;
alter table private.commercial_report_links enable row level security;
alter table private.banner_events enable row level security;
alter table private.ad_rate_limit enable row level security;
create policy commercial_products_read on public.produtos_comerciais for select to authenticated using((select private.is_commercial()));
create policy banner_positions_read on public.banner_posicoes for select to anon,authenticated using(true);
create policy contracts_read on public.contratos for select to authenticated using((select private.is_commercial()) or private.can_edit_supplier(fornecedor_id));
create policy banners_staff_read on public.banners for select to authenticated using((select private.is_commercial()));
create policy highlights_staff_read on public.destaques for select to authenticated using((select private.is_commercial()) or private.can_edit_supplier(fornecedor_id));
create policy banner_metrics_staff_read on public.banner_metricas_diarias for select to authenticated using((select private.is_commercial()));
grant select on public.banner_posicoes to anon,authenticated;
grant select on public.produtos_comerciais,public.contratos,public.banners,public.destaques,public.banner_metricas_diarias to authenticated;
create function private.commercial_active(cid uuid,at_date timestamptz default now()) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.contratos where id=cid and status='ativo' and inicio<=at_date and fim>at_date)$$;
create function private.banner_active(b public.banners) returns boolean language sql stable security definer set search_path='' as $$select b.status='ativo' and b.inicio<=now() and b.fim>now() and private.commercial_active(b.contrato_id)$$;
create function private.highlight_active(sid uuid,segments text,region text,city text default '') returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.destaques d join public.segmentos s on s.id=d.segmento_id where d.fornecedor_id=sid and d.status='ativo' and d.inicio<=now() and d.fim>now() and private.commercial_active(d.contrato_id) and private.is_supplier_public(sid) and s.ativo and (segments='' or s.slug=any(string_to_array(segments,','))) and (region='' or d.uf=upper(region)) and (d.cidade_id is null or city='' or exists(select 1 from public.cidades c where c.id=d.cidade_id and c.slug=city and c.uf=d.uf)))$$;
create function private.validate_campaign() returns trigger language plpgsql set search_path='' as $$declare c public.contratos;begin
 select * into c from public.contratos where id=new.contrato_id for share;
 if not found or c.produto<>(case when tg_table_name='banners' then 'banner' else 'destaque' end) or new.inicio<c.inicio or new.fim>c.fim then raise exception 'A campanha precisa de contrato compatível e período dentro da vigência';end if;
 if tg_table_name='destaques' then if c.fornecedor_id is distinct from new.fornecedor_id or not exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=new.fornecedor_id and fs.segmento_id=new.segmento_id and fs.deletado_em is null and s.ativo) then raise exception 'Fornecedor e especialidade não conferem com a reserva';end if;
 if new.cidade_id is not null and not exists(select 1 from public.cidades where id=new.cidade_id and uf=new.uf) then raise exception 'Cidade não pertence ao estado';end if;end if;return new;end;$$;
create trigger validate_campaign before insert or update on public.banners for each row execute function private.validate_campaign();
create trigger validate_campaign before insert or update on public.destaques for each row execute function private.validate_campaign();
create function private.save_commercial(kind text,rid uuid,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare nid uuid:=coalesce(rid,gen_random_uuid());begin
 if not private.is_commercial() then raise exception 'Acesso comercial negado';end if;
 if octet_length(p::text)>20000 or p::text ~ '[<>]' then raise exception 'Dados inválidos';end if;
 case kind
 when 'contrato' then
 insert into public.contratos(id,fornecedor_id,anunciante_nome,produto,valor_centavos,inicio,fim,status,pago,renovacao_em,observacao) values(nid,nullif(p->>'fornecedor_id','')::uuid,p->>'anunciante_nome',p->>'produto',(p->>'valor_centavos')::int,(p->>'inicio')::timestamptz,(p->>'fim')::timestamptz,p->>'status',coalesce((p->>'pago')::bool,false),nullif(p->>'renovacao_em','')::date,coalesce(p->>'observacao','')) on conflict(id) do update set fornecedor_id=excluded.fornecedor_id,anunciante_nome=excluded.anunciante_nome,produto=excluded.produto,valor_centavos=excluded.valor_centavos,inicio=excluded.inicio,fim=excluded.fim,status=excluded.status,pago=excluded.pago,renovacao_em=excluded.renovacao_em,observacao=excluded.observacao;
 if exists(select 1 from public.banners b join public.contratos c on c.id=b.contrato_id where c.id=nid and (c.produto<>'banner' or b.inicio<c.inicio or b.fim>c.fim)) or exists(select 1 from public.destaques d join public.contratos c on c.id=d.contrato_id where c.id=nid and (c.produto<>'destaque' or d.inicio<c.inicio or d.fim>c.fim or d.fornecedor_id is distinct from c.fornecedor_id)) then raise exception 'Contrato não pode invalidar campanhas vinculadas';end if;
 when 'banner' then
 if coalesce(p->>'imagem_desktop','') !~ '^https?://' or coalesce(p->>'imagem_mobile','') !~ '^https?://' or coalesce(p->>'link_destino','') !~ '^https://' or length(coalesce(p->>'anunciante_nome','')) not between 2 and 160 then raise exception 'Informe anunciante, imagens e destino HTTPS';end if;
 insert into public.banners(id,contrato_id,anunciante_nome,posicao_id,imagem_desktop,imagem_mobile,link_destino,segmento_id,uf,inicio,fim,status) values(nid,(p->>'contrato_id')::uuid,p->>'anunciante_nome',(p->>'posicao_id')::uuid,p->>'imagem_desktop',p->>'imagem_mobile',p->>'link_destino',nullif(p->>'segmento_id','')::uuid,nullif(p->>'uf',''),(p->>'inicio')::timestamptz,(p->>'fim')::timestamptz,p->>'status') on conflict(id) do update set contrato_id=excluded.contrato_id,anunciante_nome=excluded.anunciante_nome,posicao_id=excluded.posicao_id,imagem_desktop=excluded.imagem_desktop,imagem_mobile=excluded.imagem_mobile,link_destino=excluded.link_destino,segmento_id=excluded.segmento_id,uf=excluded.uf,inicio=excluded.inicio,fim=excluded.fim,status=excluded.status;
 when 'destaque' then
 insert into public.destaques(id,contrato_id,fornecedor_id,segmento_id,uf,cidade_id,vaga,inicio,fim,status) values(nid,(p->>'contrato_id')::uuid,(p->>'fornecedor_id')::uuid,(p->>'segmento_id')::uuid,p->>'uf',nullif(p->>'cidade_id','')::uuid,(p->>'vaga')::int,(p->>'inicio')::timestamptz,(p->>'fim')::timestamptz,p->>'status') on conflict(id) do update set contrato_id=excluded.contrato_id,fornecedor_id=excluded.fornecedor_id,segmento_id=excluded.segmento_id,uf=excluded.uf,cidade_id=excluded.cidade_id,vaga=excluded.vaga,inicio=excluded.inicio,fim=excluded.fim,status=excluded.status;
 when 'preco' then update public.produtos_comerciais set preco_centavos=(p->>'preco_centavos')::int,ativo=(p->>'ativo')::bool where id=rid;if not found then raise exception 'Produto não encontrado';end if;
 else raise exception 'Operação comercial inválida';end case;return nid;
 exception when exclusion_violation then raise exception 'Vaga já reservada neste período. Há no máximo três vagas por especialidade e UF';end;$$;
create function public.comercial_salvar(kind text,rid uuid,p jsonb) returns uuid language sql set search_path='' as $$select private.save_commercial(kind,rid,p)$$;
create function private.commercial_list(kind text,page_number int) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if not private.is_commercial() then raise exception 'Acesso comercial negado';end if;if page_number not between 1 and 10000 then raise exception 'Página inválida';end if;
 case kind
 when 'contratos' then select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.contratos order by criado_em desc,id limit 25 offset (page_number-1)*25)x),'[]'),'total',(select count(*) from public.contratos)) into result;
 when 'banners' then select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.banners order by criado_em desc,id limit 25 offset (page_number-1)*25)x),'[]'),'total',(select count(*) from public.banners)) into result;
 when 'destaques' then select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.destaques order by inicio desc,id limit 25 offset (page_number-1)*25)x),'[]'),'total',(select count(*) from public.destaques)) into result;
 when 'catalogo' then return jsonb_build_object('produtos',(select jsonb_agg(to_jsonb(x) order by nome) from public.produtos_comerciais x),'posicoes',(select jsonb_agg(to_jsonb(x)) from public.banner_posicoes x),'renovacoes',coalesce((select jsonb_agg(jsonb_build_object('id',id,'anunciante_nome',anunciante_nome,'fim',fim,'produto',produto)) from public.contratos where status='ativo' and fim>now() and fim<now()+interval '30 days'),'[]'));
 else raise exception 'Consulta comercial inválida';end case;return result;end;$$;
create function public.comercial_listar(kind text,page_number int default 1) returns jsonb language sql stable set search_path='' as $$select private.commercial_list(kind,page_number)$$;
create function private.public_banners(p_position text,p_segment text,p_region text) returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'anunciante_nome',b.anunciante_nome,'imagem_desktop',b.imagem_desktop,'imagem_mobile',b.imagem_mobile,'inicio',b.inicio,'fim',b.fim) order by b.id),'[]') from public.banners b join public.banner_posicoes p on p.id=b.posicao_id where p.slug=p_position and private.banner_active(b) and (b.segmento_id is null or exists(select 1 from public.segmentos s where s.id=b.segmento_id and s.ativo and s.slug=any(string_to_array(p_segment,',')))) and (b.uf is null or b.uf=upper(p_region))$$;
create function public.banners_publicos(p_position text,p_segment text default '',p_region text default '') returns jsonb language sql stable set search_path='' as $$select private.public_banners(p_position,p_segment,p_region)$$;
create function private.banner_destination(bid uuid) returns text language sql stable security definer set search_path='' as $$select link_destino from public.banners b where id=bid and private.banner_active(b)$$;
create function public.destino_banner(bid uuid) returns text language sql stable set search_path='' as $$select private.banner_destination(bid)$$;
create function private.ad_event(event_id uuid,bid uuid,event_type text,ip_hash text,consented boolean) returns jsonb language plpgsql security definer set search_path='' as $$declare prior private.banner_events;begin
 perform private.service_guard();if not consented then return '{"ignorado":true}';end if;
 if event_type not in ('impressao','clique') or coalesce(length(ip_hash),0)<>64 then raise exception 'Evento inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended(event_id::text,801));select * into prior from private.banner_events where id=event_id;if found then if prior.banner_id<>bid or prior.tipo<>event_type then raise exception 'Evento incompatível';end if;return '{"duplicado":true}';end if;
 perform pg_advisory_xact_lock(hashtextextended(ip_hash,802));if (select count(*) from private.ad_rate_limit r where r.ip_hash=ad_event.ip_hash and criado_em>now()-interval '1 hour')>=180 then raise exception 'LIMITE_HORA';end if;
 if not exists(select 1 from public.banners b where id=bid and private.banner_active(b)) then return '{"ignorado":true}';end if;
 insert into private.ad_rate_limit(ip_hash) values(ip_hash);insert into private.banner_events(id,banner_id,tipo) values(event_id,bid,event_type);
 insert into public.banner_metricas_diarias(banner_id,dia,impressoes,cliques) values(bid,(now() at time zone 'America/Sao_Paulo')::date,case when event_type='impressao' then 1 else 0 end,case when event_type='clique' then 1 else 0 end) on conflict(banner_id,dia) do update set impressoes=public.banner_metricas_diarias.impressoes+excluded.impressoes,cliques=public.banner_metricas_diarias.cliques+excluded.cliques;
 delete from private.ad_rate_limit where criado_em<now()-interval '2 days';delete from private.banner_events where criado_em<now()-interval '45 days';return '{"registrado":true}';end;$$;
create function public.registrar_evento_banner(event_id uuid,bid uuid,event_type text,ip_hash text,consented boolean) returns jsonb language sql set search_path='' as $$select private.ad_event(event_id,bid,event_type,ip_hash,consented)$$;
create function private.report_link(bid uuid,operation text) returns jsonb language plpgsql security definer set search_path='' as $$declare token text;begin
 if not private.is_commercial() then raise exception 'Acesso comercial negado';end if;if not exists(select 1 from public.banners where id=bid) then raise exception 'Banner não encontrado';end if;
 if operation not in ('gerar','revogar') then raise exception 'Operação inválida';end if;
 if operation='revogar' then delete from private.commercial_report_links where banner_id=bid;else
 token:=encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex');
 insert into private.commercial_report_links(banner_id,token_hash,expira_em) values(bid,encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '90 days') on conflict(banner_id) do update set token_hash=excluded.token_hash,expira_em=excluded.expira_em;end if;
 insert into public.audit_log(ator_id,acao,tabela,registro_id,depois) values(auth.uid(),case when operation='revogar' then 'REVOGAR_RELATORIO' else 'GERAR_RELATORIO' end,'banners',bid,'{"token":"oculto"}');
 return jsonb_build_object('token',token,'dias',90);end;$$;
create function public.link_relatorio(bid uuid,operation text default 'gerar') returns jsonb language sql set search_path='' as $$select private.report_link(bid,operation)$$;
create function private.advertiser_report(token text,date_from date,date_to date) returns jsonb language plpgsql stable security definer set search_path='' as $$declare bid uuid;banner public.banners;impressions bigint;clicks bigint;begin
 if date_from is null or date_to is null then return null;end if;
 if coalesce(token,'') !~ '^[a-f0-9]{64}$' or date_to<date_from or date_to-date_from>365 then return null;end if;
 select banner_id into bid from private.commercial_report_links where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and expira_em>now();if bid is null then return null;end if;
 select * into banner from public.banners where id=bid;
 select coalesce(sum(impressoes),0),coalesce(sum(cliques),0) into impressions,clicks from public.banner_metricas_diarias where banner_id=bid and dia between date_from and date_to;
 return jsonb_build_object('anunciante',banner.anunciante_nome,'inicio',banner.inicio,'fim',banner.fim,'de',date_from,'ate',date_to,'impressoes',impressions,'cliques',clicks,'ctr',case when impressions>0 then round(clicks*100.0/impressions,2) else 0 end,'diario',coalesce((select jsonb_agg(jsonb_build_object('dia',dia,'impressoes',impressoes,'cliques',cliques) order by dia) from public.banner_metricas_diarias where banner_id=bid and dia between date_from and date_to),'[]'));end;$$;
create function public.relatorio_anunciante(token text,date_from date,date_to date) returns jsonb language sql stable set search_path='' as $$select private.advertiser_report(token,date_from,date_to)$$;
create function private.commercial_reminders() returns integer language plpgsql security definer set search_path='' as $$declare c record;days int;total int:=0;begin
 perform private.service_guard();
 for c in select * from public.contratos where status='ativo' and fim>now() and fim<=now()+interval '30 days' loop
 days:=case when c.fim<=now()+interval '7 days' then 7 else 30 end;
 insert into public.email_outbox(destinatario,template,chave,payload) select u.email,'contrato_renovar','renovar:'||c.id||':'||c.fim::text||':'||days||':'||u.id,jsonb_build_object('empresa',c.anunciante_nome,'dia',days,'fim',c.fim) from auth.users u join public.profiles p on p.id=u.id where p.ativo and exists(select 1 from public.user_roles ur where ur.user_id=u.id and ur.role in ('admin','comercial')) on conflict(chave) do nothing;total:=total+1;end loop;
 for c in select d.id,d.fim,ct.anunciante_nome from public.destaques d join public.contratos ct on ct.id=d.contrato_id where d.status='ativo' and ct.status='ativo' and d.fim>now() and d.fim<=now()+interval '15 days' loop
 insert into public.email_outbox(destinatario,template,chave,payload) select u.email,'destaque_renovar','destaque:'||c.id||':'||c.fim::text||':'||u.id,jsonb_build_object('empresa',c.anunciante_nome,'dia',15,'fim',c.fim) from auth.users u join public.profiles p on p.id=u.id where p.ativo and exists(select 1 from public.user_roles ur where ur.user_id=u.id and ur.role in ('admin','comercial')) on conflict(chave) do nothing;end loop;
 update public.contratos set status='encerrado' where status='ativo' and fim<=now();return total;end;$$;
create function public.alertas_comerciais() returns integer language sql set search_path='' as $$select private.commercial_reminders()$$;
revoke all on function private.is_commercial(),private.commercial_active(uuid,timestamptz),private.banner_active(public.banners),private.highlight_active(uuid,text,text,text),private.validate_campaign(),private.save_commercial(text,uuid,jsonb),private.commercial_list(text,integer),private.public_banners(text,text,text),private.banner_destination(uuid),private.ad_event(uuid,uuid,text,text,boolean),private.report_link(uuid,text),private.advertiser_report(text,date,date),private.commercial_reminders() from public;
revoke all on function public.comercial_salvar(text,uuid,jsonb),public.comercial_listar(text,integer),public.banners_publicos(text,text,text),public.destino_banner(uuid),public.registrar_evento_banner(uuid,uuid,text,text,boolean),public.link_relatorio(uuid,text),public.relatorio_anunciante(text,date,date),public.alertas_comerciais() from public;
grant execute on function private.is_commercial(),private.public_banners(text,text,text),private.banner_destination(uuid),private.advertiser_report(text,date,date),public.banners_publicos(text,text,text),public.destino_banner(uuid),public.relatorio_anunciante(text,date,date) to anon,authenticated;
grant execute on function private.save_commercial(text,uuid,jsonb),private.commercial_list(text,integer),private.report_link(uuid,text),public.comercial_salvar(text,uuid,jsonb),public.comercial_listar(text,integer),public.link_relatorio(uuid,text) to authenticated;
grant execute on function private.ad_event(uuid,uuid,text,text,boolean),private.commercial_reminders(),public.registrar_evento_banner(uuid,uuid,text,text,boolean),public.alertas_comerciais() to service_role;

create or replace function private.directory_search(p_segmento text,p_uf text,p_cidade text,p_q text,p_pagina integer,p_ordem text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
 declare needle text:=lower(extensions.unaccent(trim(coalesce(p_q,''))));result jsonb;begin
 if length(coalesce(p_q,''))>120 or p_pagina not between 1 and 10000 or p_ordem not in ('relevancia','nome') then raise exception 'Filtros de busca inválidos';end if;
 if length(p_segmento)>12000 or cardinality(string_to_array(p_segmento,','))>200 then raise exception 'Especialidades inválidas';end if;
 if p_segmento<>'' and exists(select 1 from unnest(string_to_array(p_segmento,',')) selected where not exists(select 1 from public.segmentos where slug=selected and ativo)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 if p_uf<>'' and not exists(select 1 from public.estados where uf=upper(p_uf)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 if p_cidade<>'' and not exists(select 1 from public.cidades where slug=p_cidade and uf=upper(p_uf)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 with matches as (
 select f.id,f.nome_fantasia,private.highlight_active(f.id,p_segmento,p_uf,p_cidade) sponsored,coalesce((private.plan_limits(f.id)->>'prioridade')::int,0) priority,
 case when needle='' then 0 when strpos(lower(extensions.unaccent(f.nome_fantasia)),needle)>0 then 2 else 1 end relevance
 from public.fornecedores f where private.is_supplier_public(f.id) and f.slug is not null
 and (p_segmento='' or exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null and s.slug=any(string_to_array(p_segmento,',')) and s.ativo))
 and (p_uf='' or exists(select 1 from public.cobertura r where r.fornecedor_id=f.id and r.deletado_em is null and r.estado_uf=upper(p_uf)
 and (p_cidade='' or r.cidade_id is null or exists(select 1 from public.cidades cc where cc.id=r.cidade_id and cc.slug=p_cidade and cc.uf=upper(p_uf)))))
 and (needle='' or strpos(lower(extensions.unaccent(f.nome_fantasia||' '||f.descricao_curta)),needle)>0
 or exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null and s.ativo and strpos(lower(extensions.unaccent(s.nome||' '||array_to_string(s.apelidos,' '))),needle)>0)
 or (length(needle)>=4 and extensions.similarity(lower(extensions.unaccent(f.nome_fantasia)),needle)>.2))
 ),page as (select * from matches order by sponsored desc,case when p_ordem='relevancia' then priority else 0 end desc,case when p_ordem='relevancia' then relevance else 0 end desc,nome_fantasia,id limit 24 offset (p_pagina-1)*24)
 select jsonb_build_object('items',coalesce((select jsonb_agg((private.directory_payload(id)||jsonb_build_object('patrocinado',sponsored)) order by sponsored desc,case when p_ordem='relevancia' then priority else 0 end desc,case when p_ordem='relevancia' then relevance else 0 end desc,nome_fantasia,id) from page),'[]'),
 'total',(select count(*) from matches),'pagina',p_pagina,'paginas',ceil((select count(*) from matches)::numeric/24),'not_found',false) into result;
 return result;
 end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('banners','banners',true,5242880,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do nothing;
create policy commercial_media_read on storage.objects for select to authenticated using(bucket_id='banners' and (select private.is_commercial()));
create policy commercial_media_insert on storage.objects for insert to authenticated with check(bucket_id='banners' and (select private.is_commercial()));

notify pgrst, 'reload schema';
