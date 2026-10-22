-- Phase 7: editorial workflow, month reservations, public projections and double opt-in.
create table public.categorias(id uuid primary key default gen_random_uuid(),nome text not null check(length(nome) between 2 and 100),slug text unique not null,ativa boolean not null default true,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
insert into public.categorias(nome,slug) values('Gestão condominial','gestao-condominial'),('Manutenção','manutencao'),('Segurança','seguranca'),('Sustentabilidade','sustentabilidade');
create table public.portais_parceiros(id uuid primary key default gen_random_uuid(),nome text not null,url text not null check(url ~ '^https://'),vagas_por_mes integer not null default 1 check(vagas_por_mes between 0 and 10000),ativo boolean not null default true,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.materias(id uuid primary key default gen_random_uuid(),titulo text not null default '',slug text unique not null,resumo text not null default '',corpo jsonb not null default '[]',imagem_capa text not null default '',categoria_id uuid references public.categorias(id),autor_id uuid not null references public.profiles(id),tipo text not null check(tipo in ('editorial','patrocinada','fornecedor')),fornecedor_id uuid references public.fornecedores(id),portal_id uuid references public.portais_parceiros(id),status text not null default 'rascunho' check(status in ('rascunho','em_revisao','ajuste','recusada','agendada','publicada','arquivada')),publicada_em timestamptz,agendada_em timestamptz,seo_titulo text not null default '',seo_descricao text not null default '',canonical_url text not null default '',tempo_leitura integer not null default 1,motivo text not null default '',primeiro_envio_em timestamptz,versao integer not null default 1,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),check((tipo='fornecedor')=(fornecedor_id is not null)));
create table public.materia_consumos(id uuid primary key default gen_random_uuid(),materia_id uuid unique not null references public.materias(id),fornecedor_id uuid not null references public.fornecedores(id),mes date not null,origem text not null check(origem in ('mensal','cortesia')),portal_id uuid references public.portais_parceiros(id),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create index on public.materia_consumos(fornecedor_id,mes);
create index on public.materia_consumos(portal_id,mes);
create table public.materia_entregas(id uuid primary key default gen_random_uuid(),materia_id uuid unique not null references public.materias(id),portal_id uuid not null references public.portais_parceiros(id),url_externa text not null check(url_externa ~ '^https://'),canonical_url text not null,entregue_em timestamptz not null default now(),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.revistas(id uuid primary key default gen_random_uuid(),titulo text not null,edicao text not null,slug text unique not null,capa_url text not null default '',link_digital text not null default '',publicada_em timestamptz,status text not null default 'rascunho' check(status in ('rascunho','publicada','arquivada')),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.pautas(id uuid primary key default gen_random_uuid(),titulo text not null,responsavel_id uuid references public.profiles(id),data_prevista date,status text not null default 'ideia' check(status in ('ideia','escrevendo','revisao','publicada')),observacoes text not null default '',criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.conteudo_redirects(id uuid primary key default gen_random_uuid(),tipo text not null,slug_antigo text not null,slug_novo text not null,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),unique(tipo,slug_antigo));
create table public.newsletter_inscritos(id uuid primary key default gen_random_uuid(),email text unique not null,nome text not null,cidade text not null default '',perfil text not null default '',confirmado boolean not null default false,confirmado_em timestamptz,descadastrado_em timestamptz,token_confirmacao_hash text not null,token_descadastro_hash text,expira_em timestamptz not null,ultimo_envio_em timestamptz not null default now(),origem text not null default 'portal',criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table private.newsletter_attempts(id uuid primary key default gen_random_uuid(),ip_hash text not null,criado_em timestamptz not null default now());
alter table private.newsletter_attempts enable row level security;
create index on private.newsletter_attempts(ip_hash,criado_em);
create index on public.materias(fornecedor_id,criado_em);
create index on public.materias(autor_id);
create index on public.materias(categoria_id,status,publicada_em);
create index on public.materias(portal_id);
create index on public.materias(status,agendada_em);
create index on public.materia_entregas(portal_id);
create index on public.pautas(responsavel_id);
create function private.is_editor() returns boolean language sql stable security definer set search_path='' as $$select private.has_role(auth.uid(),'admin') or private.has_role(auth.uid(),'editor')$$;
create function private.article_visible(m public.materias) returns boolean language sql stable security definer set search_path='' as $$select m.status='publicada' and m.publicada_em<=now() and (m.fornecedor_id is null or private.is_supplier_public(m.fornecedor_id))$$;
do $$declare t text;begin foreach t in array array['categorias','portais_parceiros','materias','materia_consumos','materia_entregas','revistas','pautas','conteudo_redirects','newsletter_inscritos'] loop execute format('alter table public.%I enable row level security',t);execute format('create trigger set_atualizado_em before update on public.%I for each row execute function private.set_atualizado_em()',t);if t<>'newsletter_inscritos' then execute format('create trigger gravar_audit after insert or update or delete on public.%I for each row execute function private.gravar_audit()',t);end if;end loop;end$$;
create policy categories_read on public.categorias for select to anon,authenticated using(ativa or (select private.is_editor()));
create policy portals_read on public.portais_parceiros for select to authenticated using((select private.is_editor()) or (ativo and (select private.has_role((select auth.uid()),'fornecedor'))));
create policy articles_private_read on public.materias for select to authenticated using((select private.is_editor()) or private.can_edit_supplier(fornecedor_id));
create policy consumption_read on public.materia_consumos for select to authenticated using((select private.is_editor()) or private.can_edit_supplier(fornecedor_id));
create policy deliveries_read on public.materia_entregas for select to authenticated using((select private.is_editor()) or exists(select 1 from public.materias m where m.id=materia_id and private.can_edit_supplier(m.fornecedor_id)));
create policy magazines_read on public.revistas for select to anon,authenticated using((status='publicada' and publicada_em<=now()) or (select private.is_editor()));
create policy topics_read on public.pautas for select to authenticated using((select private.is_editor()));
create policy content_redirects_read on public.conteudo_redirects for select to authenticated using((select private.is_editor()));
create policy newsletter_staff_read on public.newsletter_inscritos for select to authenticated using((select private.is_editor()));
grant select on public.categorias,public.revistas to anon,authenticated;
grant select on public.portais_parceiros,public.materias,public.materia_consumos,public.materia_entregas,public.pautas to authenticated;
-- Tokens and subscriber hashes are excluded from browser column grants and audit payloads.
grant select(id,email,nome,cidade,perfil,confirmado,confirmado_em,descadastrado_em,origem,criado_em,atualizado_em) on public.newsletter_inscritos to authenticated;
create function private.validate_article(p jsonb,is_supplier boolean) returns void language plpgsql immutable set search_path='' as $$declare b jsonb;k text;total_words int:=0;links int:=0;photos int:=0;txt text;cell jsonb;begin
 if length(trim(coalesce(p->>'titulo',''))) not between 5 and 180 or length(coalesce(p->>'resumo',''))>320 or length(coalesce(p->>'seo_titulo',''))>80 or length(coalesce(p->>'seo_descricao',''))>180 or jsonb_typeof(p->'corpo')<>'array' or jsonb_array_length(p->'corpo') not between 1 and 100 or octet_length(p::text)>200000 then raise exception 'Confira título, resumo e blocos do texto';end if;
 foreach k in array array['titulo','resumo','seo_titulo','seo_descricao'] loop if coalesce(p->>k,'') ~ '[<>]' then raise exception 'Não use HTML nos textos';end if;end loop;
 if coalesce(p->>'imagem_capa','')<>'' and p->>'imagem_capa' !~ '^https?://' then raise exception 'Imagem de capa inválida';end if;
 for b in select jsonb_array_elements(p->'corpo') loop
 k:=b->>'tipo';txt:=coalesce(b->>'texto','');
 if k not in ('paragrafo','titulo','citacao','lista','imagem','video','tabela','link') or k is null then raise exception 'Tipo de bloco inválido';end if;
 if length(txt)>20000 or txt ~ '[<>]' then raise exception 'Não use HTML nos textos';end if;
 total_words:=total_words+case when trim(txt)='' then 0 else cardinality(regexp_split_to_array(trim(txt),'\s+')) end;
 if k='imagem' then photos:=photos+1;if coalesce(b->>'url','') !~ '^https?://' or length(coalesce(b->>'legenda',''))>200 or coalesce(b->>'legenda','') ~ '[<>]' then raise exception 'Imagem inválida';end if;end if;
 if k='video' and coalesce(b->>'url','') !~ '^https://(www\.)?(youtube\.com/(watch\?v=|embed/|shorts/)|youtu\.be/)[a-zA-Z0-9_-]{11}([?&].*)?$' then raise exception 'Vídeo inválido';end if;
 if k='link' then links:=links+1;if coalesce(b->>'url','') !~ '^https://' then raise exception 'Link inválido';end if;end if;
 -- Plain URL text counts too, so block formatting cannot bypass the supplier link limit.
 select links+count(*) into links from regexp_matches(txt,'(https?://|www\.)','gi');
 if k='tabela' then
 if jsonb_typeof(b->'linhas')<>'array' or jsonb_array_length(b->'linhas') not between 1 and 20 then raise exception 'Tabela inválida';end if;
 for cell in select jsonb_array_elements(b->'linhas') loop if jsonb_typeof(cell)<>'array' or jsonb_array_length(cell) not between 1 and 8 then raise exception 'Tabela inválida';end if;end loop;
 for txt in select value from jsonb_array_elements(b->'linhas') row_data cross join lateral jsonb_array_elements_text(row_data) loop if length(txt)>500 or txt ~ '[<>]' then raise exception 'Célula inválida';end if;total_words:=total_words+cardinality(regexp_split_to_array(trim(txt),'\s+'));select links+count(*) into links from regexp_matches(txt,'(https?://|www\.)','gi');end loop;
 end if;
 end loop;
 if total_words<10 then raise exception 'Escreva ao menos dez palavras';end if;
 if is_supplier and (total_words>600 or links>1 or photos+case when coalesce(p->>'imagem_capa','')<>'' then 1 else 0 end>5) then raise exception 'Limite do fornecedor: 600 palavras, um link e cinco fotos incluindo a capa';end if;
end;$$;
create function private.content_balance(sid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare lim jsonb;month_start date:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;used int;courtesy int;begin
 if not private.can_edit_supplier(sid) then raise exception 'Acesso negado';end if;lim:=private.plan_limits(sid);
 select count(*) into used from public.materia_consumos where fornecedor_id=sid and mes=month_start and origem='mensal';
 select greatest(0,coalesce((select sum(quantidade) from public.cortesias_materia where fornecedor_id=sid),0)-(select count(*) from public.materia_consumos where fornecedor_id=sid and origem='cortesia')) into courtesy;
 return jsonb_build_object('mensal',greatest(0,(lim->>'materias')::int-used),'limite',(lim->>'materias')::int,'usadas',used,'cortesia',courtesy,'parceiro',greatest(0,(lim->>'parceiro')::int-(select count(*) from public.materia_consumos where fornecedor_id=sid and mes=month_start and portal_id is not null)),'mes',month_start);end;$$;
create function public.saldo_materias(sid uuid) returns jsonb language sql stable set search_path='' as $$select private.content_balance(sid)$$;
create function private.save_article(mid uuid,sid uuid,p jsonb,expected integer) returns jsonb language plpgsql security definer set search_path='' as $$declare m public.materias;staff boolean:=private.is_editor();slug_value text;new_id uuid:=coalesce(mid,gen_random_uuid());supplier uuid;begin
 if auth.uid() is null then raise exception 'Acesso negado';end if;
 if mid is not null then select * into m from public.materias where id=mid for update;if not found then raise exception 'Matéria não encontrada';end if;if m.versao is distinct from expected then raise exception 'A matéria mudou. Recarregue antes de salvar';end if;supplier:=m.fornecedor_id;
 else supplier:=sid;end if;
 if not staff and (supplier is null or not private.can_edit_supplier(supplier) or (mid is not null and m.status not in ('rascunho','ajuste'))) then raise exception 'Sem permissão para editar esta matéria';end if;
 if mid is not null and m.status in ('publicada','agendada','em_revisao') and not staff then raise exception 'Matéria bloqueada para edição';end if;
 perform private.validate_article(p,supplier is not null);
 if not exists(select 1 from public.categorias where id=(p->>'categoria_id')::uuid and ativa) then raise exception 'Selecione uma categoria ativa';end if;
 if coalesce(p->>'portal_id','')<>'' and not exists(select 1 from public.portais_parceiros where id=(p->>'portal_id')::uuid and ativo) then raise exception 'Portal indisponível';end if;
 if mid is not null and m.primeiro_envio_em is not null and nullif(p->>'portal_id','')::uuid is distinct from m.portal_id then raise exception 'O portal não pode mudar depois do primeiro envio';end if;
 slug_value:=coalesce(nullif(public.gerar_slug(coalesce(nullif(p->>'slug',''),p->>'titulo')),''),'materia')||case when mid is null then '-'||substr(new_id::text,1,8) else '' end;
 if mid is not null and m.slug<>slug_value then
 update public.conteudo_redirects set slug_novo=slug_value where tipo='materia' and slug_novo=m.slug;
 insert into public.conteudo_redirects(tipo,slug_antigo,slug_novo) values('materia',m.slug,slug_value) on conflict(tipo,slug_antigo) do update set slug_novo=excluded.slug_novo;end if;
 if mid is null then insert into public.materias(id,titulo,slug,resumo,corpo,imagem_capa,categoria_id,autor_id,tipo,fornecedor_id,portal_id,seo_titulo,seo_descricao,tempo_leitura)
 values(new_id,p->>'titulo',slug_value,coalesce(p->>'resumo',''),p->'corpo',coalesce(p->>'imagem_capa',''),(p->>'categoria_id')::uuid,auth.uid(),case when supplier is not null then 'fornecedor' when staff and p->>'tipo'='patrocinada' then 'patrocinada' else 'editorial' end,supplier,nullif(p->>'portal_id','')::uuid,coalesce(p->>'seo_titulo',''),coalesce(p->>'seo_descricao',''),greatest(1,ceil(length((p->'corpo')::text)/1200.0)::int));
 else update public.materias set titulo=p->>'titulo',slug=slug_value,resumo=coalesce(p->>'resumo',''),corpo=p->'corpo',imagem_capa=coalesce(p->>'imagem_capa',''),categoria_id=(p->>'categoria_id')::uuid,portal_id=nullif(p->>'portal_id','')::uuid,seo_titulo=coalesce(p->>'seo_titulo',''),seo_descricao=coalesce(p->>'seo_descricao',''),versao=versao+1 where id=mid;end if;
 return (select to_jsonb(x) from public.materias x where id=new_id);end;$$;
create function public.salvar_materia(mid uuid,sid uuid,p jsonb,expected integer default null) returns jsonb language sql set search_path='' as $$select private.save_article(mid,sid,p,expected)$$;
create function private.article_action(mid uuid,action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare m public.materias;b jsonb;origin text;month_start date:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;date_value timestamptz;email text;begin
 -- Consistent lock order: supplier, optional portal, article. Serializes monthly reservations.
 select * into m from public.materias where id=mid;if not found then raise exception 'Matéria não encontrada';end if;
 if m.fornecedor_id is not null then perform 1 from public.fornecedores where id=m.fornecedor_id for update;end if;
 if m.portal_id is not null then perform 1 from public.portais_parceiros where id=m.portal_id for update;end if;
 select * into m from public.materias where id=mid for update;
 if action='enviar' then
 if m.fornecedor_id is null or not private.can_edit_supplier(m.fornecedor_id) or m.status not in ('rascunho','ajuste') or not private.is_supplier_public(m.fornecedor_id) then raise exception 'Envio não permitido';end if;
 perform private.validate_article(to_jsonb(m),true);
 if m.primeiro_envio_em is null then
 b:=private.content_balance(m.fornecedor_id);
 if (b->>'mensal')::int>0 then origin:='mensal';elsif (b->>'cortesia')::int>0 then origin:='cortesia';else raise exception 'Saldo de matérias insuficiente neste mês';end if;
 if m.portal_id is not null and ((b->>'parceiro')::int<1 or not exists(select 1 from public.portais_parceiros where id=m.portal_id and ativo and vagas_por_mes>(select count(*) from public.materia_consumos where portal_id=m.portal_id and mes=month_start))) then raise exception 'Sem vaga de portal parceiro neste mês';end if;
 insert into public.materia_consumos(materia_id,fornecedor_id,mes,origem,portal_id) values(mid,m.fornecedor_id,month_start,origin,m.portal_id);
 end if;
 update public.materias set status='em_revisao',primeiro_envio_em=coalesce(primeiro_envio_em,now()),motivo='',versao=versao+1 where id=mid;
 -- Notify the supplier and the active editorial team through the existing outbox.
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) select m.fornecedor_id,u.email,'materia_em_revisao','materia:'||mid||':envio:'||m.versao||':'||u.id,jsonb_build_object('empresa',m.titulo,'materia_id',mid,'editor',u.id<>(select dono_id from public.fornecedores where id=m.fornecedor_id)) from auth.users u join public.profiles pr on pr.id=u.id where pr.ativo and (u.id=(select dono_id from public.fornecedores where id=m.fornecedor_id) or exists(select 1 from public.user_roles ur where ur.user_id=u.id and ur.role in ('admin','editor')));
 else
 if not private.is_editor() then raise exception 'Acesso editorial negado';end if;
 if action in ('ajuste','recusar') then if m.status<>'em_revisao' or length(trim(coalesce(p->>'motivo',''))) not between 10 and 2000 then raise exception 'Revisão exige motivo de 10 a 2000 caracteres';end if;update public.materias set status=case when action='ajuste' then 'ajuste' else 'recusada' end,motivo=p->>'motivo',versao=versao+1 where id=mid;
 elsif action in ('publicar','agendar') then
 if m.fornecedor_id is not null and m.status<>'em_revisao' then raise exception 'Matéria de fornecedor precisa passar pela revisão';end if;
 if m.status not in ('rascunho','em_revisao','agendada') then raise exception 'Estado incompatível com publicação';end if;
 perform private.validate_article(to_jsonb(m),m.fornecedor_id is not null);
 if not exists(select 1 from public.categorias where id=m.categoria_id and ativa) or (m.fornecedor_id is not null and not private.is_supplier_public(m.fornecedor_id)) then raise exception 'Categoria ou fornecedor indisponível';end if;
 date_value:=case when action='agendar' then (p->>'agendada_em')::timestamptz else now() end;
 if date_value is null or (action='agendar' and date_value<=now()) then raise exception 'Escolha uma data futura';end if;
 update public.materias set status=case when action='agendar' then 'agendada' else 'publicada' end,agendada_em=case when action='agendar' then date_value end,publicada_em=case when action='publicar' then date_value end,motivo='',versao=versao+1 where id=mid;
 elsif action='arquivar' then update public.materias set status='arquivada',versao=versao+1 where id=mid;
 else raise exception 'Ação editorial inválida';end if;
 if m.fornecedor_id is not null and action in ('ajuste','recusar','publicar','agendar') then
 select u.email into email from public.fornecedores f join auth.users u on u.id=f.dono_id where f.id=m.fornecedor_id;
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(m.fornecedor_id,email,case when action in ('publicar','agendar') then 'materia_aprovada' else 'materia_ajuste' end,'materia:'||mid||':'||action||':'||m.versao,jsonb_build_object('empresa',m.titulo,'motivo',p->>'motivo','acao',action,'materia_id',mid));end if;
 end if;
 return (select to_jsonb(x) from public.materias x where id=mid);end;$$;
create function public.acao_materia(mid uuid,action text,p jsonb default '{}') returns jsonb language sql set search_path='' as $$select private.article_action(mid,action,p)$$;
create function private.publish_scheduled() returns integer language plpgsql security definer set search_path='' as $$declare total int;begin
 perform private.service_guard();
 update public.materias m set status='publicada',publicada_em=agendada_em,versao=versao+1 where status='agendada' and agendada_em<=now() and exists(select 1 from public.categorias c where c.id=m.categoria_id and c.ativa) and (fornecedor_id is null or private.is_supplier_public(fornecedor_id));get diagnostics total=row_count;return total;end;$$;
create function public.publicar_agendadas() returns integer language sql set search_path='' as $$select private.publish_scheduled()$$;
create function private.content_public(kind text,slug_value text,category text,page_number int) returns jsonb language plpgsql stable security definer set search_path='' as $$declare mid uuid;result jsonb;target text;begin
 if page_number not between 1 and 10000 then raise exception 'Página inválida';end if;
 if kind='materia' then
 select id into mid from public.materias m where slug=slug_value and private.article_visible(m);
 if mid is null then select slug_novo into target from public.conteudo_redirects where tipo='materia' and slug_antigo=slug_value;if exists(select 1 from public.materias m where m.slug=target and private.article_visible(m)) then return jsonb_build_object('item',null,'redirect','/materia/'||target);end if;return '{"item":null}';end if;
 select (to_jsonb(m)-'autor_id'-'motivo'-'primeiro_envio_em'-'versao'-'agendada_em'-'portal_id')||jsonb_build_object('categoria',c.nome,'categoria_slug',c.slug,'autor',p.nome,'selo',case when m.tipo in ('fornecedor','patrocinada') then 'Conteúdo de marca' else null end,'fornecedor',case when f.id is not null then jsonb_build_object('nome',f.nome_fantasia,'slug',f.slug,'descricao',f.descricao_curta,'logo',f.logo_url) else null end) into result from public.materias m join public.categorias c on c.id=m.categoria_id join public.profiles p on p.id=m.autor_id left join public.fornecedores f on f.id=m.fornecedor_id where m.id=mid;
 return jsonb_build_object('item',result);
 elsif kind='revista' then
 select to_jsonb(r) into result from public.revistas r where slug=slug_value and status='publicada' and publicada_em<=now();
 if result is null then select slug_novo into target from public.conteudo_redirects where tipo='revista' and slug_antigo=slug_value;
 if exists(select 1 from public.revistas r where r.slug=target and r.status='publicada' and r.publicada_em<=now()) then return jsonb_build_object('item',null,'redirect','/revista/'||target);end if;end if;
 return jsonb_build_object('item',result);
 elsif kind='catalogo' then return jsonb_build_object('categorias',coalesce((select jsonb_agg(jsonb_build_object('id',id,'nome',nome,'slug',slug) order by nome) from public.categorias where ativa),'[]'),'revistas',coalesce((select jsonb_agg(to_jsonb(r) order by publicada_em desc) from public.revistas r where status='publicada' and publicada_em<=now()),'[]'));
 elsif kind in ('lista','fornecedor') then
 if category<>'' and not exists(select 1 from public.categorias where slug=category and ativa) then select slug_novo into target from public.conteudo_redirects where tipo='categoria' and slug_antigo=category;return jsonb_build_object('items','[]'::jsonb,'total',0,'not_found',true,'redirect',case when target is not null and exists(select 1 from public.categorias where slug=target and ativa) then '/materias/'||target else null end);end if;
 return jsonb_build_object('items',coalesce((select jsonb_agg(x order by publicada_em desc) from (select m.id,m.titulo,m.slug,m.resumo,m.imagem_capa,m.publicada_em,m.tempo_leitura,m.tipo,c.nome categoria,c.slug categoria_slug from public.materias m join public.categorias c on c.id=m.categoria_id where private.article_visible(m) and (kind<>'fornecedor' or m.fornecedor_id=(select id from public.fornecedores where slug=slug_value)) and (category='' or c.slug=category) order by publicada_em desc,id limit 12 offset (page_number-1)*12)x),'[]'),'total',(select count(*) from public.materias m join public.categorias c on c.id=m.categoria_id where private.article_visible(m) and (kind<>'fornecedor' or m.fornecedor_id=(select id from public.fornecedores where slug=slug_value)) and (category='' or c.slug=category)),'pagina',page_number);
 elsif kind='sitemap' then return jsonb_build_object('materias',coalesce((select jsonb_agg(m.slug) from public.materias m where private.article_visible(m)),'[]'),'revistas',coalesce((select jsonb_agg(slug) from public.revistas where status='publicada' and publicada_em<=now()),'[]'),'categorias',coalesce((select jsonb_agg(slug) from public.categorias where ativa),'[]'));
 end if;raise exception 'Consulta inválida';end;$$;
create function public.conteudo_publico(kind text,slug_value text default '',category text default '',page_number int default 1) returns jsonb language sql stable set search_path='' as $$select private.content_public(kind,slug_value,category,page_number)$$;
create function private.content_staff_list(kind text,page_number int) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if not private.is_editor() then raise exception 'Acesso editorial negado';end if;
 if page_number not between 1 and 10000 then raise exception 'Página inválida';end if;
 case kind
 when 'materias' then select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.materias order by atualizado_em desc,id limit 25 offset (page_number-1)*25)x),'[]'),'total',(select count(*) from public.materias)) into result;
 when 'newsletter' then select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,email,nome,cidade,perfil,confirmado,confirmado_em,descadastrado_em,origem,criado_em from public.newsletter_inscritos order by criado_em desc,id limit 25 offset (page_number-1)*25)x),'[]'),'total',(select count(*) from public.newsletter_inscritos)) into result;
 when 'catalogo' then select jsonb_build_object('categorias',coalesce((select jsonb_agg(to_jsonb(x) order by nome) from public.categorias x),'[]'),'revistas',coalesce((select jsonb_agg(to_jsonb(x) order by criada desc) from (select *,criado_em criada from public.revistas) x),'[]'),'pautas',coalesce((select jsonb_agg(to_jsonb(x) order by data_prevista nulls last) from public.pautas x),'[]'),'portais',coalesce((select jsonb_agg(to_jsonb(x) order by nome) from public.portais_parceiros x),'[]'),'equipe',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'nome',p.nome)) from public.profiles p where p.ativo and exists(select 1 from public.user_roles u where u.user_id=p.id and u.role in ('admin','editor'))),'[]'),'entregas',coalesce((select jsonb_agg(to_jsonb(e) order by entregue_em desc) from public.materia_entregas e),'[]')) into result;
 else raise exception 'Consulta inválida';end case;return result;end;$$;
create function public.editorial_listar(kind text,page_number int default 1) returns jsonb language sql stable set search_path='' as $$select private.content_staff_list(kind,page_number)$$;
create function private.content_save_resource(kind text,rid uuid,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare new_id uuid:=coalesce(rid,gen_random_uuid());old_slug text;new_slug text;mid public.materias;portal public.portais_parceiros;begin
 if not private.is_editor() then raise exception 'Acesso editorial negado';end if;
 if octet_length(p::text)>10000 or p::text ~ '[<>]' then raise exception 'Conteúdo inválido';end if;
 case kind
 when 'categoria' then
 if length(trim(coalesce(p->>'nome',''))) not between 2 and 100 then raise exception 'Nome de categoria inválido';end if;
 new_slug:=public.gerar_slug(p->>'nome');select slug into old_slug from public.categorias where id=rid;
 insert into public.categorias(id,nome,slug,ativa) values(new_id,p->>'nome',new_slug,coalesce((p->>'ativa')::bool,true)) on conflict(id) do update set nome=excluded.nome,slug=excluded.slug,ativa=excluded.ativa;
 if old_slug is not null and old_slug<>new_slug then update public.conteudo_redirects set slug_novo=new_slug where tipo='categoria' and slug_novo=old_slug;insert into public.conteudo_redirects(tipo,slug_antigo,slug_novo) values('categoria',old_slug,new_slug) on conflict(tipo,slug_antigo) do update set slug_novo=excluded.slug_novo;end if;
 when 'revista' then
 if length(coalesce(p->>'titulo','')) not between 3 and 180 or length(coalesce(p->>'edicao','')) not between 1 and 80 or coalesce(p->>'status','') not in ('rascunho','publicada','arquivada') then raise exception 'Revista inválida';end if;
 if p->>'status'='publicada' and (coalesce(p->>'capa_url','') !~ '^https?://' or coalesce(p->>'link_digital','') !~ '^https://' or nullif(p->>'publicada_em','') is null) then raise exception 'Informe capa, link HTTPS e data da revista';end if;
 new_slug:=coalesce(nullif(public.gerar_slug(p->>'slug'),''),public.gerar_slug(p->>'titulo'));
 select slug into old_slug from public.revistas where id=rid;
 insert into public.revistas(id,titulo,edicao,slug,capa_url,link_digital,publicada_em,status) values(new_id,p->>'titulo',p->>'edicao',new_slug,coalesce(p->>'capa_url',''),coalesce(p->>'link_digital',''),nullif(p->>'publicada_em','')::timestamptz,p->>'status') on conflict(id) do update set titulo=excluded.titulo,edicao=excluded.edicao,slug=excluded.slug,capa_url=excluded.capa_url,link_digital=excluded.link_digital,publicada_em=excluded.publicada_em,status=excluded.status;
 if old_slug is not null and old_slug<>new_slug then update public.conteudo_redirects set slug_novo=new_slug where tipo='revista' and slug_novo=old_slug;insert into public.conteudo_redirects(tipo,slug_antigo,slug_novo) values('revista',old_slug,new_slug) on conflict(tipo,slug_antigo) do update set slug_novo=excluded.slug_novo;end if;
 when 'pauta' then
 if length(coalesce(p->>'titulo','')) not between 3 and 180 or length(coalesce(p->>'observacoes',''))>2000 then raise exception 'Pauta inválida';end if;
 if nullif(p->>'responsavel_id','') is not null and not exists(select 1 from public.profiles pr where pr.id=(p->>'responsavel_id')::uuid and pr.ativo and exists(select 1 from public.user_roles ur where ur.user_id=pr.id and ur.role in ('admin','editor'))) then raise exception 'Responsável editorial inválido';end if;
 insert into public.pautas(id,titulo,responsavel_id,data_prevista,status,observacoes) values(new_id,p->>'titulo',nullif(p->>'responsavel_id','')::uuid,nullif(p->>'data_prevista','')::date,p->>'status',coalesce(p->>'observacoes','')) on conflict(id) do update set titulo=excluded.titulo,responsavel_id=excluded.responsavel_id,data_prevista=excluded.data_prevista,status=excluded.status,observacoes=excluded.observacoes;
 when 'portal' then
 if length(coalesce(p->>'nome','')) not between 3 and 120 or coalesce(p->>'url','') !~ '^https://' then raise exception 'Portal inválido';end if;
 insert into public.portais_parceiros(id,nome,url,vagas_por_mes,ativo) values(new_id,p->>'nome',p->>'url',(p->>'vagas_por_mes')::int,coalesce((p->>'ativo')::bool,true)) on conflict(id) do update set nome=excluded.nome,url=excluded.url,vagas_por_mes=excluded.vagas_por_mes,ativo=excluded.ativo;
 when 'entrega' then
 select * into mid from public.materias where id=(p->>'materia_id')::uuid;
 if not found or not private.article_visible(mid) or mid.portal_id is null then raise exception 'Selecione matéria publicada com portal reservado';end if;
 select * into portal from public.portais_parceiros where id=mid.portal_id;
 if coalesce(p->>'url_externa','') not like rtrim(portal.url,'/')||'/%' then raise exception 'A entrega deve usar o domínio/caminho do portal reservado';end if;
 if coalesce(p->>'canonical_url','') !~ '^https?://[^/]+/materia/' or p->>'canonical_url' not like '%/materia/'||mid.slug then raise exception 'Informe o canonical original da matéria';end if;
 insert into public.materia_entregas(id,materia_id,portal_id,url_externa,canonical_url) values(new_id,mid.id,mid.portal_id,p->>'url_externa',p->>'canonical_url') on conflict(materia_id) do update set url_externa=excluded.url_externa,canonical_url=excluded.canonical_url,entregue_em=now();
 else raise exception 'Recurso inválido';end case;return new_id;end;$$;
create function public.editorial_salvar(kind text,rid uuid,p jsonb) returns uuid language sql set search_path='' as $$select private.content_save_resource(kind,rid,p)$$;
create function private.newsletter_signup(p jsonb,p_ip text) returns jsonb language plpgsql security definer set search_path='' as $$declare address text:=lower(trim(p->>'email'));n public.newsletter_inscritos;token text;begin
 perform private.service_guard();
 if length(coalesce(p_ip,''))<>64 then raise exception 'Requisição inválida';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_ip,701));
 if (select count(*) from private.newsletter_attempts where ip_hash=p_ip and criado_em>now()-interval '1 hour')>=5 then raise exception 'LIMITE_HORA';end if;
 if coalesce(p->>'aceite','')<>'true' or coalesce(p->>'website','')<>'' or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(address)>254 or length(trim(coalesce(p->>'nome',''))) not between 2 and 120 or length(coalesce(p->>'cidade',''))>120 or coalesce(p->>'perfil','') not in ('sindico','fornecedor','administrador','morador','outro') or p::text ~ '[<>]' then raise exception 'Confira os dados e o aceite';end if;
 insert into private.newsletter_attempts(ip_hash) values(p_ip);delete from private.newsletter_attempts where criado_em<now()-interval '2 days';
 perform pg_advisory_xact_lock(hashtextextended(address,702));select * into n from public.newsletter_inscritos where email=address for update;
 if found and ((n.confirmado and n.descadastrado_em is null) or n.ultimo_envio_em>now()-interval '15 minutes') then return '{"recebido":true}';end if;
 token:=encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex');
 insert into public.newsletter_inscritos(email,nome,cidade,perfil,token_confirmacao_hash,expira_em) values(address,trim(p->>'nome'),coalesce(p->>'cidade',''),p->>'perfil',encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '48 hours') on conflict(email) do update set nome=excluded.nome,cidade=excluded.cidade,perfil=excluded.perfil,confirmado=false,token_confirmacao_hash=excluded.token_confirmacao_hash,expira_em=excluded.expira_em,ultimo_envio_em=now();
 insert into public.email_outbox(destinatario,template,chave,payload) values(address,'newsletter_confirmar','newsletter:'||gen_random_uuid(),jsonb_build_object('empresa','Patri Realty','token',token));
 return '{"recebido":true}';end;$$;
create function public.inscrever_newsletter(p jsonb,p_ip text) returns jsonb language sql set search_path='' as $$select private.newsletter_signup(p,p_ip)$$;
create function private.newsletter_token(p_token text,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$declare n public.newsletter_inscritos;hash text;token text;begin
 if coalesce(p_token,'') !~ '^[a-f0-9]{64}$' then return '{"valido":false}';end if;hash:=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if p_action='confirmar' then
 select * into n from public.newsletter_inscritos where token_confirmacao_hash=hash and expira_em>now() and not confirmado for update;
 if not found then return '{"valido":false}';end if;
 token:=encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex');
 update public.newsletter_inscritos set confirmado=true,confirmado_em=now(),descadastrado_em=null,token_descadastro_hash=encode(sha256(convert_to(token,'UTF8')),'hex') where id=n.id;
 insert into public.consentimentos(email,documento,versao,origem) values(n.email,'newsletter','2026-10-20','duplo_aceite');
 insert into public.email_outbox(destinatario,template,chave,payload) values(n.email,'newsletter_confirmada','newsletter-ok:'||gen_random_uuid(),jsonb_build_object('empresa','Patri Realty','token',token));
 elsif p_action='descadastrar' then
 select * into n from public.newsletter_inscritos where token_descadastro_hash=hash for update;
 if found then update public.newsletter_inscritos set confirmado=false,descadastrado_em=coalesce(descadastrado_em,now()),expira_em=now() where id=n.id;end if;
 else return '{"valido":false}';end if;
 return '{"valido":true}';end;$$;
create function public.newsletter_token(p_token text,p_action text) returns jsonb language sql set search_path='' as $$select private.newsletter_token(p_token,p_action)$$;
-- Explicit capabilities; no direct client writes to editorial state, quotas, delivery or subscriptions.
revoke all on function private.is_editor(),private.article_visible(public.materias),private.validate_article(jsonb,boolean),private.content_balance(uuid),private.save_article(uuid,uuid,jsonb,integer),private.article_action(uuid,text,jsonb),private.publish_scheduled(),private.content_public(text,text,text,integer),private.content_staff_list(text,integer),private.content_save_resource(text,uuid,jsonb),private.newsletter_signup(jsonb,text),private.newsletter_token(text,text) from public;
revoke all on function public.saldo_materias(uuid),public.salvar_materia(uuid,uuid,jsonb,integer),public.acao_materia(uuid,text,jsonb),public.publicar_agendadas(),public.conteudo_publico(text,text,text,integer),public.editorial_listar(text,integer),public.editorial_salvar(text,uuid,jsonb),public.inscrever_newsletter(jsonb,text),public.newsletter_token(text,text) from public;
grant execute on function private.is_editor(),private.article_visible(public.materias),private.content_public(text,text,text,integer),private.newsletter_token(text,text),public.conteudo_publico(text,text,text,integer),public.newsletter_token(text,text) to anon,authenticated;
grant execute on function private.content_balance(uuid),private.save_article(uuid,uuid,jsonb,integer),private.article_action(uuid,text,jsonb),private.content_staff_list(text,integer),private.content_save_resource(text,uuid,jsonb),public.saldo_materias(uuid),public.salvar_materia(uuid,uuid,jsonb,integer),public.acao_materia(uuid,text,jsonb),public.editorial_listar(text,integer),public.editorial_salvar(text,uuid,jsonb) to authenticated;
grant execute on function private.publish_scheduled(),private.newsletter_signup(jsonb,text),public.publicar_agendadas(),public.inscrever_newsletter(jsonb,text) to service_role;
-- Public image bytes match the spec; object listing/writes are restricted to the article editor.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('materias','materias',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create function private.can_upload_article(path text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.materias m where m.id=case when split_part(path,'/',1) ~ '^[a-f0-9-]{36}$' then split_part(path,'/',1)::uuid else null end and (private.is_editor() or (private.can_edit_supplier(m.fornecedor_id) and m.status in ('rascunho','ajuste'))))$$;
revoke all on function private.can_upload_article(text) from public;grant execute on function private.can_upload_article(text) to authenticated;
create policy article_media_read on storage.objects for select to authenticated using(bucket_id='materias' and private.can_upload_article(name));
create policy article_media_insert on storage.objects for insert to authenticated with check(bucket_id='materias' and private.can_upload_article(name));
-- Versioned media paths avoid replacement races and retain the assets used by published articles.

grant execute on function public.newsletter_token(text,text),private.newsletter_token(text,text) to service_role;
