-- Destructive schema reversal: disposable databases or reviewed restore procedure only.
-- Reverse newer migrations first. Backup required for business data.
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='effective_plan' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='plan_limits' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='sync_entitlements' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='billing_supplier_change' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='subscription_changed' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='quota_lead' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='unlock_lead' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='liberar_orcamento' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='billing_summary' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='resumo_plano' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='prepare_billing' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='processar_ciclo_planos' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='billing_order' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='preparar_checkout' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='service_guard' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='bind_checkout' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='vincular_checkout' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='stripe_event' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='aplicar_evento_stripe' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='billing_admin' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname='configurar_cobranca' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
do $drop$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='private'::regnamespace and proname='content_entitlements' loop execute 'drop function if exists '||f.sig||' cascade';end loop;end$drop$;
drop table if exists public.cortesias_materia cascade;
drop table if exists private.stripe_events cascade;
drop table if exists public.pagamentos cascade;
drop table if exists public.assinaturas cascade;
drop table if exists public.tabela_precos cascade;
drop table if exists public.planos cascade;
drop trigger if exists billing_supplier_change on public.fornecedores;
drop trigger if exists quota_lead on public.leads;
drop trigger if exists content_entitlements on public.midias;
drop trigger if exists content_entitlements on public.servicos;
drop trigger if exists content_entitlements on public.cases;
drop policy if exists leads_read on public.leads;
drop policy if exists notes_read on public.lead_notas;
alter table public.cases drop column if exists oculto_por_plano cascade;
alter table public.leads drop column if exists liberado_credito cascade;
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
create or replace function private.directory_search(p_segmento text,p_uf text,p_cidade text,p_q text,p_pagina integer,p_ordem text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
 declare needle text:=lower(extensions.unaccent(trim(coalesce(p_q,''))));result jsonb;begin
 if length(coalesce(p_q,''))>120 or p_pagina not between 1 and 10000 or p_ordem not in ('relevancia','nome') then raise exception 'Filtros de busca inválidos';end if;
 if length(p_segmento)>12000 or cardinality(string_to_array(p_segmento,','))>200 then raise exception 'Especialidades inválidas';end if;
 if p_segmento<>'' and exists(select 1 from unnest(string_to_array(p_segmento,',')) selected where not exists(select 1 from public.segmentos where slug=selected and ativo)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 if p_uf<>'' and not exists(select 1 from public.estados where uf=upper(p_uf)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 if p_cidade<>'' and not exists(select 1 from public.cidades where slug=p_cidade and uf=upper(p_uf)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 with matches as (
 select f.id,f.nome_fantasia,
 case when needle='' then 0 when strpos(lower(extensions.unaccent(f.nome_fantasia)),needle)>0 then 2 else 1 end relevance
 from public.fornecedores f where private.is_supplier_public(f.id) and f.slug is not null
 and (p_segmento='' or exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null and s.slug=any(string_to_array(p_segmento,',')) and s.ativo))
 and (p_uf='' or exists(select 1 from public.cobertura r where r.fornecedor_id=f.id and r.deletado_em is null and r.estado_uf=upper(p_uf)
 and (p_cidade='' or r.cidade_id is null or exists(select 1 from public.cidades cc where cc.id=r.cidade_id and cc.slug=p_cidade and cc.uf=upper(p_uf)))))
 and (needle='' or strpos(lower(extensions.unaccent(f.nome_fantasia||' '||f.descricao_curta)),needle)>0
 or exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null and s.ativo and strpos(lower(extensions.unaccent(s.nome||' '||array_to_string(s.apelidos,' '))),needle)>0)
 or (length(needle)>=4 and extensions.similarity(lower(extensions.unaccent(f.nome_fantasia)),needle)>.2))
 ),page as (select * from matches order by case when p_ordem='relevancia' then relevance else 0 end desc,nome_fantasia,id limit 24 offset (p_pagina-1)*24)
 select jsonb_build_object('items',coalesce((select jsonb_agg(private.directory_payload(id) order by case when p_ordem='relevancia' then relevance else 0 end desc,nome_fantasia,id) from page),'[]'),
 'total',(select count(*) from matches),'pagina',p_pagina,'paginas',ceil((select count(*) from matches)::numeric/24),'not_found',false) into result;
 return result;
 end;
$$;
