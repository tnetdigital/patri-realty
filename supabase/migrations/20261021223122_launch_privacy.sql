-- Privacy operations use a verified Auth identity, never an ID supplied by a browser.
create table private.contas_exclusoes (
  user_id uuid primary key references public.profiles(id),
  solicitada_em timestamptz not null default now(),
  auth_concluido_em timestamptz
);
alter table private.contas_exclusoes enable row level security;
revoke all on private.contas_exclusoes from public,anon,authenticated;

create function private.exportar_conta() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); e text; s uuid;
begin
 if u is null or not private.is_active() then raise exception 'Sessão inválida'; end if;
 select email into e from auth.users where id=u and email_confirmed_at is not null;
 if e is null then raise exception 'Confirme seu e-mail'; end if;
 select id into s from public.fornecedores where dono_id=u;
 return jsonb_build_object(
  'versao','2026-10-21','exportado_em',now(),
  'conta',(select to_jsonb(p)||jsonb_build_object('email',e) from public.profiles p where id=u),
  'papeis',(select coalesce(jsonb_agg(role),'[]') from public.user_roles where user_id=u),
  'consentimentos',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.consentimentos c where user_id=u or lower(email)=lower(e)),
  'avaliacoes',(select coalesce(jsonb_agg(to_jsonb(a)-'denuncia_motivo'-'motivo_moderacao'),'[]') from public.avaliacoes a where autor_id=u),
  'orcamentos_enviados',(select coalesce(jsonb_agg(to_jsonb(l)),'[]') from public.leads l where solicitante_id=u or lower(email)=lower(e)),
  'newsletter',(select coalesce(jsonb_agg(to_jsonb(n)-'token_confirmacao_hash'-'token_descadastro_hash'),'[]') from public.newsletter_inscritos n where lower(email)=lower(e)),
  'interesses',(select coalesce(jsonb_agg(to_jsonb(i)-'notas'),'[]') from public.interesses_marketing i where autor_id=u),
  'empresa',(select to_jsonb(f) from public.fornecedores f where id=s),
  'vinculos',(select coalesce(jsonb_agg(to_jsonb(m)),'[]') from public.fornecedor_membros m where user_id=u),
  'materias',(select coalesce(jsonb_agg(to_jsonb(m)-'motivo'),'[]') from public.materias m where autor_id=u),
  'pagamentos',(select coalesce(jsonb_agg(to_jsonb(p)-'stripe_customer_id'-'stripe_payment_id'-'stripe_subscription_id'-'stripe_checkout_id'),'[]') from public.pagamentos p where fornecedor_id=s),
  'creditos',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.creditos_extrato c where fornecedor_id=s),
  'reivindicacoes',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.reivindicacoes r where solicitante_id=u)
 );
end $$;
create function public.exportar_minha_conta() returns jsonb
language sql security invoker set search_path='' as $$select private.exportar_conta()$$;
revoke all on function private.exportar_conta(),public.exportar_minha_conta() from public,anon;
grant execute on function private.exportar_conta(),public.exportar_minha_conta() to authenticated;

create function private.anonimizar_conta(uid uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e text; sid uuid; lids uuid[];
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Acesso negado'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,10));
 if exists(select 1 from private.contas_exclusoes where user_id=uid) then return jsonb_build_object('anonimizada',true);end if;
 select email into e from auth.users where id=uid;
 if e is null then raise exception 'Conta indisponível';end if;
 select id into sid from public.fornecedores where dono_id=uid;
 select array_agg(id) into lids from public.leads where solicitante_id=uid or lower(email)=lower(e);
 -- This update also applies the existing last-active-admin lock/guard.
 update public.profiles set ativo=false,nome='Conta removida',telefone=null,cidade=null,estado=null,condominio_nome=null,cargo=null where id=uid;
 update public.fornecedor_membros set ativo=false where user_id=uid;
 delete from public.user_roles where user_id=uid;
 delete from auth.refresh_tokens where user_id=uid::text;
 delete from auth.sessions where user_id=uid;
 update public.fornecedores set email='',telefone='',whatsapp='',endereco='',cep='',motivo_status='Conta do responsável removida' where id=sid;
 update public.avaliacoes set titulo='Avaliação anonimizada',texto='O conteúdo pessoal desta avaliação foi removido a pedido do autor.',condominio='',denuncia_motivo='',motivo_moderacao='' where autor_id=uid;
 update public.avaliacoes set resposta_fornecedor='',resposta_em=null where fornecedor_id=sid;
 update public.lead_notas set texto='Conteúdo removido por privacidade' where autor_id=uid or lead_id=any(lids);
 update public.leads set nome='Conta removida',email='removida@invalid.local',telefone='',condominio_nome='',cidade='',uf='',mensagem='Conteúdo removido por privacidade',solicitante_id=null where id=any(lids);
 update public.interesses_marketing set mensagem='',whatsapp='0000000000',notas='',status='fechado' where autor_id=uid;
 delete from public.newsletter_inscritos where lower(email)=lower(e);
 update public.consentimentos set email=null,user_id=null where user_id=uid or lower(email)=lower(e);
 update public.convites set email='removida@invalid.local',revogado_em=coalesce(revogado_em,now()) where lower(email)=lower(e) or autor_id=uid or fornecedor_id=sid;
 update public.convites_proprietario set email='removida@invalid.local',revogado_em=coalesce(revogado_em,now()) where lower(email)=lower(e) or autor_id=uid or fornecedor_id=sid;
 update public.reivindicacoes set mensagem='Conteúdo removido por privacidade',prova_url='' where solicitante_id=uid;
 update public.pautas set responsavel_id=null,observacoes='' where responsavel_id=uid;
 delete from private.admin_import_batches where ator_id=uid;
 delete from public.email_outbox where lower(destinatario)=lower(e) or fornecedor_id=sid or position(lower(e) in lower(payload::text))>0 or payload::text like '%'||uid::text||'%' or exists(select 1 from unnest(lids) l where payload::text like '%'||l::text||'%');
 delete from public.email_log where lower(destinatario)=lower(e);
 -- Redact historical JSON snapshots too; preserve a minimal action/date trail.
 update public.audit_log set ator_id=null,antes=null,depois=null,ip_hash=null
 where ator_id=uid or registro_id=uid or registro_id=sid or registro_id=any(lids)
 or position(lower(e) in lower(coalesce(antes::text,'')))>0 or position(lower(e) in lower(coalesce(depois::text,'')))>0
 or coalesce(antes::text,'') like '%'||uid::text||'%' or coalesce(depois::text,'') like '%'||uid::text||'%';
 insert into private.contas_exclusoes(user_id) values(uid);
 return jsonb_build_object('anonimizada',true);
end $$;
create function public.anonimizar_conta(uid uuid) returns jsonb language sql security invoker set search_path='' as $$select private.anonimizar_conta(uid)$$;
create function public.concluir_exclusao_auth(uid uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Acesso negado';end if;
 update private.contas_exclusoes set auth_concluido_em=now() where user_id=uid;
end $$;
create function public.exclusoes_auth_pendentes() returns setof uuid language plpgsql security definer set search_path='' as $$begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Acesso negado';end if;
 return query select user_id from private.contas_exclusoes where auth_concluido_em is null order by solicitada_em limit 50;
end $$;
revoke all on function private.anonimizar_conta(uuid),public.anonimizar_conta(uuid),public.concluir_exclusao_auth(uuid),public.exclusoes_auth_pendentes() from public,anon,authenticated;
grant execute on function private.anonimizar_conta(uuid),public.anonimizar_conta(uuid),public.concluir_exclusao_auth(uuid),public.exclusoes_auth_pendentes() to service_role;

create function public.retencao_privacidade() returns void language plpgsql security definer set search_path='' as $$begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Acesso negado';end if;
 delete from private.conta_tentativas where criado_em<now()-interval '15 minutes';
 delete from private.login_falhas where criado_em<now()-interval '15 minutes';
 delete from public.email_log where criado_em<now()-interval '12 months';
 delete from public.email_outbox where criado_em<now()-interval '12 months' and status<>'pendente';
 -- Keep anonymized business records for 24 months, then remove narrative detail.
 update public.leads set mensagem='Retenção encerrada',condominio_nome='' where criado_em<now()-interval '24 months' and email='removida@invalid.local';
 update public.avaliacoes set texto='O período de retenção do conteúdo desta avaliação foi encerrado.' where autor_id in(select user_id from private.contas_exclusoes where solicitada_em<now()-interval '24 months');
end $$;
revoke all on function public.retencao_privacidade() from public,anon,authenticated;
grant execute on function public.retencao_privacidade() to service_role;
notify pgrst,'reload schema';

create table private.conta_tentativas(id uuid primary key default gen_random_uuid(),chave text not null,criado_em timestamptz not null default now());
alter table private.conta_tentativas enable row level security;
create index on private.conta_tentativas(chave,criado_em);
create function public.validar_sessao_conta(uid uuid,sessao uuid) returns boolean language plpgsql security definer set search_path='' as $$begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Acesso negado';end if;
 return exists(select 1 from auth.sessions s join public.profiles p on p.id=s.user_id where s.id=sessao and s.user_id=uid and p.ativo and coalesce(s.updated_at,s.created_at)>now()-interval '7 days');
end $$;
create function public.limitar_conta(chaves text[]) returns boolean language plpgsql security definer set search_path='' as $$declare c text;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Acesso negado';end if;
 if cardinality(chaves)<>2 then raise exception 'Chaves inválidas';end if;
 foreach c in array chaves loop perform pg_advisory_xact_lock(hashtextextended(c,11));end loop;
 delete from private.conta_tentativas where criado_em<now()-interval '15 minutes';
 if exists(select 1 from private.conta_tentativas where chave=any(chaves) group by chave having count(*)>=5) then return false;end if;
 insert into private.conta_tentativas(chave) select unnest(chaves);return true;
end $$;
revoke all on function public.validar_sessao_conta(uuid,uuid),public.limitar_conta(text[]) from public,anon,authenticated;
grant execute on function public.validar_sessao_conta(uuid,uuid),public.limitar_conta(text[]) to service_role;

insert into public.configuracoes(chave,valor,publica) values('identidade_legal','{"razao_social":"","cnpj":"","email_privacidade":"","email_atendimento":"","revisado":false}',true) on conflict(chave) do nothing;
