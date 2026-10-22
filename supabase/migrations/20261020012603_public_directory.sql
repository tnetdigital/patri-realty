-- Public projections explicitly allowlist fields. Private tables keep their existing RLS.
create table public.slug_redirects (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo='fornecedor'),
  slug_antigo text not null check(slug_antigo ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  slug_novo text not null check(slug_novo ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique(tipo,slug_antigo), check(slug_antigo<>slug_novo)
);
alter table public.slug_redirects enable row level security;
create policy redirects_admin on public.slug_redirects for all to authenticated
 using(private.has_role(auth.uid(),'admin')) with check(private.has_role(auth.uid(),'admin'));
grant select,insert,update on public.slug_redirects to authenticated;
create trigger set_atualizado_em before update on public.slug_redirects for each row execute function private.set_atualizado_em();
create trigger gravar_audit after insert or update on public.slug_redirects for each row execute function private.gravar_audit();
create index supplier_public_name on public.fornecedores using gin(nome_fantasia extensions.gin_trgm_ops) where status='publicado';
create index supplier_public_updated on public.fornecedores(atualizado_em) where status='publicado';
create index coverage_state_active on public.cobertura(estado_uf,cidade_id,fornecedor_id) where deletado_em is null;

create function private.is_supplier_public(sid uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.fornecedores f join public.profiles p on p.id=f.dono_id
 where f.id=sid and f.status='publicado' and p.ativo);
$$;

create function private.directory_payload(sid uuid) returns jsonb
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

create function private.directory_catalog(p_uf text) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'segmentos',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'nome',s.nome,'slug',s.slug,'icone',s.icone,
 'quantidade',(select count(*) from public.fornecedor_segmentos fs where fs.segmento_id=s.id and fs.deletado_em is null and private.is_supplier_public(fs.fornecedor_id))) order by s.ordem,s.nome)
 from public.segmentos s where s.ativo),'[]'),
 'estados',(select jsonb_agg(jsonb_build_object('uf',uf,'nome',nome) order by nome) from public.estados),
 'cidades',coalesce((select jsonb_agg(jsonb_build_object('id',id,'nome',nome,'uf',uf,'slug',slug) order by nome) from public.cidades where uf=upper(p_uf)),'[]'));
$$;

create function private.directory_search(p_segmento text,p_uf text,p_cidade text,p_q text,p_pagina integer,p_ordem text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
 declare needle text:=lower(extensions.unaccent(trim(coalesce(p_q,''))));result jsonb;begin
 if length(coalesce(p_q,''))>120 or p_pagina not between 1 and 10000 or p_ordem not in ('relevancia','nome') then raise exception 'Filtros de busca inválidos';end if;
 if p_segmento<>'' and not exists(select 1 from public.segmentos where slug=p_segmento and ativo) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 if p_uf<>'' and not exists(select 1 from public.estados where uf=upper(p_uf)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 if p_cidade<>'' and not exists(select 1 from public.cidades where slug=p_cidade and uf=upper(p_uf)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 with matches as (
 select f.id,f.nome_fantasia,
 case when needle='' then 0 when strpos(lower(extensions.unaccent(f.nome_fantasia)),needle)>0 then 2 else 1 end relevance
 from public.fornecedores f where private.is_supplier_public(f.id) and f.slug is not null
 and (p_segmento='' or exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null and s.slug=p_segmento and s.ativo))
 and (p_uf='' or exists(select 1 from public.cobertura r where r.fornecedor_id=f.id and r.deletado_em is null and r.estado_uf=upper(p_uf)
 and (p_cidade='' or r.cidade_id is null or exists(select 1 from public.cidades cc where cc.id=r.cidade_id and cc.slug=p_cidade and cc.uf=upper(p_uf)))))
 and (needle='' or strpos(lower(extensions.unaccent(f.nome_fantasia||' '||f.descricao_curta)),needle)>0
 or exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null and s.ativo and strpos(lower(extensions.unaccent(s.nome)),needle)>0)
 or (length(needle)>=4 and extensions.similarity(lower(extensions.unaccent(f.nome_fantasia)),needle)>.2))
 ),page as (select * from matches order by case when p_ordem='relevancia' then relevance else 0 end desc,nome_fantasia,id limit 24 offset (p_pagina-1)*24)
 select jsonb_build_object('items',coalesce((select jsonb_agg(private.directory_payload(id) order by case when p_ordem='relevancia' then relevance else 0 end desc,nome_fantasia,id) from page),'[]'),
 'total',(select count(*) from matches),'pagina',p_pagina,'paginas',ceil((select count(*) from matches)::numeric/24),'not_found',false) into result;
 return result;
 end;
$$;

create function private.directory_profile(p_slug text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$declare sid uuid;target text;begin
 select id into sid from public.fornecedores where slug=p_slug and private.is_supplier_public(id);
 if sid is not null then return jsonb_build_object('fornecedor',private.directory_payload(sid),'redirect',null);end if;
 select r.slug_novo into target from public.slug_redirects r join public.fornecedores f on f.slug=r.slug_novo
 where r.tipo='fornecedor' and r.slug_antigo=p_slug and private.is_supplier_public(f.id);
 return jsonb_build_object('fornecedor',null,'redirect',target);
 end;
$$;

create function private.directory_sitemap() returns jsonb
 language sql stable security definer set search_path='' as $$
 with visible as (select f.* from public.fornecedores f where private.is_supplier_public(f.id) and f.slug is not null),
 locations as (
 select distinct s.slug segment,c.uf,c.slug city from visible f
 join public.fornecedor_segmentos fs on fs.fornecedor_id=f.id and fs.deletado_em is null
 join public.segmentos s on s.id=fs.segmento_id and s.ativo
 join public.cobertura r on r.fornecedor_id=f.id and r.deletado_em is null
 join public.cidades c on (c.id=r.cidade_id or (r.cidade_id is null and c.uf=r.estado_uf))
 )
 select jsonb_build_object(
 'fornecedores',coalesce((select jsonb_agg(jsonb_build_object('slug',slug,'atualizado_em',atualizado_em) order by slug) from visible),'[]'),
 'segmentos',coalesce((select jsonb_agg(slug order by ordem) from public.segmentos where ativo),'[]'),
 'locais',coalesce((select jsonb_agg(jsonb_build_object('segmento',segment,'uf',uf,'cidade',city)) from locations),'[]'));
$$;

create function public.catalogo_guia(p_uf text default '') returns jsonb language sql stable set search_path='' as $$select private.directory_catalog(p_uf)$$;
create function public.buscar_fornecedores(p_segmento text default '',p_uf text default '',p_cidade text default '',p_q text default '',p_pagina integer default 1,p_ordem text default 'relevancia') returns jsonb language sql stable set search_path='' as $$select private.directory_search(p_segmento,p_uf,p_cidade,p_q,p_pagina,p_ordem)$$;
create function public.fornecedor_publico(p_slug text) returns jsonb language sql stable set search_path='' as $$select private.directory_profile(p_slug)$$;
create function public.sitemap_publico() returns jsonb language sql stable set search_path='' as $$select private.directory_sitemap()$$;
revoke all on function private.is_supplier_public(uuid),private.directory_payload(uuid),private.directory_catalog(text),private.directory_search(text,text,text,text,integer,text),private.directory_profile(text),private.directory_sitemap() from public;
grant execute on function private.directory_catalog(text),private.directory_search(text,text,text,text,integer,text),private.directory_profile(text),private.directory_sitemap() to anon,authenticated;
revoke all on function public.catalogo_guia(text),public.buscar_fornecedores(text,text,text,text,integer,text),public.fornecedor_publico(text),public.sitemap_publico() from public;
grant execute on function public.catalogo_guia(text),public.buscar_fornecedores(text,text,text,text,integer,text),public.fornecedor_publico(text),public.sitemap_publico() to anon,authenticated;
