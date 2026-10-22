-- Phase 4: only the trusted Edge Function can accept public quotations.
create table private.quotation_requests(id uuid primary key,ip_hash text not null,payload_hash text not null,criado_em timestamptz not null default now());
create index on private.quotation_requests(ip_hash,criado_em);
alter table private.quotation_requests enable row level security;
create table public.leads(
 id uuid primary key default gen_random_uuid(),pedido_id uuid not null references private.quotation_requests(id),fornecedor_id uuid not null references public.fornecedores(id),segmento_id uuid not null references public.segmentos(id),solicitante_id uuid references public.profiles(id),nome text not null,email text not null,telefone text not null,condominio_nome text not null,cidade text not null,uf text not null,unidades integer not null check(unidades between 1 and 100000),urgencia text not null check(urgencia in ('planejamento','30_dias','urgente')),mensagem text not null,status text not null default 'novo' check(status in ('novo','visto','respondido','sem_resposta','bloqueado_plano','spam')),origem text not null default 'perfil',consentimento_id uuid not null references public.consentimentos(id),visto_em timestamptz,respondido_em timestamptz,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),unique(pedido_id,fornecedor_id));
create table public.lead_notas(id uuid primary key default gen_random_uuid(),lead_id uuid not null references public.leads(id),autor_id uuid not null references public.profiles(id),texto text not null check(length(texto) between 1 and 2000),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now());
alter table public.leads enable row level security;
alter table public.lead_notas enable row level security;
create index on public.leads(fornecedor_id,criado_em desc);
create index on public.leads(status,criado_em);
create index on public.leads(segmento_id);
create index on public.leads(solicitante_id);
create index on public.leads(consentimento_id);
create index on public.lead_notas(lead_id,criado_em);
create index on public.lead_notas(autor_id);
create policy leads_read on public.leads for select to authenticated using(private.can_edit_supplier(fornecedor_id) or private.has_role(auth.uid(),'comercial'));
create policy notes_read on public.lead_notas for select to authenticated using(exists(select 1 from public.leads l where l.id=lead_id and private.can_edit_supplier(l.fornecedor_id)));
create trigger set_atualizado_em before update on public.leads for each row execute function private.set_atualizado_em();
create trigger set_atualizado_em before update on public.lead_notas for each row execute function private.set_atualizado_em();
create trigger gravar_audit after insert or update or delete on public.leads for each row execute function private.gravar_audit();
create trigger gravar_audit after insert or update or delete on public.lead_notas for each row execute function private.gravar_audit();
create function private.accept_quotation(p_id uuid,p_ip text,p_hash text,p_data jsonb,p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
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
create function private.list_leads(sid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.can_edit_supplier(sid) and not private.has_role(auth.uid(),'comercial') then raise exception 'Acesso negado';end if;
 return coalesce((select jsonb_agg((case when l.status='bloqueado_plano' and not private.has_role(auth.uid(),'admin') then jsonb_build_object('id',l.id,'fornecedor_id',l.fornecedor_id,'segmento_id',l.segmento_id,'cidade',l.cidade,'uf',l.uf,'status',l.status,'criado_em',l.criado_em,'atualizado_em',l.atualizado_em) else to_jsonb(l)-'pedido_id'-'consentimento_id'-'solicitante_id' end)||jsonb_build_object('notas',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'texto',n.texto,'criado_em',n.criado_em) order by n.criado_em) from public.lead_notas n where n.lead_id=l.id and l.status<>'bloqueado_plano' and private.can_edit_supplier(l.fornecedor_id)),'[]')) order by l.criado_em desc) from public.leads l where l.fornecedor_id=sid),'[]');end;$$;
create function private.manage_lead(lid uuid,p_action text,p_text text) returns void language plpgsql security definer set search_path='' as $$declare l public.leads;begin
 select * into l from public.leads where id=lid for update;
 if not found or not private.can_edit_supplier(l.fornecedor_id) then raise exception 'Acesso negado';end if;
 if l.status='bloqueado_plano' then raise exception 'Pedido bloqueado pelo plano';end if;
 if p_action='visto' then update public.leads set visto_em=coalesce(visto_em,now()),status=case when status='novo' then 'visto' else status end where id=lid;
 elsif p_action='respondido' then if l.status='spam' then raise exception 'Pedido marcado como spam';end if;update public.leads set visto_em=coalesce(visto_em,now()),respondido_em=coalesce(respondido_em,now()),status='respondido' where id=lid;
 elsif p_action='nota' then if length(trim(coalesce(p_text,''))) not between 1 and 2000 or p_text ~ '[<>]' then raise exception 'Nota inválida';end if;insert into public.lead_notas(lead_id,autor_id,texto) values(lid,auth.uid(),trim(p_text));
 elsif p_action='spam' then update public.leads set status='spam' where id=lid;
 else raise exception 'Ação inválida';end if;end;$$;
create function private.prepare_lead_reminders() returns integer language plpgsql security definer set search_path='' as $$declare l record;total integer:=0;begin
 for l in select x.id,x.fornecedor_id,f.nome_fantasia,u.email from public.leads x join public.fornecedores f on f.id=x.fornecedor_id join public.profiles p on p.id=f.dono_id join auth.users u on u.id=f.dono_id where x.status in ('novo','visto') and x.respondido_em is null and x.criado_em<=now()-interval '48 hours' and p.ativo for update of x skip locked loop
 update public.leads set status='sem_resposta' where id=l.id;
 insert into public.email_outbox(fornecedor_id,destinatario,template,chave,payload) values(l.fornecedor_id,l.email,'orcamento_sem_resposta','48h:'||l.id,jsonb_build_object('empresa',l.nome_fantasia,'lead_id',l.id)) on conflict(chave) do nothing;total:=total+1;end loop;
 delete from private.quotation_requests r where r.criado_em<now()-interval '2 days' and not exists(select 1 from public.leads where pedido_id=r.id);
 return total;end;$$;
create function public.receber_orcamento(p_id uuid,p_ip text,p_hash text,p_data jsonb,p_user uuid default null) returns jsonb language sql set search_path='' as $$select private.accept_quotation(p_id,p_ip,p_hash,p_data,p_user)$$;
create function public.listar_orcamentos(sid uuid) returns jsonb language sql set search_path='' as $$select private.list_leads(sid)$$;
create function public.gerenciar_orcamento(lid uuid,p_action text,p_text text default '') returns void language sql set search_path='' as $$select private.manage_lead(lid,p_action,p_text)$$;
create function public.preparar_alertas_orcamento() returns integer language sql set search_path='' as $$select private.prepare_lead_reminders()$$;
revoke all on function private.accept_quotation(uuid,text,text,jsonb,uuid),private.list_leads(uuid),private.manage_lead(uuid,text,text),private.prepare_lead_reminders() from public;
revoke all on function public.receber_orcamento(uuid,text,text,jsonb,uuid),public.listar_orcamentos(uuid),public.gerenciar_orcamento(uuid,text,text),public.preparar_alertas_orcamento() from public;
grant execute on function private.accept_quotation(uuid,text,text,jsonb,uuid),private.prepare_lead_reminders(),public.receber_orcamento(uuid,text,text,jsonb,uuid),public.preparar_alertas_orcamento() to service_role;
grant execute on function private.list_leads(uuid),private.manage_lead(uuid,text,text),public.listar_orcamentos(uuid),public.gerenciar_orcamento(uuid,text,text) to authenticated;

grant usage on schema private to service_role;
