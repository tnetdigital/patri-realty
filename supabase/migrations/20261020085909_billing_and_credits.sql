-- Phase 6: server-authoritative entitlements, ledger and Stripe event processing.
create table public.planos(id uuid primary key default gen_random_uuid(),codigo text unique not null check(codigo in ('gratuito','premium','destaque')),nome text not null,preco_centavos integer not null default 0 check(preco_centavos>=0),stripe_price_id text,ativo boolean not null default true,limites jsonb not null,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
insert into public.planos(codigo,nome,limites) values
('gratuito','Grátis','{"leads":3,"fotos":1,"servicos":3,"cases":0,"video":false,"verificado":false,"metricas":false,"responder_avaliacoes":false,"materias":0,"parceiro":0,"prioridade":0}'),
('premium','Premium','{"leads":null,"fotos":12,"servicos":null,"cases":null,"video":true,"verificado":true,"metricas":true,"responder_avaliacoes":true,"materias":1,"parceiro":0,"prioridade":1}'),
('destaque','Destaque','{"leads":null,"fotos":20,"servicos":null,"cases":null,"video":true,"verificado":true,"metricas":true,"responder_avaliacoes":true,"materias":2,"parceiro":1,"prioridade":2}');
create table public.tabela_precos(id uuid primary key default gen_random_uuid(),codigo text unique not null,creditos integer not null check(creditos in (10,25,50)),preco_centavos integer not null default 0 check(preco_centavos>=0),ativo boolean not null default true,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
insert into public.tabela_precos(codigo,creditos) values('creditos_10',10),('creditos_25',25),('creditos_50',50);
create table public.assinaturas(id uuid primary key default gen_random_uuid(),fornecedor_id uuid unique not null references public.fornecedores(id),plano text not null references public.planos(codigo),status text not null check(status in ('teste','ativa','inadimplente','cancelada','gratuita')),teste_ate timestamptz,periodo_ate timestamptz,carencia_ate timestamptz,stripe_customer_id text,stripe_subscription_id text unique,cancelar_no_fim boolean not null default false,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table public.pagamentos(id uuid primary key,fornecedor_id uuid not null references public.fornecedores(id),produto text not null,quantidade integer not null default 0,valor_centavos integer not null check(valor_centavos>0),moeda text not null default 'brl' check(moeda='brl'),status text not null default 'pendente' check(status in ('pendente','pago','estornado','falhou')),stripe_checkout_id text unique,stripe_payment_id text unique,stripe_customer_id text,stripe_subscription_id text,estornado_centavos integer not null default 0,estornado_creditos integer not null default 0,fatura_url text,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
create table private.stripe_events(id text primary key,tipo text not null,criado_em timestamptz not null default now());
alter table private.stripe_events enable row level security;
alter table public.cases add column oculto_por_plano boolean not null default false;
alter table public.leads add column liberado_credito boolean not null default false;
create unique index credit_lead_once on public.creditos_extrato(lead_id) where tipo='uso' and lead_id is not null;
create table public.cortesias_materia(id uuid primary key default gen_random_uuid(),fornecedor_id uuid unique not null references public.fornecedores(id),quantidade integer not null default 1,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
do $$declare t text;begin foreach t in array array['planos','tabela_precos','assinaturas','pagamentos','cortesias_materia'] loop execute format('alter table public.%I enable row level security',t);execute format('create trigger set_atualizado_em before update on public.%I for each row execute function private.set_atualizado_em()',t);execute format('create trigger gravar_audit after insert or update or delete on public.%I for each row execute function private.gravar_audit()',t);end loop;end$$;
create policy plans_read on public.planos for select to anon,authenticated using(ativo or private.has_role(auth.uid(),'admin'));
create policy prices_read on public.tabela_precos for select to anon,authenticated using(ativo or private.has_role(auth.uid(),'admin'));
create policy subscriptions_read on public.assinaturas for select to authenticated using(private.can_edit_supplier(fornecedor_id) or private.has_role(auth.uid(),'comercial'));
create policy payments_read on public.pagamentos for select to authenticated using(private.owns_supplier(fornecedor_id) or private.has_role(auth.uid(),'admin') or private.has_role(auth.uid(),'comercial'));
create policy courtesy_read on public.cortesias_materia for select to authenticated using(private.can_edit_supplier(fornecedor_id));
grant select on public.planos,public.tabela_precos to anon,authenticated;
grant select on public.assinaturas,public.pagamentos,public.cortesias_materia to authenticated;
create index on public.pagamentos(fornecedor_id,criado_em);
create function private.effective_plan(sid uuid) returns text language sql stable security definer set search_path='' as $$select coalesce((select case when status='teste' and teste_ate>now() then 'premium' when status='ativa' and periodo_ate>now() then plano when status='inadimplente' and carencia_ate>now() then plano else 'gratuito' end from public.assinaturas where fornecedor_id=sid),'gratuito')$$;
create function private.plan_limits(sid uuid) returns jsonb language sql stable security definer set search_path='' as $$select limites from public.planos where codigo=private.effective_plan(sid)$$;
create function private.sync_entitlements(sid uuid) returns void language plpgsql security definer set search_path='' as $$declare lim jsonb:=private.plan_limits(sid);begin
 update public.midias m set oculto_por_plano=(x.n>coalesce((lim->>'fotos')::int,2147483647)) from (select id,row_number() over(order by ordem,criado_em,id) n from public.midias where fornecedor_id=sid and deletado_em is null) x where m.id=x.id and m.oculto_por_plano is distinct from (x.n>coalesce((lim->>'fotos')::int,2147483647));
 update public.servicos m set oculto_por_plano=(x.n>coalesce((lim->>'servicos')::int,2147483647)) from (select id,row_number() over(order by ordem,criado_em,id) n from public.servicos where fornecedor_id=sid and deletado_em is null) x where m.id=x.id and m.oculto_por_plano is distinct from (x.n>coalesce((lim->>'servicos')::int,2147483647));
 update public.cases m set oculto_por_plano=(x.n>coalesce((lim->>'cases')::int,2147483647)) from (select id,row_number() over(order by ordem,criado_em,id) n from public.cases where fornecedor_id=sid and deletado_em is null) x where m.id=x.id and m.oculto_por_plano is distinct from (x.n>coalesce((lim->>'cases')::int,2147483647));
 if lim->>'leads' is null then update public.leads set status='novo' where fornecedor_id=sid and status='bloqueado_plano';end if;
 update public.fornecedores set plano_codigo=case when exists(select 1 from public.assinaturas where fornecedor_id=sid and status='teste' and teste_ate>now()) then 'teste' else private.effective_plan(sid) end where id=sid and plano_codigo is distinct from case when exists(select 1 from public.assinaturas where fornecedor_id=sid and status='teste' and teste_ate>now()) then 'teste' else private.effective_plan(sid) end;
end;$$;
create function private.billing_supplier_change() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.teste_fim is not null and (tg_op='INSERT' or new.teste_fim is distinct from old.teste_fim) then
 insert into public.assinaturas(fornecedor_id,plano,status,teste_ate) values(new.id,'premium','teste',new.teste_fim) on conflict(fornecedor_id) do update set teste_ate=excluded.teste_ate,status=case when public.assinaturas.status in ('gratuita','teste') then 'teste' else public.assinaturas.status end;
 end if;
 if new.completude=100 and private.effective_plan(new.id)='premium' and exists(select 1 from public.assinaturas where fornecedor_id=new.id and status='teste' and teste_ate>now()) then insert into public.cortesias_materia(fornecedor_id) values(new.id) on conflict do nothing;end if;
 return new;end;$$;
create trigger billing_supplier_change after insert or update of teste_fim,completude on public.fornecedores for each row execute function private.billing_supplier_change();
insert into public.assinaturas(fornecedor_id,plano,status,teste_ate) select id,'premium','teste',teste_fim from public.fornecedores where teste_fim>now();
create function private.subscription_changed() returns trigger language plpgsql security definer set search_path='' as $$begin perform private.sync_entitlements(new.fornecedor_id);return new;end;$$;
create trigger subscription_changed after insert or update on public.assinaturas for each row execute function private.subscription_changed();
create function private.quota_lead() returns trigger language plpgsql security definer set search_path='' as $$declare lim int;begin
 perform 1 from public.fornecedores where id=new.fornecedor_id for update;
 lim:=(private.plan_limits(new.fornecedor_id)->>'leads')::int;
 if lim is not null and (select count(*) from public.leads where fornecedor_id=new.fornecedor_id and criado_em>=date_trunc('month',new.criado_em at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' and criado_em<(date_trunc('month',new.criado_em at time zone 'America/Sao_Paulo')+interval '1 month') at time zone 'America/Sao_Paulo')>=lim then new.status:='bloqueado_plano';end if;
 return new;end;$$;
create trigger quota_lead before insert on public.leads for each row execute function private.quota_lead();
-- Direct Data API cannot bypass the redacted RPC representation.
drop policy leads_read on public.leads;
create policy leads_read on public.leads for select to authenticated using(private.has_role(auth.uid(),'admin') or private.has_role(auth.uid(),'comercial') or (status<>'bloqueado_plano' and private.can_edit_supplier(fornecedor_id)));
drop policy notes_read on public.lead_notas;
create policy notes_read on public.lead_notas for select to authenticated using(exists(select 1 from public.leads l where l.id=lead_id and l.status<>'bloqueado_plano' and private.can_edit_supplier(l.fornecedor_id)));
create function private.unlock_lead(lid uuid) returns void language plpgsql security definer set search_path='' as $$declare l public.leads;sid uuid;begin
 select fornecedor_id into sid from public.leads where id=lid;
 if sid is null or not private.owns_supplier(sid) then raise exception 'Somente o proprietário pode usar créditos';end if;
 perform 1 from public.fornecedores where id=sid for update;
 select * into l from public.leads where id=lid for update;
 if l.liberado_credito then return;end if;
 if l.status<>'bloqueado_plano' then raise exception 'Este pedido já está liberado';end if;
 if (select coalesce(sum(quantidade),0) from public.creditos_extrato where fornecedor_id=sid)<1 then raise exception 'Saldo insuficiente. Escolha um pacote de créditos.';end if;
 insert into public.creditos_extrato(fornecedor_id,tipo,quantidade,lead_id,motivo) values(sid,'uso',-1,lid,'Liberação de pedido de orçamento');
 update public.leads set status='novo',liberado_credito=true where id=lid;
end;$$;
create function public.liberar_orcamento(lid uuid) returns void language sql set search_path='' as $$select private.unlock_lead(lid)$$;
create function private.billing_summary(sid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin if not private.can_edit_supplier(sid) then raise exception 'Acesso negado';end if;
 return jsonb_build_object('fornecedor_id',sid,'plano',private.effective_plan(sid),'assinatura',(select to_jsonb(s)-'stripe_customer_id'-'stripe_subscription_id' from public.assinaturas s where fornecedor_id=sid),'saldo',(select coalesce(sum(quantidade),0) from public.creditos_extrato where fornecedor_id=sid),'extrato',coalesce((select jsonb_agg(x order by criado_em desc) from (select id,tipo,quantidade,valor,motivo,criado_em from public.creditos_extrato where fornecedor_id=sid order by criado_em desc limit 100)x),'[]'),'pagamentos',coalesce((select jsonb_agg(x order by criado_em desc) from (select id,produto,valor_centavos,status,criado_em,fatura_url from public.pagamentos where fornecedor_id=sid order by criado_em desc limit 100)x),'[]'),'limites',private.plan_limits(sid),'cortesias',(select coalesce(sum(quantidade),0) from public.cortesias_materia where fornecedor_id=sid),'dono',private.owns_supplier(sid));end;$$;
create function public.resumo_plano(sid uuid) returns jsonb language sql stable set search_path='' as $$select private.billing_summary(sid)$$;
create function private.prepare_billing() returns integer language plpgsql security definer set search_path='' as $$declare s record;d int;total int:=0;stage int;begin
 for s in select a.*,f.nome_fantasia,f.completude,u.email from public.assinaturas a join public.fornecedores f on f.id=a.fornecedor_id join auth.users u on u.id=f.dono_id join public.profiles p on p.id=f.dono_id where p.ativo for update of a skip locked loop
 if s.status='teste' then
 d:=floor(extract(epoch from (now()-s.criado_em))/86400);
 foreach stage in array array[0,2,5,7,60,80,88] loop
 if d>=stage and (stage not in (2,5,7) or s.completude<60) and now()<s.teste_ate and (stage=0 or d<=stage+1) then
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(s.fornecedor_id,s.email,'regua_plano','regua:'||s.id||':'||stage,jsonb_build_object('empresa',s.nome_fantasia,'dia',stage,'teste_ate',s.teste_ate,'preco_centavos',(select preco_centavos from public.planos where codigo='premium'),'pedidos',(select count(*) from public.leads where fornecedor_id=s.fornecedor_id))) on conflict(chave) do nothing;
 end if;end loop;
 if s.teste_ate<=now() then update public.assinaturas set status='gratuita',plano='gratuito' where id=s.id;insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(s.fornecedor_id,s.email,'fim_teste','fim:'||s.id,jsonb_build_object('empresa',s.nome_fantasia)) on conflict(chave) do nothing;total:=total+1;end if;
 elsif (s.status='inadimplente' and s.carencia_ate<=now()) or (s.status='ativa' and s.periodo_ate<=now()) then update public.assinaturas set status='gratuita',plano='gratuito' where id=s.id;total:=total+1;end if;
 perform private.sync_entitlements(s.fornecedor_id);
 end loop;return total;end;$$;
create function public.processar_ciclo_planos() returns integer language sql set search_path='' as $$select private.prepare_billing()$$;
-- Orders are created from authoritative configured prices, never a client amount.
create function private.billing_order(sid uuid,product text,request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare price int;qty int:=0;pid text;row public.pagamentos;begin
 if not private.owns_supplier(sid) then raise exception 'Somente o proprietário pode comprar';end if;
 perform 1 from public.fornecedores where id=sid and status='publicado' for update;if not found then raise exception 'O perfil precisa estar publicado';end if;
 select * into row from public.pagamentos where id=request_id;
 if found then if row.fornecedor_id<>sid or row.produto<>product then raise exception 'Pedido incompatível';end if;return to_jsonb(row)||jsonb_build_object('stripe_price_id',(select stripe_price_id from public.planos where codigo=row.produto));end if;
 if product in ('premium','destaque') and exists(select 1 from public.assinaturas where fornecedor_id=sid and status in ('ativa','inadimplente') and stripe_subscription_id is not null) then raise exception 'Gerencie a assinatura existente pelo portal de cobrança';end if;
 if product in ('premium','destaque') then
 select * into row from public.pagamentos where fornecedor_id=sid and produto in ('premium','destaque') and status='pendente' and criado_em>now()-interval '24 hours' order by criado_em limit 1;
 if found then if row.produto<>product then raise exception 'Conclua o checkout de assinatura já iniciado ou aguarde sua expiração';end if;return to_jsonb(row)||jsonb_build_object('stripe_price_id',(select stripe_price_id from public.planos where codigo=row.produto));end if;
 end if;
 if product in ('premium','destaque') then select preco_centavos,stripe_price_id into price,pid from public.planos where codigo=product and ativo; if coalesce(pid,'')='' then raise exception 'Plano aguardando configuração de preço';end if;
 else select preco_centavos,creditos into price,qty from public.tabela_precos where codigo=product and ativo;end if;
 if coalesce(price,0)<=0 then raise exception 'Preço ainda não configurado';end if;
 insert into public.pagamentos(id,fornecedor_id,produto,quantidade,valor_centavos) values(request_id,sid,product,coalesce(qty,0),price) returning * into row;
 return to_jsonb(row)||jsonb_build_object('stripe_price_id',pid);end;$$;
create function public.preparar_checkout(sid uuid,product text,request_id uuid) returns jsonb language sql set search_path='' as $$select private.billing_order(sid,product,request_id)$$;
create function private.service_guard() returns void language plpgsql stable set search_path='' as $$begin if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' then raise exception 'Acesso negado';end if;end;$$;
create function private.bind_checkout(oid uuid,session_id text,customer_id text) returns void language plpgsql security definer set search_path='' as $$begin perform private.service_guard();update public.pagamentos set stripe_checkout_id=session_id,stripe_customer_id=customer_id where id=oid and status='pendente' and (stripe_checkout_id is null or stripe_checkout_id=session_id);if not found then raise exception 'Checkout incompatível';end if;end;$$;
create function public.vincular_checkout(oid uuid,session_id text,customer_id text default null) returns void language sql set search_path='' as $$select private.bind_checkout(oid,session_id,customer_id)$$;
create function private.stripe_event(event_id text,event_type text,data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare p public.pagamentos;sid uuid;units int;refund int;begin
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
 select * into p from public.pagamentos where stripe_payment_id=data->>'payment_intent' for update;if not found then raise exception 'Pagamento desconhecido';end if;
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
 insert into public.pagamentos(id,fornecedor_id,produto,valor_centavos,status,stripe_payment_id,stripe_subscription_id,fatura_url)
 values((substr(encode(sha256(convert_to(data->>'invoice_id','UTF8')),'hex'),1,32))::uuid,sid,'renovacao_'||(select plano from public.assinaturas where fornecedor_id=sid),(data->>'amount_due')::int,case when event_type='invoice.paid' then 'pago' else 'falhou' end,'invoice:'||(data->>'invoice_id'),data->>'subscription',case when data->>'invoice_url' like 'https://invoice.stripe.com/%' then data->>'invoice_url' else null end)
 on conflict(stripe_payment_id) do update set status=case when public.pagamentos.status='pago' then 'pago' else excluded.status end,fatura_url=coalesce(excluded.fatura_url,public.pagamentos.fatura_url);
 end if;
 if event_type='invoice.payment_failed' then insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) select sid,u.email,'pagamento_falhou','falha:'||event_id,jsonb_build_object('empresa',f.nome_fantasia) from public.fornecedores f join auth.users u on u.id=f.dono_id where f.id=sid;end if;
 else return '{"ignorado":true}';end if;
 insert into private.stripe_events(id,tipo) values(event_id,event_type);return '{"processado":true}';end;$$;
create function public.aplicar_evento_stripe(event_id text,event_type text,data jsonb) returns jsonb language sql set search_path='' as $$select private.stripe_event(event_id,event_type,data)$$;
create function private.billing_admin(kind text,pid uuid,data jsonb) returns void language plpgsql security definer set search_path='' as $$declare t text;rowdata jsonb;v jsonb;begin
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
create function public.configurar_cobranca(kind text,pid uuid,data jsonb) returns void language sql set search_path='' as $$select private.billing_admin(kind,pid,data)$$;
-- Explicit API capabilities. Helper functions never inherit PUBLIC execution.
revoke all on function private.effective_plan(uuid),private.plan_limits(uuid),private.sync_entitlements(uuid),private.billing_supplier_change(),private.subscription_changed(),private.quota_lead(),private.unlock_lead(uuid),private.billing_summary(uuid),private.prepare_billing(),private.billing_order(uuid,text,uuid),private.service_guard(),private.bind_checkout(uuid,text,text),private.stripe_event(text,text,jsonb),private.billing_admin(text,uuid,jsonb) from public;
revoke all on function public.liberar_orcamento(uuid),public.resumo_plano(uuid),public.processar_ciclo_planos(),public.preparar_checkout(uuid,text,uuid),public.vincular_checkout(uuid,text,text),public.aplicar_evento_stripe(text,text,jsonb),public.configurar_cobranca(text,uuid,jsonb) from public;
grant execute on function private.unlock_lead(uuid),private.billing_summary(uuid),private.billing_order(uuid,text,uuid),private.billing_admin(text,uuid,jsonb),public.liberar_orcamento(uuid),public.resumo_plano(uuid),public.preparar_checkout(uuid,text,uuid),public.configurar_cobranca(text,uuid,jsonb) to authenticated;
grant execute on function private.prepare_billing(),private.bind_checkout(uuid,text,text),private.stripe_event(text,text,jsonb),public.processar_ciclo_planos(),public.vincular_checkout(uuid,text,text),public.aplicar_evento_stripe(text,text,jsonb) to service_role;

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


create function private.content_entitlements() returns trigger language plpgsql security definer set search_path='' as $$begin perform private.sync_entitlements(new.fornecedor_id);return new;end;$$;
create trigger content_entitlements after insert or update of deletado_em,ordem on public.midias for each row execute function private.content_entitlements();
create trigger content_entitlements after insert or update of deletado_em,ordem on public.servicos for each row execute function private.content_entitlements();
create trigger content_entitlements after insert or update of deletado_em,ordem on public.cases for each row execute function private.content_entitlements();
revoke all on function private.content_entitlements() from public;

create or replace function private.directory_search(p_segmento text,p_uf text,p_cidade text,p_q text,p_pagina integer,p_ordem text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
 declare needle text:=lower(extensions.unaccent(trim(coalesce(p_q,''))));result jsonb;begin
 if length(coalesce(p_q,''))>120 or p_pagina not between 1 and 10000 or p_ordem not in ('relevancia','nome') then raise exception 'Filtros de busca inválidos';end if;
 if length(p_segmento)>12000 or cardinality(string_to_array(p_segmento,','))>200 then raise exception 'Especialidades inválidas';end if;
 if p_segmento<>'' and exists(select 1 from unnest(string_to_array(p_segmento,',')) selected where not exists(select 1 from public.segmentos where slug=selected and ativo)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 if p_uf<>'' and not exists(select 1 from public.estados where uf=upper(p_uf)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 if p_cidade<>'' and not exists(select 1 from public.cidades where slug=p_cidade and uf=upper(p_uf)) then return jsonb_build_object('items','[]'::jsonb,'total',0,'pagina',p_pagina,'paginas',0,'not_found',true);end if;
 with matches as (
 select f.id,f.nome_fantasia,coalesce((private.plan_limits(f.id)->>'prioridade')::int,0) priority,
 case when needle='' then 0 when strpos(lower(extensions.unaccent(f.nome_fantasia)),needle)>0 then 2 else 1 end relevance
 from public.fornecedores f where private.is_supplier_public(f.id) and f.slug is not null
 and (p_segmento='' or exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null and s.slug=any(string_to_array(p_segmento,',')) and s.ativo))
 and (p_uf='' or exists(select 1 from public.cobertura r where r.fornecedor_id=f.id and r.deletado_em is null and r.estado_uf=upper(p_uf)
 and (p_cidade='' or r.cidade_id is null or exists(select 1 from public.cidades cc where cc.id=r.cidade_id and cc.slug=p_cidade and cc.uf=upper(p_uf)))))
 and (needle='' or strpos(lower(extensions.unaccent(f.nome_fantasia||' '||f.descricao_curta)),needle)>0
 or exists(select 1 from public.fornecedor_segmentos fs join public.segmentos s on s.id=fs.segmento_id where fs.fornecedor_id=f.id and fs.deletado_em is null and s.ativo and strpos(lower(extensions.unaccent(s.nome||' '||array_to_string(s.apelidos,' '))),needle)>0)
 or (length(needle)>=4 and extensions.similarity(lower(extensions.unaccent(f.nome_fantasia)),needle)>.2))
 ),page as (select * from matches order by case when p_ordem='relevancia' then priority else 0 end desc,case when p_ordem='relevancia' then relevance else 0 end desc,nome_fantasia,id limit 24 offset (p_pagina-1)*24)
 select jsonb_build_object('items',coalesce((select jsonb_agg(private.directory_payload(id) order by case when p_ordem='relevancia' then priority else 0 end desc,case when p_ordem='relevancia' then relevance else 0 end desc,nome_fantasia,id) from page),'[]'),
 'total',(select count(*) from matches),'pagina',p_pagina,'paginas',ceil((select count(*) from matches)::numeric/24),'not_found',false) into result;
 return result;
 end;
$$;
-- Cache request identity once per policy evaluation. Preserve the existing ownership predicates.
do $$declare p record;using_expr text;check_expr text;begin
 for p in select pol.polname,cl.relname,ns.nspname,pg_get_expr(pol.polqual,pol.polrelid) u,pg_get_expr(pol.polwithcheck,pol.polrelid) c from pg_policy pol join pg_class cl on cl.oid=pol.polrelid join pg_namespace ns on ns.oid=cl.relnamespace where ns.nspname in ('public','storage') loop
 using_expr:=replace(p.u,'auth.uid()','(select auth.uid())');check_expr:=replace(p.c,'auth.uid()','(select auth.uid())');
 if using_expr is distinct from p.u or check_expr is distinct from p.c then execute format('alter policy %I on %I.%I%s%s',p.polname,p.nspname,p.relname,case when using_expr is not null then ' using ('||using_expr||')' else '' end,case when check_expr is not null then ' with check ('||check_expr||')' else '' end);end if;
 end loop;
end$$;
-- Read policies already include administrators; split the all-command write policies.
do $$declare item text;table_name text;begin foreach item in array array['config_admin:configuracoes','segments_admin:segmentos','roles_admin:user_roles'] loop
 table_name:=split_part(item,':',2);execute format('drop policy %I on public.%I',split_part(item,':',1),table_name);
 execute format('create policy %I on public.%I for insert to authenticated with check(private.has_role((select auth.uid()),''admin''))',split_part(item,':',1)||'_insert',table_name);
 execute format('create policy %I on public.%I for update to authenticated using(private.has_role((select auth.uid()),''admin'')) with check(private.has_role((select auth.uid()),''admin''))',split_part(item,':',1)||'_update',table_name);
 execute format('create policy %I on public.%I for delete to authenticated using(private.has_role((select auth.uid()),''admin''))',split_part(item,':',1)||'_delete',table_name);
end loop;end$$;
