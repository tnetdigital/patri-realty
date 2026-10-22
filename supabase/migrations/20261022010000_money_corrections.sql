-- F01,F02,F11: additive reconciliation and audited admin-origin subscriptions.
alter table public.pagamentos add column stripe_invoice_id text, add column stripe_charge_id text;
create unique index pagamentos_invoice on public.pagamentos(stripe_invoice_id) where stripe_invoice_id is not null;
create unique index pagamentos_charge on public.pagamentos(stripe_charge_id) where stripe_charge_id is not null;
update public.pagamentos set stripe_invoice_id=substr(stripe_payment_id,9) where stripe_payment_id like 'invoice:%';
create index assinaturas_plano on public.assinaturas(plano);
-- Separate admin-origin subscriptions preserve the unique paid billing relationship.
create table public.assinaturas_admin(id uuid primary key default gen_random_uuid(),fornecedor_id uuid not null references public.fornecedores(id),origem text not null default 'admin' check(origem='admin'),plano text not null references public.planos(codigo),valido_ate timestamptz not null,motivo text not null check(length(trim(motivo))>=10),autor_id uuid not null references public.profiles(id),criado_em timestamptz not null default now());
alter table public.assinaturas_admin enable row level security;
create policy admin_subscriptions_read on public.assinaturas_admin for select to authenticated using(private.can_edit_supplier(fornecedor_id));
grant select on public.assinaturas_admin to authenticated;
create function private.set_supplier_plan(sid uuid,code text,until_at timestamptz,reason text) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.admin_guard();perform 1 from public.fornecedores where id=sid for update;
 if not found or code not in ('gratuito','premium','destaque') or until_at is null or until_at<=now() or until_at>now()+interval '366 days' or length(trim(coalesce(reason,''))) not between 10 and 2000 then raise exception 'Informe plano, validade e motivo de 10 a 2000 caracteres';end if;
 insert into public.assinaturas_admin(fornecedor_id,plano,valido_ate,motivo,autor_id) values(sid,code,until_at,reason,auth.uid());
 insert into public.audit_log(ator_id,acao,tabela,registro_id,depois) values(auth.uid(),'CONCESSAO_PLANO','assinaturas_admin',sid,jsonb_build_object('plano',code,'ate',until_at,'motivo',reason));
 perform private.sync_entitlements(sid);
end;$$;
create function public.set_plano_fornecedor(sid uuid,code text,until_at timestamptz,reason text) returns void language sql set search_path='' as $$select private.set_supplier_plan(sid,code,until_at,reason)$$;
revoke all on function private.set_supplier_plan(uuid,text,timestamptz,text),public.set_plano_fornecedor(uuid,text,timestamptz,text) from public;
grant execute on function private.set_supplier_plan(uuid,text,timestamptz,text),public.set_plano_fornecedor(uuid,text,timestamptz,text) to authenticated;

create or replace function private.effective_plan(sid uuid) returns text language sql stable security definer set search_path='' as $$
select coalesce((select plano from public.assinaturas where fornecedor_id=sid and ((status='ativa' and periodo_ate>now()) or (status='inadimplente' and carencia_ate>now()))),
(select plano from public.assinaturas_admin where fornecedor_id=sid and valido_ate>now() order by criado_em desc,id desc limit 1),
(select 'premium' from public.assinaturas where fornecedor_id=sid and status='teste' and teste_ate>now()),'gratuito')$$;

create or replace function private.stripe_event(event_id text,event_type text,data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare p public.pagamentos;sid uuid;units int;refund int;begin
 perform private.service_guard();perform pg_advisory_xact_lock(hashtextextended(event_id,601));
 if exists(select 1 from private.stripe_events where id=event_id) then return '{"duplicado":true}';end if;
 if event_type='checkout.session.completed' then
 select * into p from public.pagamentos where stripe_checkout_id=data->>'session_id' for update;
 if not found or data->>'payment_status' is distinct from 'paid' or data->>'currency' is distinct from 'brl' or (data->>'amount_total')::int is distinct from p.valor_centavos then raise exception 'Pagamento não confere com o pedido';end if;
 sid:=p.fornecedor_id;
 perform 1 from public.fornecedores where id=sid for update;
 if p.status='pendente' then
 update public.pagamentos set status='pago',stripe_payment_id=nullif(data->>'payment_intent',''),stripe_customer_id=data->>'customer',stripe_subscription_id=nullif(data->>'subscription','') where id=p.id;
 if p.quantidade>0 then insert into public.creditos_extrato(fornecedor_id,tipo,quantidade,valor,stripe_payment_id,motivo) values(sid,'compra',p.quantidade,p.valor_centavos/100.0,'checkout:'||p.id,'Compra confirmada pelo Stripe');
 else insert into public.assinaturas(fornecedor_id,plano,status,periodo_ate,stripe_customer_id,stripe_subscription_id) values(sid,p.produto,'ativa',to_timestamp((data->>'period_end')::bigint),data->>'customer',data->>'subscription') on conflict(fornecedor_id) do update set plano=excluded.plano,status=excluded.status,periodo_ate=excluded.periodo_ate,stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id,carencia_ate=null;end if;
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) select sid,u.email,'pagamento_confirmado','pago:'||p.id,jsonb_build_object('empresa',f.nome_fantasia) from public.fornecedores f join auth.users u on u.id=f.dono_id where f.id=sid;
 end if;
 elsif event_type='charge.refunded' then
 select * into p from public.pagamentos where (nullif(data->>'payment_intent','') is not null and stripe_payment_id=data->>'payment_intent') or (nullif(data->>'invoice_id','') is not null and stripe_invoice_id=data->>'invoice_id') or (nullif(data->>'charge_id','') is not null and stripe_charge_id=data->>'charge_id') for update;if not found then raise exception 'Pagamento desconhecido';end if;
 perform 1 from public.fornecedores where id=p.fornecedor_id for update;
 refund:=(data->>'amount_refunded')::int;if refund<0 or refund>p.valor_centavos then raise exception 'Estorno inválido';end if;
 if refund>p.estornado_centavos then
 units:=ceil(p.quantidade*refund::numeric/p.valor_centavos)::int;
 if units>p.estornado_creditos then insert into public.creditos_extrato(fornecedor_id,tipo,quantidade,valor,stripe_payment_id,motivo) values(p.fornecedor_id,'ajuste',-(units-p.estornado_creditos),-(refund-p.estornado_centavos)/100.0,'refund:'||p.id||':'||refund,'Estorno Stripe proporcional acumulado');end if;
 update public.pagamentos set estornado_centavos=refund,estornado_creditos=units,status=case when refund=valor_centavos then 'estornado' else status end where id=p.id;
 end if;
 elsif event_type in ('invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted') then
 select fornecedor_id into sid from public.assinaturas where stripe_subscription_id=data->>'subscription' for update;if sid is null then raise exception 'Assinatura ainda não vinculada';end if;
 if event_type='customer.subscription.deleted' or data->>'status' in ('canceled','unpaid','incomplete_expired') then update public.assinaturas set status='cancelada',plano='gratuito',periodo_ate=now() where fornecedor_id=sid;
 elsif data->>'status'='active' then update public.assinaturas set status='ativa',periodo_ate=to_timestamp((data->>'period_end')::bigint),carencia_ate=null,cancelar_no_fim=coalesce((data->>'cancel_at_period_end')::bool,false),plano=coalesce((select codigo from public.planos where stripe_price_id=data->>'price_id'),plano) where fornecedor_id=sid;
 elsif data->>'status' in ('past_due','incomplete') then update public.assinaturas set status='inadimplente',carencia_ate=coalesce(carencia_ate,now()+interval '7 days') where fornecedor_id=sid;end if;
 if event_type in ('invoice.paid','invoice.payment_failed') and coalesce(data->>'invoice_id','')<>'' and data->>'currency'='brl' and coalesce((data->>'amount_due')::int,0)>0 and coalesce(data->>'billing_reason','')<>'subscription_create' then
 insert into public.pagamentos(id,fornecedor_id,produto,valor_centavos,status,stripe_payment_id,stripe_subscription_id,fatura_url,stripe_invoice_id,stripe_charge_id)
 values((substr(encode(sha256(convert_to(data->>'invoice_id','UTF8')),'hex'),1,32))::uuid,sid,'renovacao_'||(select plano from public.assinaturas where fornecedor_id=sid),(data->>'amount_due')::int,case when event_type='invoice.paid' then 'pago' else 'falhou' end,coalesce(nullif(data->>'payment_intent',''),'invoice:'||(data->>'invoice_id')),data->>'subscription',case when data->>'invoice_url' like 'https://invoice.stripe.com/%' then data->>'invoice_url' else null end,data->>'invoice_id',nullif(data->>'charge_id',''))
 on conflict(id) do update set stripe_payment_id=excluded.stripe_payment_id,stripe_invoice_id=excluded.stripe_invoice_id,stripe_charge_id=coalesce(excluded.stripe_charge_id,public.pagamentos.stripe_charge_id),status=case when public.pagamentos.status='pago' then 'pago' else excluded.status end,fatura_url=coalesce(excluded.fatura_url,public.pagamentos.fatura_url);
 end if;
 if event_type='invoice.payment_failed' then insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) select sid,u.email,'pagamento_falhou','falha:'||event_id,jsonb_build_object('empresa',f.nome_fantasia) from public.fornecedores f join auth.users u on u.id=f.dono_id where f.id=sid;end if;
 else return '{"ignorado":true}';end if;
 insert into private.stripe_events(id,tipo) values(event_id,event_type);return '{"processado":true}';end;$$;
create or replace function private.billing_admin(kind text,pid uuid,data jsonb) returns void language plpgsql security definer set search_path='' as $$declare t text;rowdata jsonb;v jsonb;begin
 if not private.has_role(auth.uid(),'admin') then
 if not private.has_role(auth.uid(),'comercial') or exists(select 1 from jsonb_object_keys(data) k where k<>'preco_centavos') then raise exception 'Acesso administrativo negado';end if;
 if coalesce((data->>'preco_centavos')::int,-1) not between 0 and 10000000 then raise exception 'Preço inválido';end if;
 if kind='plano' then update public.planos set preco_centavos=(data->>'preco_centavos')::int where id=pid and codigo<>'gratuito';
 elsif kind='pacote' then update public.tabela_precos set preco_centavos=(data->>'preco_centavos')::int where id=pid;
 else raise exception 'Operação inválida';end if;
 if not found then raise exception 'Registro ou valor inválido';end if;return;
 end if;
 perform private.admin_guard();
 if kind='plano' then
 v:=data->'limites';if not v ?& array['leads','fotos','servicos','cases','video','verificado','metricas','responder_avaliacoes','materias','parceiro','prioridade'] or exists(select 1 from jsonb_each(v) e where key in ('leads','fotos','servicos','cases','materias','parceiro','prioridade') and value<>'null'::jsonb and (value::text !~ '^[0-9]{1,6}$')) then raise exception 'Limites inválidos';end if;
 if exists(select 1 from jsonb_each(v) e where key in ('video','verificado','metricas','responder_avaliacoes') and value not in ('true'::jsonb,'false'::jsonb)) then raise exception 'Recurso inválido';end if;
 if (data->>'preco_centavos')::int<0 or (data->>'preco_centavos')::int>10000000 then raise exception 'Preço inválido';end if;
 update public.planos set preco_centavos=(data->>'preco_centavos')::int,stripe_price_id=nullif(data->>'stripe_price_id',''),limites=v where id=pid and (codigo<>'gratuito' or (data->>'preco_centavos')::int=0);
 elsif kind='pacote' then update public.tabela_precos set preco_centavos=(data->>'preco_centavos')::int,ativo=(data->>'ativo')::bool where id=pid and (data->>'preco_centavos')::int between 0 and 10000000;
 else raise exception 'Operação inválida';end if;
 if not found then raise exception 'Registro ou valor inválido';end if;
 for rowdata in select to_jsonb(f.id) from public.fornecedores f loop perform private.sync_entitlements((rowdata#>>'{}')::uuid);end loop;
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