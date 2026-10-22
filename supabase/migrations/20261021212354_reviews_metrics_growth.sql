-- Phase 9: moderated reputation, consented operational analytics and private marketing CRM.
create table public.avaliacoes(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id),autor_id uuid not null references public.profiles(id),nota int not null check(nota between 1 and 5),titulo text not null check(length(titulo) between 3 and 100),texto text not null check(length(texto) between 30 and 1000),condominio text not null default '' check(length(condominio)<=120),status text not null default 'pendente' check(status in ('pendente','publicada','removida')),resposta_fornecedor text not null default '',resposta_em timestamptz,denuncia_motivo text not null default '',motivo_moderacao text not null default '',criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),unique(fornecedor_id,autor_id));
create table public.eventos(id uuid primary key,tipo text not null,entidade text not null,entidade_id uuid not null,fornecedor_id uuid references public.fornecedores(id),segmento_id uuid references public.segmentos(id),uf text references public.estados(uf),sessao_anonima uuid not null,criado_em timestamptz not null default now());
create table public.metricas_diarias(id uuid primary key default gen_random_uuid(),data date not null,entidade text not null,entidade_id uuid not null,fornecedor_id uuid references public.fornecedores(id),tipo_evento text not null,quantidade bigint not null check(quantidade>=0),segmento_id uuid references public.segmentos(id),uf text references public.estados(uf),unique nulls not distinct(data,entidade,entidade_id,tipo_evento,segmento_id,uf));
create table private.analytics_limits(id uuid primary key default gen_random_uuid(),ip_hash text not null,criado_em timestamptz not null default now());
create index on private.analytics_limits(ip_hash,criado_em);
alter table private.analytics_limits enable row level security;
create table public.interesses_marketing(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id),autor_id uuid not null references public.profiles(id),servico text not null check(servico in ('perfil','redes','campanha','completo')),mensagem text not null default '' check(length(mensagem)<=1000),whatsapp text not null check(whatsapp ~ '^[0-9]{10,13}$'),status text not null default 'novo' check(status in ('novo','em_contato','proposta','fechado')),notas text not null default '',criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create unique index marketing_open_once on public.interesses_marketing(fornecedor_id,servico) where status<>'fechado';
create index on public.avaliacoes(autor_id);
create index on public.avaliacoes(status,criado_em);
create index on public.eventos(fornecedor_id,criado_em);
create index on public.eventos(segmento_id);
create index on public.eventos(uf);
create index on public.eventos(criado_em);
create index on public.metricas_diarias(fornecedor_id,data);
create index on public.metricas_diarias(segmento_id);
create index on public.metricas_diarias(uf);
create index on public.interesses_marketing(autor_id);
do $$declare t text;begin foreach t in array array['avaliacoes','eventos','metricas_diarias','interesses_marketing'] loop execute format('alter table public.%I enable row level security',t);if t in ('avaliacoes','interesses_marketing') then execute format('create trigger set_atualizado_em before update on public.%I for each row execute function private.set_atualizado_em()',t);execute format('create trigger gravar_audit after insert or update or delete on public.%I for each row execute function private.gravar_audit()',t);end if;end loop;end$$;
create policy reviews_private_read on public.avaliacoes for select to authenticated using(autor_id=(select auth.uid()) or private.can_edit_supplier(fornecedor_id) or private.has_role(auth.uid(),'admin'));
-- No direct event or CRM access; RPCs redact author IDs and internal notes.
create policy metrics_read on public.metricas_diarias for select to authenticated using((select private.is_commercial()) or (private.can_edit_supplier(fornecedor_id) and coalesce((private.plan_limits(fornecedor_id)->>'metricas')::bool,false)));
grant select on public.avaliacoes,public.metricas_diarias to authenticated;
create function private.review_write(sid uuid,rating int,title text,body text,condo text) returns uuid language plpgsql security definer set search_path='' as $$declare uid uuid:=auth.uid();f public.fornecedores;uemail text;company_domain text;nid uuid;begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and ativo) then raise exception 'Entre na sua conta para avaliar';end if;
 select email into uemail from auth.users where id=uid and email_confirmed_at is not null;if uemail is null then raise exception 'Confirme seu e-mail antes de avaliar';end if;
 select * into f from public.fornecedores where id=sid;if not found or not private.is_supplier_public(sid) then raise exception 'Fornecedor indisponível';end if;
 company_domain:=lower(split_part(f.email,'@',2));
 if private.can_edit_supplier(sid) or lower(f.email)=lower(uemail) or (company_domain<>'' and company_domain not in ('gmail.com','hotmail.com','outlook.com','yahoo.com','icloud.com','live.com','uol.com.br','bol.com.br') and company_domain=lower(split_part(uemail,'@',2))) then raise exception 'Você não pode avaliar uma empresa com a qual possui vínculo';end if;
 if rating not between 1 and 5 or rating is null or length(trim(title)) not between 3 and 100 or length(trim(body)) not between 30 and 1000 or length(coalesce(condo,''))>120 or not private.text_safe(title||body||coalesce(condo,'')) then raise exception 'Informe nota de 1 a 5, título e texto de 30 a 1.000 caracteres';end if;
 insert into public.avaliacoes(fornecedor_id,autor_id,nota,titulo,texto,condominio) values(sid,uid,rating,trim(title),trim(body),trim(coalesce(condo,''))) on conflict(fornecedor_id,autor_id) do update set nota=excluded.nota,titulo=excluded.titulo,texto=excluded.texto,condominio=excluded.condominio,status='pendente',resposta_fornecedor='',resposta_em=null,denuncia_motivo='',motivo_moderacao='' returning id into nid;return nid;end;$$;
create function public.salvar_avaliacao(sid uuid,rating int,title text,body text,condo text default '') returns uuid language sql set search_path='' as $$select private.review_write(sid,rating,title,body,condo)$$;
create function private.review_action(rid uuid,action text,body text) returns void language plpgsql security definer set search_path='' as $$declare r public.avaliacoes;begin
 select * into r from public.avaliacoes where id=rid for update;if not found then raise exception 'Avaliação indisponível';end if;
 if not private.text_safe(body) or length(coalesce(body,''))>1000 then raise exception 'Texto inválido';end if;
 case action
 when 'responder' then if not private.can_edit_supplier(r.fornecedor_id) then raise exception 'Acesso negado';end if;if not coalesce((private.plan_limits(r.fornecedor_id)->>'responder_avaliacoes')::bool,false) then raise exception 'Responder avaliações está disponível nos planos Premium e Destaque';end if;if r.status<>'publicada' or length(trim(body))<10 then raise exception 'Responda uma avaliação publicada com ao menos 10 caracteres';end if;update public.avaliacoes set resposta_fornecedor=trim(body),resposta_em=now() where id=rid;
 when 'denunciar' then if not private.can_edit_supplier(r.fornecedor_id) or r.status<>'publicada' then raise exception 'Acesso negado';end if;if length(trim(body))<10 then raise exception 'Explique a denúncia com ao menos 10 caracteres';end if;update public.avaliacoes set denuncia_motivo=trim(body) where id=rid;
 when 'publicar','remover','manter' then if not private.has_role(auth.uid(),'admin') then raise exception 'Somente admin pode moderar avaliações';end if;if action='remover' and length(trim(body))<10 then raise exception 'Informe o motivo da remoção';end if;if action='manter' and r.status<>'publicada' then raise exception 'Somente uma avaliação publicada pode ser mantida';end if;update public.avaliacoes set status=case when action='remover' then 'removida' else 'publicada' end,motivo_moderacao=case when action='remover' then body else '' end,denuncia_motivo='' where id=rid;
 else raise exception 'Ação inválida';end case;end;$$;
create function public.acao_avaliacao(rid uuid,action text,body text default '') returns void language sql set search_path='' as $$select private.review_action(rid,action,body)$$;
create function private.review_list(sid uuid,mode text,page_number int) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if page_number not between 1 and 10000 then raise exception 'Página inválida';end if;
 if mode in ('admin','pendentes','denunciadas') and not private.has_role(auth.uid(),'admin') then raise exception 'Acesso negado';end if;
 if mode='fornecedor' and not private.can_edit_supplier(sid) then raise exception 'Acesso negado';end if;
 if mode='minha' and auth.uid() is null then raise exception 'Entre na sua conta';end if;
 if mode not in ('publico','admin','pendentes','denunciadas','fornecedor','minha') then raise exception 'Filtro inválido';end if;
 with filtered as(select r.*,f.nome_fantasia empresa from public.avaliacoes r join public.fornecedores f on f.id=r.fornecedor_id where (mode in ('admin','pendentes','denunciadas') or r.fornecedor_id=sid) and (case mode when 'publico' then r.status='publicada' and private.is_supplier_public(sid) when 'minha' then r.autor_id=auth.uid() when 'pendentes' then r.status='pendente' when 'denunciadas' then r.denuncia_motivo<>'' else true end)),page as(select * from filtered order by criado_em desc,id limit 20 offset (page_number-1)*20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'fornecedor_id',fornecedor_id,'empresa',empresa,'nota',nota,'titulo',titulo,'texto',texto,'condominio',condominio,'status',status,'resposta_fornecedor',resposta_fornecedor,'resposta_em',resposta_em,'criado_em',criado_em)||case when mode='publico' then '{}'::jsonb else jsonb_build_object('denuncia_motivo',denuncia_motivo,'motivo_moderacao',motivo_moderacao) end) from page),'[]'),'total',(select count(*) from filtered),'media',(select round(avg(nota),1) from filtered where status='publicada'),'publicadas',(select count(*) from filtered where status='publicada')) into result;return result;end;$$;
create function public.listar_avaliacoes(sid uuid,mode text default 'publico',page_number int default 1) returns jsonb language sql stable set search_path='' as $$select private.review_list(sid,mode,page_number)$$;
create function private.record_event(eid uuid,etype text,target uuid,session_id uuid,ip_hash text,consented boolean,segment uuid default null,region text default '') returns jsonb language plpgsql security definer set search_path='' as $$declare sid uuid;entity text;seg uuid;state text;begin
 perform private.service_guard();if not consented then return '{"ignorado":true}';end if;
 if eid is null or session_id is null or length(coalesce(ip_hash,''))<>64 then raise exception 'Evento inválido';end if;
 if etype not in ('visualizacao_perfil','clique_whatsapp','clique_telefone','clique_site','clique_instagram','orcamento_enviado','visualizacao_materia','busca') then raise exception 'Evento inválido';end if;
 if etype='busca' then entity:='portal';target:='00000000-0000-4000-8000-000000000000';seg:=segment;state:=nullif(upper(region),'');if seg is not null and not exists(select 1 from public.segmentos where id=seg and ativo) then return '{"ignorado":true}';end if;
 elsif etype='visualizacao_materia' then entity:='materia';select fornecedor_id into sid from public.materias m where m.id=target and private.article_visible(m);if not found then return '{"ignorado":true}';end if;
 else entity:='fornecedor';sid:=target;if not private.is_supplier_public(sid) then return '{"ignorado":true}';end if;end if;
 if sid is not null then select segmento_id into seg from public.fornecedor_segmentos where fornecedor_id=sid and deletado_em is null order by segmento_id limit 1;select c.uf into state from public.fornecedores f left join public.cidades c on c.id=f.cidade_id where f.id=sid;end if;
 perform pg_advisory_xact_lock(hashtextextended(eid::text,901));if exists(select 1 from public.eventos where id=eid) then return '{"duplicado":true}';end if;
 perform pg_advisory_xact_lock(hashtextextended(ip_hash,902));if (select count(*) from private.analytics_limits l where l.ip_hash=record_event.ip_hash and criado_em>now()-interval '1 hour')>=300 then raise exception 'LIMITE_HORA';end if;
 insert into public.eventos(id,tipo,entidade,entidade_id,fornecedor_id,segmento_id,uf,sessao_anonima) values(eid,etype,entity,target,sid,seg,state,session_id);insert into private.analytics_limits(ip_hash) values(ip_hash);return '{"registrado":true}';end;$$;
create function public.registrar_evento(eid uuid,etype text,target uuid,session_id uuid,ip_hash text,consented boolean,segment uuid default null,region text default '') returns jsonb language sql set search_path='' as $$select private.record_event(eid,etype,target,session_id,ip_hash,consented,segment,region)$$;
create function private.aggregate_metrics() returns int language plpgsql security definer set search_path='' as $$declare n int;begin
 perform private.service_guard();perform pg_advisory_xact_lock(903);
 insert into public.metricas_diarias(data,entidade,entidade_id,fornecedor_id,tipo_evento,quantidade,segmento_id,uf) select (criado_em at time zone 'America/Sao_Paulo')::date,entidade,entidade_id,fornecedor_id,tipo,count(*),segmento_id,uf from public.eventos where criado_em>=(((now() at time zone 'America/Sao_Paulo')::date-90)::timestamp at time zone 'America/Sao_Paulo') group by 1,2,3,4,5,7,8 on conflict(data,entidade,entidade_id,tipo_evento,segmento_id,uf) do update set quantidade=excluded.quantidade;get diagnostics n=row_count;
 delete from private.analytics_limits where criado_em<now()-interval '2 days';delete from public.eventos where criado_em<(((now() at time zone 'America/Sao_Paulo')::date-90)::timestamp at time zone 'America/Sao_Paulo');return n;end;$$;
create function public.agregar_metricas() returns int language sql set search_path='' as $$select private.aggregate_metrics()$$;
create function private.metrics_summary(sid uuid,date_from date,date_to date) returns jsonb language plpgsql stable security definer set search_path='' as $$declare staff bool:=private.is_commercial();allowed bool;cur jsonb;prev jsonb;days int;begin
 if sid is null then if not staff then raise exception 'Acesso negado';end if;else if not staff and not private.can_edit_supplier(sid) then raise exception 'Acesso negado';end if;end if;
 allowed:=staff or coalesce((private.plan_limits(sid)->>'metricas')::bool,false);if not allowed then return '{"bloqueado":true,"atual":null,"anterior":null,"diario":[]}';end if;
 if date_from is null or date_to is null or date_to<date_from or date_to-date_from>365 then raise exception 'Selecione um intervalo de até 365 dias';end if;days:=date_to-date_from+1;
 select coalesce(jsonb_object_agg(tipo_evento,q),'{}') into cur from (select tipo_evento,sum(quantidade) q from public.metricas_diarias where (sid is null or fornecedor_id=sid) and data between date_from and date_to group by tipo_evento)x;
 select coalesce(jsonb_object_agg(tipo_evento,q),'{}') into prev from (select tipo_evento,sum(quantidade) q from public.metricas_diarias where (sid is null or fornecedor_id=sid) and data between date_from-days and date_from-1 group by tipo_evento)x;
 return jsonb_build_object('bloqueado',false,'atual',cur,'anterior',prev,'diario',coalesce((select jsonb_agg(jsonb_build_object('dia',data,'tipo',tipo_evento,'quantidade',q) order by data,tipo_evento) from (select data,tipo_evento,sum(quantidade) q from public.metricas_diarias where (sid is null or fornecedor_id=sid) and data between date_from and date_to group by data,tipo_evento)x),'[]'),'queda_visitas',case when coalesce((prev->>'visualizacao_perfil')::numeric,0)>0 then round((coalesce((cur->>'visualizacao_perfil')::numeric,0)/(prev->>'visualizacao_perfil')::numeric-1)*100,1) else null end,'de',date_from,'ate',date_to,'atualizado_em',now());end;$$;
create function public.resumo_metricas(sid uuid,date_from date,date_to date) returns jsonb language sql stable set search_path='' as $$select private.metrics_summary(sid,date_from,date_to)$$;
create function private.marketing_interest(sid uuid,service text,body text,phone text) returns uuid language plpgsql security definer set search_path='' as $$declare nid uuid;begin
 if not private.can_edit_supplier(sid) then raise exception 'Acesso negado';end if;
 if service not in ('perfil','redes','campanha','completo') or phone !~ '^[0-9]{10,13}$' or length(coalesce(body,''))>1000 or not private.text_safe(body) then raise exception 'Confira serviço, mensagem e WhatsApp';end if;
 insert into public.interesses_marketing(fornecedor_id,autor_id,servico,mensagem,whatsapp) values(sid,auth.uid(),service,coalesce(body,''),phone) returning id into nid;
 insert into public.email_outbox(destinatario,template,chave,payload) select u.email,'interesse_marketing','interesse:'||nid||':'||u.id,jsonb_build_object('empresa',f.nome_fantasia,'servico',service) from auth.users u join public.profiles p on p.id=u.id cross join public.fornecedores f where f.id=sid and p.ativo and exists(select 1 from public.user_roles ur where ur.user_id=u.id and ur.role in ('admin','comercial')) on conflict(chave) do nothing;return nid;
 exception when unique_violation then raise exception 'Já existe uma solicitação em andamento para este serviço';end;$$;
create function public.interesse_marketing(sid uuid,service text,body text,phone text) returns uuid language sql set search_path='' as $$select private.marketing_interest(sid,service,body,phone)$$;
create function private.marketing_list(sid uuid,page_number int) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if page_number not between 1 and 10000 or (sid is null and not private.is_commercial()) or (sid is not null and not private.is_commercial() and not private.can_edit_supplier(sid)) then raise exception 'Acesso negado';end if;
 return jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x)-'autor_id'||case when private.is_commercial() then '{}'::jsonb else '{"notas":""}'::jsonb end) from (select m.*,f.nome_fantasia empresa from public.interesses_marketing m join public.fornecedores f on f.id=m.fornecedor_id where sid is null or m.fornecedor_id=sid order by m.criado_em desc,m.id limit 20 offset (page_number-1)*20)x),'[]'),'total',(select count(*) from public.interesses_marketing where sid is null or fornecedor_id=sid));end;$$;
create function public.listar_interesses(sid uuid default null,page_number int default 1) returns jsonb language sql stable set search_path='' as $$select private.marketing_list(sid,page_number)$$;
create function private.marketing_update(rid uuid,new_status text,notes text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_commercial() then raise exception 'Acesso negado';end if;if new_status not in ('novo','em_contato','proposta','fechado') or length(coalesce(notes,''))>3000 or not private.text_safe(notes) then raise exception 'Dados inválidos';end if;update public.interesses_marketing set status=new_status,notas=coalesce(notes,'') where id=rid;if not found then raise exception 'Solicitação indisponível';end if;end;$$;
create function public.atualizar_interesse(rid uuid,new_status text,notes text default '') returns void language sql set search_path='' as $$select private.marketing_update(rid,new_status,notes)$$;
create function private.review_score_changed() returns trigger language plpgsql security definer set search_path='' as $$begin update public.fornecedores set completude=private.calcular_completude(new.fornecedor_id) where id=new.fornecedor_id;return new;end;$$;
create trigger review_score after insert or update on public.avaliacoes for each row execute function private.review_score_changed();
create function private.growth_jobs() returns int language plpgsql security definer set search_path='' as $$declare total int:=0;begin
 perform private.service_guard();perform private.aggregate_metrics();
 update public.fornecedores f set completude=private.calcular_completude(f.id) where completude is distinct from private.calcular_completude(f.id);
 -- The lead email is already held for this operational purpose; never returned by public review APIs.
 insert into public.email_outbox(destinatario,template,chave,payload) select l.email,'convite_avaliar','avaliar:'||l.id,jsonb_build_object('empresa',f.nome_fantasia,'slug',f.slug) from public.leads l join public.fornecedores f on f.id=l.fornecedor_id where l.criado_em<=now()-interval '15 days' and l.criado_em>now()-interval '45 days' and l.status not in ('spam','bloqueado_plano') and private.is_supplier_public(f.id) on conflict(chave) do nothing;get diagnostics total=row_count;
 if extract(day from now() at time zone 'America/Sao_Paulo')=1 then
 insert into public.email_outbox(destinatario,template,chave,payload) select u.email,'relatorio_mensal','metricas:'||f.id||':'||to_char(now(),'YYYY-MM'),jsonb_build_object('empresa',f.nome_fantasia,'mes',to_char(now()-interval '1 month','MM/YYYY'),'visitas',coalesce((select sum(quantidade) from public.metricas_diarias where fornecedor_id=f.id and tipo_evento='visualizacao_perfil' and data>=date_trunc('month',now()-interval '1 month')::date and data<date_trunc('month',now())::date),0)) from public.fornecedores f join auth.users u on u.id=f.dono_id join public.profiles p on p.id=u.id where p.ativo and coalesce((private.plan_limits(f.id)->>'metricas')::bool,false) on conflict(chave) do nothing;end if;return total;end;$$;
create function public.rotinas_crescimento() returns int language sql set search_path='' as $$select private.growth_jobs()$$;
-- Keep existing advertiser reports intact while also feeding the portal aggregate job.
alter function private.ad_event(uuid,uuid,text,text,boolean) rename to ad_event_phase8;
create or replace function private.ad_event_phase8(event_id uuid,bid uuid,event_type text,ip_hash text,consented boolean) returns jsonb language plpgsql security definer set search_path='' as $$declare prior private.banner_events;begin
 perform private.service_guard();if not consented then return '{"ignorado":true}';end if;
 if event_type not in ('impressao','clique') or coalesce(length(ip_hash),0)<>64 then raise exception 'Evento inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended(event_id::text,801));select * into prior from private.banner_events where id=event_id;if found then if prior.banner_id<>bid or prior.tipo<>event_type then raise exception 'Evento incompatível';end if;return '{"duplicado":true}';end if;
 perform pg_advisory_xact_lock(hashtextextended(ip_hash,802));if (select count(*) from private.ad_rate_limit r where r.ip_hash=ad_event_phase8.ip_hash and criado_em>now()-interval '1 hour')>=180 then raise exception 'LIMITE_HORA';end if;
 if not exists(select 1 from public.banners b where id=bid and private.banner_active(b)) then return '{"ignorado":true}';end if;
 insert into private.ad_rate_limit(ip_hash) values(ip_hash);insert into private.banner_events(id,banner_id,tipo) values(event_id,bid,event_type);
 insert into public.banner_metricas_diarias(banner_id,dia,impressoes,cliques) values(bid,(now() at time zone 'America/Sao_Paulo')::date,case when event_type='impressao' then 1 else 0 end,case when event_type='clique' then 1 else 0 end) on conflict(banner_id,dia) do update set impressoes=public.banner_metricas_diarias.impressoes+excluded.impressoes,cliques=public.banner_metricas_diarias.cliques+excluded.cliques;
 delete from private.ad_rate_limit where criado_em<now()-interval '2 days';delete from private.banner_events where criado_em<now()-interval '45 days';return '{"registrado":true}';end;$$;
create function private.ad_event(event_id uuid,bid uuid,event_type text,ip_hash text,consented boolean) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;sid uuid;begin
 perform private.service_guard();result:=private.ad_event_phase8(event_id,bid,event_type,ip_hash,consented);if result->>'registrado'='true' then select c.fornecedor_id into sid from public.banners b join public.contratos c on c.id=b.contrato_id where b.id=bid;
 insert into public.eventos(id,tipo,entidade,entidade_id,fornecedor_id,sessao_anonima) values(event_id,case when event_type='impressao' then 'impressao_banner' else 'clique_banner' end,'banner',bid,sid,event_id) on conflict(id) do nothing;end if;return result;end;$$;
revoke all on function private.review_write(uuid,int,text,text,text),private.review_action(uuid,text,text),private.review_list(uuid,text,int),private.record_event(uuid,text,uuid,uuid,text,boolean,uuid,text),private.aggregate_metrics(),private.metrics_summary(uuid,date,date),private.marketing_interest(uuid,text,text,text),private.marketing_list(uuid,int),private.marketing_update(uuid,text,text),private.review_score_changed(),private.growth_jobs(),private.ad_event(uuid,uuid,text,text,boolean) from public;
revoke all on function public.salvar_avaliacao(uuid,int,text,text,text),public.acao_avaliacao(uuid,text,text),public.listar_avaliacoes(uuid,text,int),public.registrar_evento(uuid,text,uuid,uuid,text,boolean,uuid,text),public.agregar_metricas(),public.resumo_metricas(uuid,date,date),public.interesse_marketing(uuid,text,text,text),public.listar_interesses(uuid,int),public.atualizar_interesse(uuid,text,text),public.rotinas_crescimento() from public;
grant execute on function private.review_write(uuid,int,text,text,text),private.review_action(uuid,text,text),private.metrics_summary(uuid,date,date),private.marketing_interest(uuid,text,text,text),private.marketing_list(uuid,int),private.marketing_update(uuid,text,text),public.salvar_avaliacao(uuid,int,text,text,text),public.acao_avaliacao(uuid,text,text),public.resumo_metricas(uuid,date,date),public.interesse_marketing(uuid,text,text,text),public.listar_interesses(uuid,int),public.atualizar_interesse(uuid,text,text) to authenticated;
grant execute on function private.review_list(uuid,text,int),public.listar_avaliacoes(uuid,text,int) to anon,authenticated;
grant execute on function private.record_event(uuid,text,uuid,uuid,text,boolean,uuid,text),private.aggregate_metrics(),private.growth_jobs(),private.ad_event(uuid,uuid,text,text,boolean),public.registrar_evento(uuid,text,uuid,uuid,text,boolean,uuid,text),public.agregar_metricas(),public.rotinas_crescimento() to service_role;
notify pgrst,'reload schema';

create or replace function private.calcular_completude(sid uuid) returns integer language sql stable set search_path='' as $$select
 (case when logo_url<>'' then 10 else 0 end)+(case when capa_url<>'' then 10 else 0 end)+(case when descricao_curta<>'' then 10 else 0 end)+(case when length(sobre)>300 then 10 else 0 end)+
 (case when (select count(*) from public.midias where fornecedor_id=sid and deletado_em is null)>=5 then 10 else 0 end)+
 (case when (select count(*) from public.servicos where fornecedor_id=sid and deletado_em is null)>=3 then 10 else 0 end)+
 (case when exists(select 1 from public.cases where fornecedor_id=sid and deletado_em is null) then 10 else 0 end)+
 (case when (select count(*) from public.faqs where fornecedor_id=sid and deletado_em is null)>=3 then 5 else 0 end)+
 (case when exists(select 1 from public.cobertura where fornecedor_id=sid and deletado_em is null) then 10 else 0 end)+(case when instagram<>'' then 5 else 0 end)
 +(case when (select count(*) from public.avaliacoes where fornecedor_id=sid and status='publicada')>=3 then 10 else 0 end)
 from public.fornecedores where id=sid$$;
create or replace function private.supplier_snapshot(sid uuid) returns jsonb language sql stable security definer set search_path='' as $$select to_jsonb(f)||jsonb_build_object(
 'cidade_nome',coalesce(c.nome,''),'estado',coalesce(c.uf,''),'ano_fundacao',coalesce(f.ano_fundacao::text,''),'slug',coalesce(f.slug,''),'cidade_id',coalesce(f.cidade_id::text,''),'avaliacoes_publicadas',(select count(*) from public.avaliacoes where fornecedor_id=sid and status='publicada'),
 'segmentos',coalesce((select jsonb_agg(segmento_id) from public.fornecedor_segmentos where fornecedor_id=sid and deletado_em is null),'[]'),
 'cobertura',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'uf',r.estado_uf,'cidade_id',r.cidade_id,'cidade_nome',coalesce(cc.nome,''))) from public.cobertura r left join public.cidades cc on cc.id=r.cidade_id where r.fornecedor_id=sid and r.deletado_em is null),'[]'),
 'servicos',coalesce((select jsonb_agg(to_jsonb(s) order by ordem) from public.servicos s where fornecedor_id=sid and deletado_em is null),'[]'),
 'midias',coalesce((select jsonb_agg(to_jsonb(s) order by ordem) from public.midias s where fornecedor_id=sid and deletado_em is null),'[]'),
 'cases',coalesce((select jsonb_agg(to_jsonb(s) order by ordem) from public.cases s where fornecedor_id=sid and deletado_em is null),'[]'),
 'faqs',coalesce((select jsonb_agg(to_jsonb(s) order by ordem) from public.faqs s where fornecedor_id=sid and deletado_em is null),'[]'),
 'alteracoes_pendentes',coalesce((select jsonb_agg(jsonb_build_object('campo',campo,'depois',depois)) from public.fornecedor_alteracoes where fornecedor_id=sid and pendente),'[]'))
 from public.fornecedores f left join public.cidades c on c.id=f.cidade_id where f.id=sid and private.can_edit_supplier(sid)$$;
create or replace function private.directory_payload(sid uuid) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'id',f.id,'slug',f.slug,'nome_fantasia',f.nome_fantasia,
 'descricao_curta',f.descricao_curta,'sobre',f.sobre,'ano_fundacao',f.ano_fundacao,
 'logo_url',f.logo_url,'logo_thumb_url',f.logo_thumb_url,'capa_url',f.capa_url,
 'whatsapp',f.whatsapp,'telefone',f.telefone,'site',f.site,'instagram',f.instagram,
 'endereco',f.endereco,'cep',f.cep,'video_url',case when (private.plan_limits(f.id)->>'video')::bool then f.video_url else '' end,
 'certificacoes',f.certificacoes,'instagram_posts',f.instagram_posts,'atualizado_em',f.atualizado_em,
 'cidade',case when c.id is not null then jsonb_build_object('id',c.id,'nome',c.nome,'uf',c.uf,'slug',c.slug) else null end,
 'segmentos',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'nome',s.nome,'slug',s.slug,'icone',s.icone) order by s.ordem,s.nome)
 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id
 where fs.fornecedor_id=f.id and fs.deletado_em is null and s.ativo),'[]'),
 'cobertura',coalesce((select jsonb_agg(jsonb_build_object('uf',r.estado_uf,'cidade_id',r.cidade_id,'cidade_nome',coalesce(cc.nome,''),'cidade_slug',coalesce(cc.slug,'')))
 from public.cobertura r left join public.cidades cc on cc.id=r.cidade_id where r.fornecedor_id=f.id and r.deletado_em is null),'[]'),
 'servicos',coalesce((select jsonb_agg(jsonb_build_object('id',id,'titulo',titulo,'descricao',descricao,'foto_url',foto_url) order by ordem)
 from (select * from public.servicos where fornecedor_id=f.id and deletado_em is null order by ordem,criado_em,id limit (private.plan_limits(f.id)->>'servicos')::int) ranked where true),'[]'),
 'midias',coalesce((select jsonb_agg(jsonb_build_object('id',id,'url',url,'legenda',legenda) order by ordem)
 from (select * from public.midias where fornecedor_id=f.id and deletado_em is null order by ordem,criado_em,id limit (private.plan_limits(f.id)->>'fotos')::int) ranked where true and tipo='foto'),'[]'),
 'cases',coalesce((select jsonb_agg(jsonb_build_object('id',id,'condominio',condominio,'descricao',descricao,'foto_url',foto_url) order by ordem)
 from (select * from public.cases where fornecedor_id=f.id and deletado_em is null order by ordem,criado_em,id limit (private.plan_limits(f.id)->>'cases')::int) ranked where true),'[]'),
 'faqs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'pergunta',pergunta,'resposta',resposta) order by ordem)
 from public.faqs where fornecedor_id=f.id and deletado_em is null),'[]'),
 'verificado',f.verificado and (private.plan_limits(f.id)->>'verificado')::bool,'patrocinado',false,'nota',(select round(avg(nota),1) from public.avaliacoes where fornecedor_id=sid and status='publicada'),'avaliacoes',(select count(*) from public.avaliacoes where fornecedor_id=sid and status='publicada'))
 from public.fornecedores f left join public.cidades c on c.id=f.cidade_id
 where f.id=sid and private.is_supplier_public(f.id) and f.slug is not null;
$$;

create or replace function private.directory_search(p_segmento text,p_uf text,p_cidade text,p_q text,p_pagina integer,p_ordem text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
 declare needle text:=lower(extensions.unaccent(trim(coalesce(p_q,''))));result jsonb;begin
 if length(coalesce(p_q,''))>120 or p_pagina not between 1 and 10000 or p_ordem not in ('relevancia','nome') then raise exception 'Filtros de busca inválidos';end if;
 if length(p_segmento)>12000 or cardinality(string_to_array(p_segmento,','))>200 then raise exception 'Especialidades inválidas';end if;
 if p_segmento<>'' and exists(select 1 from unnest(string_to_array(p_segmento,',')) selected where not exists(select 1 from public.segmentos where slug=selected and ativo)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 if p_uf<>'' and not exists(select 1 from public.estados where uf=upper(p_uf)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 if p_cidade<>'' and not exists(select 1 from public.cidades where slug=p_cidade and uf=upper(p_uf)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 with matches as (
 select f.id,f.nome_fantasia,private.highlight_active(f.id,p_segmento,p_uf,p_cidade) sponsored,coalesce((select avg(r.nota) from public.avaliacoes r where r.fornecedor_id=f.id and r.status='publicada'),0) rating,coalesce((private.plan_limits(f.id)->>'prioridade')::int,0) priority,
 case when needle='' then 0 when strpos(lower(extensions.unaccent(f.nome_fantasia)),needle)>0 then 2 else 1 end relevance
 from public.fornecedores f where private.is_supplier_public(f.id) and f.slug is not null
 and (p_segmento='' or exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null and s.slug=any(string_to_array(p_segmento,',')) and s.ativo))
 and (p_uf='' or exists(select 1 from public.cobertura r where r.fornecedor_id=f.id and r.deletado_em is null and r.estado_uf=upper(p_uf)
 and (p_cidade='' or r.cidade_id is null or exists(select 1 from public.cidades cc where cc.id=r.cidade_id and cc.slug=p_cidade and cc.uf=upper(p_uf)))))
 and (needle='' or strpos(lower(extensions.unaccent(f.nome_fantasia||' '||f.descricao_curta)),needle)>0
 or exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null and s.ativo and strpos(lower(extensions.unaccent(s.nome||' '||array_to_string(s.apelidos,' '))),needle)>0)
 or (length(needle)>=4 and extensions.similarity(lower(extensions.unaccent(f.nome_fantasia)),needle)>.2))
 ),page as (select * from matches order by sponsored desc,case when p_ordem='relevancia' then priority else 0 end desc,case when p_ordem='relevancia' then relevance else 0 end desc,rating desc,nome_fantasia,id limit 24 offset (p_pagina-1)*24)
 select jsonb_build_object('items',coalesce((select jsonb_agg((private.directory_payload(id)||jsonb_build_object('patrocinado',sponsored)) order by sponsored desc,case when p_ordem='relevancia' then priority else 0 end desc,case when p_ordem='relevancia' then relevance else 0 end desc,rating desc,nome_fantasia,id) from page),'[]'),
 'total',(select count(*) from matches),'pagina',p_pagina,'paginas',ceil((select count(*) from matches)::numeric/24),'not_found',false) into result;
 return result;
 end;
$$;
-- Transactional notifications must not wait behind monthly/commercial summaries.
create or replace function public.reservar_emails_fornecedor() returns setof public.email_outbox language plpgsql security definer set search_path='' as $$begin
 perform private.service_guard();
 update public.email_outbox set status='pendente' where status='processando' and atualizado_em<now()-interval '10 minutes' and tentativas<5;
 return query with candidates as (select id from public.email_outbox where status='pendente' and tentativas<5 order by case when template in ('novo_orcamento','orcamento_confirmado','convite_equipe','convite_proprietario','conta_admin','decisao_fornecedor','perfil_em_analise','newsletter_confirmar') then 0 when template='interesse_marketing' then 1 else 2 end,criado_em,id limit 20 for update skip locked)
 update public.email_outbox e set status='processando',tentativas=tentativas+1 from candidates c where e.id=c.id returning e.*;
end$$;
notify pgrst,'reload schema';
