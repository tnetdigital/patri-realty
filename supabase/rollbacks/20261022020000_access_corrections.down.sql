create or replace function private.media_safe(v text,sid uuid) returns boolean language sql stable set search_path='' as $$select coalesce(v,'')='' or (v ~ '^https?://' and position('/storage/v1/object/public/fornecedores/'||sid::text||'/' in v)>0)$$;
create or replace function private.review_list(sid uuid,mode text,page_number int) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if page_number not between 1 and 10000 then raise exception 'Página inválida';end if;
 if mode in ('admin','pendentes','denunciadas') and not private.has_role(auth.uid(),'admin') then raise exception 'Acesso negado';end if;
 if mode='fornecedor' and not private.can_edit_supplier(sid) then raise exception 'Acesso negado';end if;
 if mode='minha' and auth.uid() is null then raise exception 'Entre na sua conta';end if;
 if mode not in ('publico','admin','pendentes','denunciadas','fornecedor','minha') then raise exception 'Filtro inválido';end if;
 with filtered as(select r.*,f.nome_fantasia empresa from public.avaliacoes r join public.fornecedores f on f.id=r.fornecedor_id where (mode in ('admin','pendentes','denunciadas') or r.fornecedor_id=sid) and (case mode when 'publico' then r.status='publicada' and private.is_supplier_public(sid) when 'minha' then r.autor_id=auth.uid() when 'pendentes' then r.status='pendente' when 'denunciadas' then r.denuncia_motivo<>'' else true end)),page as(select * from filtered order by criado_em desc,id limit 20 offset (page_number-1)*20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'fornecedor_id',fornecedor_id,'empresa',empresa,'nota',nota,'titulo',titulo,'texto',texto,'condominio',condominio,'status',status,'resposta_fornecedor',resposta_fornecedor,'resposta_em',resposta_em,'criado_em',criado_em)||case when mode='publico' then '{}'::jsonb else jsonb_build_object('denuncia_motivo',denuncia_motivo,'motivo_moderacao',motivo_moderacao) end) from page),'[]'),'total',(select count(*) from filtered),'media',(select round(avg(nota),1) from filtered where status='publicada'),'publicadas',(select count(*) from filtered where status='publicada')) into result;return result;end;$$;
create or replace function private.accept_quotation(p_id uuid,p_ip text,p_hash text,p_data jsonb,p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid uuid;segment uuid;dest uuid;cid uuid;existing private.quotation_requests;f public.fornecedores;lid uuid;mail text;copies uuid[];begin
 if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' then raise exception 'Acesso negado';end if;
 if length(p_ip)<>64 or length(p_hash)<>64 then raise exception 'Pedido inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,17));
 select * into existing from private.quotation_requests where id=p_id;
 if found then if existing.payload_hash<>p_hash or existing.ip_hash<>p_ip then raise exception 'Pedido inválido';end if;return jsonb_build_object('recebido',true);end if;
 perform pg_advisory_xact_lock(hashtextextended(p_ip,19));
 if (select count(*) from private.quotation_requests where ip_hash=p_ip and criado_em>now()-interval '1 hour')>=5 then raise exception 'LIMITE_HORA';end if;
 if coalesce(p_data->>'privacidade','')<>'true' or coalesce(p_data->>'website','')<>'' or length(trim(coalesce(p_data->>'nome',''))) not between 3 and 120 or length(coalesce(p_data->>'mensagem','')) not between 20 and 4000 or length(coalesce(p_data->>'condominio_nome','')) not between 2 and 160 or length(coalesce(p_data->>'cidade','')) not between 2 and 120 or coalesce(p_data->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_data->>'email')>254 or coalesce(p_data->>'telefone','') !~ '^[0-9]{10,13}$' or coalesce(p_data->>'unidades','') !~ '^[0-9]{1,6}$' or (p_data->>'unidades')::int not between 1 and 100000 or coalesce(p_data->>'urgencia','') not in ('planejamento','30_dias','urgente') or not exists(select 1 from public.estados where uf=p_data->>'uf') then raise exception 'Pedido inválido';end if;
 if (p_data->>'nome') ~ '[<>]' or (p_data->>'mensagem') ~ '[<>]' or (p_data->>'condominio_nome') ~ '[<>]' or (p_data->>'cidade') ~ '[<>]' then raise exception 'Texto inválido';end if;
 sid:=(p_data->>'fornecedor_id')::uuid;segment:=(p_data->>'segmento_id')::uuid;
 if not private.is_supplier_public(sid) or not exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=sid and fs.segmento_id=segment and fs.deletado_em is null and s.ativo) then raise exception 'Fornecedor indisponível';end if;
 select coalesce(array_agg(value::uuid),'{}') into copies from jsonb_array_elements_text(coalesce(p_data->'copias','[]'));
 if cardinality(copies)>2 or sid=any(copies) or cardinality(copies)<>(select count(distinct x) from unnest(copies)x) then raise exception 'Destinatários inválidos';end if;
 foreach dest in array copies loop
 if not private.is_supplier_public(dest) or not exists(select 1 from public.fornecedor_segmentos fs where fs.fornecedor_id=dest and fs.segmento_id=segment and fs.deletado_em is null) then raise exception 'Destinatário indisponível';end if;end loop;
 if p_user is not null and not exists(select 1 from public.profiles where id=p_user and ativo) then raise exception 'Conta indisponível';end if;
 insert into private.quotation_requests values(p_id,p_ip,p_hash,now());
 insert into public.consentimentos(user_id,email,documento,versao,origem) values(p_user,lower(p_data->>'email'),'privacidade','2026-10-20','orcamento') returning id into cid;
 foreach dest in array array_prepend(sid,copies) loop
 select * into f from public.fornecedores where id=dest;
 insert into public.leads(pedido_id,fornecedor_id,segmento_id,solicitante_id,nome,email,telefone,condominio_nome,cidade,uf,unidades,urgencia,mensagem,consentimento_id)
 values(p_id,dest,segment,p_user,trim(p_data->>'nome'),lower(trim(p_data->>'email')),p_data->>'telefone',trim(p_data->>'condominio_nome'),trim(p_data->>'cidade'),p_data->>'uf',(p_data->>'unidades')::int,p_data->>'urgencia',trim(p_data->>'mensagem'),cid) returning id into lid;
 select email into mail from auth.users where id=f.dono_id;
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(dest,mail,'novo_orcamento','lead:'||lid,jsonb_build_object('empresa',f.nome_fantasia,'lead_id',lid));
 end loop;
 insert into public.email_outbox(destinatario,template,chave,payload) values(lower(trim(p_data->>'email')),'orcamento_confirmado','ack:'||p_id,jsonb_build_object('empresa',(select nome_fantasia from public.fornecedores where id=sid),'quantidade',1+cardinality(copies)));
 return jsonb_build_object('recebido',true);
end;$$;
create or replace function private.admin_action(p_kind text,p_id uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 elsif p_action='plano' then perform private.set_supplier_plan(p_id,p_data->>'plano',coalesce((p_data->>'ate')::timestamptz,now()+interval '30 days'),reason);
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
drop policy reviews_private_read on public.avaliacoes;create policy reviews_private_read on public.avaliacoes for select to authenticated using(autor_id=auth.uid() or private.can_edit_supplier(fornecedor_id) or private.has_role(auth.uid(),'admin'));drop function public.meus_orcamentos(int);drop function private.quotation_history(int);drop function public.enviar_mensagem(text,text,text);drop function private.contact_message(text,text,text);drop table public.mensagens;drop function public.document_version();delete from public.configuracoes where chave in ('media_origins','documentos_versao');