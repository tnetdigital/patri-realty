-- Destructive schema reversal: disposable databases or reviewed restore procedure only.
-- Reverse newer migrations first. Backup required for business data.
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='review_write' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='salvar_avaliacao' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='review_action' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='acao_avaliacao' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='review_list' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='listar_avaliacoes' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='record_event' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='registrar_evento' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='aggregate_metrics' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='agregar_metricas' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='metrics_summary' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='resumo_metricas' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='marketing_interest' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='interesse_marketing' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='marketing_list' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='listar_interesses' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='marketing_update' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='atualizar_interesse' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='review_score_changed' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='growth_jobs' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='rotinas_crescimento' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='ad_event_phase8' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
drop table if exists public.interesses_marketing cascade;
drop table if exists private.analytics_limits cascade;
drop table if exists public.metricas_diarias cascade;
drop table if exists public.eventos cascade;
drop table if exists public.avaliacoes cascade;
create or replace function private.ad_event(event_id uuid,bid uuid,event_type text,ip_hash text,consented boolean) returns jsonb language plpgsql security definer set search_path='' as $$declare prior private.banner_events;begin
 perform private.service_guard();if not consented then return '{"ignorado":true}';end if;
 if event_type not in ('impressao','clique') or coalesce(length(ip_hash),0)<>64 then raise exception 'Evento inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended(event_id::text,801));select * into prior from private.banner_events where id=event_id;if found then if prior.banner_id<>bid or prior.tipo<>event_type then raise exception 'Evento incompatível';end if;return '{"duplicado":true}';end if;
 perform pg_advisory_xact_lock(hashtextextended(ip_hash,802));if (select count(*) from private.ad_rate_limit r where r.ip_hash=ad_event.ip_hash and criado_em>now()-interval '1 hour')>=180 then raise exception 'LIMITE_HORA';end if;
 if not exists(select 1 from public.banners b where id=bid and private.banner_active(b)) then return '{"ignorado":true}';end if;
 insert into private.ad_rate_limit(ip_hash) values(ip_hash);insert into private.banner_events(id,banner_id,tipo) values(event_id,bid,event_type);
 insert into public.banner_metricas_diarias(banner_id,dia,impressoes,cliques) values(bid,(now() at time zone 'America/Sao_Paulo')::date,case when event_type='impressao' then 1 else 0 end,case when event_type='clique' then 1 else 0 end) on conflict(banner_id,dia) do update set impressoes=public.banner_metricas_diarias.impressoes+excluded.impressoes,cliques=public.banner_metricas_diarias.cliques+excluded.cliques;
 delete from private.ad_rate_limit where criado_em<now()-interval '2 days';delete from private.banner_events where criado_em<now()-interval '45 days';return '{"registrado":true}';end;$$;
create or replace function private.calcular_completude(sid uuid) returns integer language sql stable set search_path='' as $$select
 (case when logo_url<>'' then 10 else 0 end)+(case when capa_url<>'' then 10 else 0 end)+(case when descricao_curta<>'' then 10 else 0 end)+(case when length(sobre)>300 then 10 else 0 end)+
 (case when (select count(*) from public.midias where fornecedor_id=sid and deletado_em is null)>=5 then 10 else 0 end)+
 (case when (select count(*) from public.servicos where fornecedor_id=sid and deletado_em is null)>=3 then 10 else 0 end)+
 (case when exists(select 1 from public.cases where fornecedor_id=sid and deletado_em is null) then 10 else 0 end)+
 (case when (select count(*) from public.faqs where fornecedor_id=sid and deletado_em is null)>=3 then 5 else 0 end)+
 (case when exists(select 1 from public.cobertura where fornecedor_id=sid and deletado_em is null) then 10 else 0 end)+(case when instagram<>'' then 5 else 0 end)
 from public.fornecedores where id=sid$$;
create or replace function private.supplier_snapshot(sid uuid) returns jsonb language sql stable security definer set search_path='' as $$select to_jsonb(f)||jsonb_build_object(
 'cidade_nome',coalesce(c.nome,''),'estado',coalesce(c.uf,''),'ano_fundacao',coalesce(f.ano_fundacao::text,''),'slug',coalesce(f.slug,''),'cidade_id',coalesce(f.cidade_id::text,''),'avaliacoes_publicadas',0,
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
 'verificado',f.verificado and (private.plan_limits(f.id)->>'verificado')::bool,'patrocinado',false,'nota',null,'avaliacoes',0)
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
create or replace function public.reservar_emails_fornecedor() returns setof public.email_outbox language plpgsql security definer set search_path='' as $$begin
 -- Lease expires after ten minutes. Resend idempotency keys protect retried deliveries.
 update public.email_outbox set status='pendente' where status='processando' and atualizado_em<now()-interval '10 minutes' and tentativas<5;
 return query with candidates as (select id from public.email_outbox where status='pendente' and tentativas<5 order by criado_em limit 20 for update skip locked)
 update public.email_outbox e set status='processando',tentativas=tentativas+1 from candidates c where e.id=c.id returning e.*;
end$$;
