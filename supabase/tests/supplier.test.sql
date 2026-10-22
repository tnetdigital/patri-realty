begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to anon,authenticated;
select no_plan();
-- Explicit fixture origin, never a permissive production substring.
update public.configuracoes set valor=valor||'"http://localhost"'::jsonb where chave='media_origins';
insert into auth.users(id,email,raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','owner@phase2.test','{"nome":"Dono Fase Dois","tipo":"fornecedor","empresa":"Empresa Fase Dois","cnpj":"11222333000181","telefone":"11999999999","termos":true,"termos_versao":"2026-10-19","privacidade_versao":"2026-10-19"}'),
('10000000-0000-4000-8000-000000000002','other@phase2.test','{"nome":"Outro Dono","tipo":"fornecedor","empresa":"Outra Empresa","cnpj":"04252011000110","telefone":"11999999999","termos":true,"termos_versao":"2026-10-19","privacidade_versao":"2026-10-19"}'),
('10000000-0000-4000-8000-000000000003','editor@phase2.test','{"nome":"Editor da Equipe","tipo":"sindico","cidade":"São Paulo","estado":"SP","termos":true,"termos_versao":"2026-10-19","privacidade_versao":"2026-10-19"}');
select set_config('test.sid',(select id::text from public.fornecedores where dono_id='10000000-0000-4000-8000-000000000001'),true);
select set_config('test.step0','{"nome_fantasia":"Empresa Fase Dois","razao_social":"Exemplo","cnpj":"11222333000181","whatsapp":"11999999999","telefone":"","email":"vendas@example.com","site":"https://example.com","instagram":"exemplo","cep":"","endereco":""}',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select ok(public.obter_fornecedor(current_setting('test.sid')::uuid) is not null,'dono carrega o próprio perfil');
select throws_ok($$update public.fornecedores set status='publicado' where id=current_setting('test.sid')::uuid$$,'42501',null,'fornecedor não publica por UPDATE');
select throws_ok($$select public.enviar_fornecedor(current_setting('test.sid')::uuid)$$,'P0001',null,'envio incompleto bloqueado');
select lives_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,0,current_setting('test.step0')::jsonb)$$,'salva etapa empresa');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,0,current_setting('test.step0')::jsonb||'{"cnpj":"11222333000180"}')$$,'P0001','CNPJ inválido','valida CNPJ no servidor');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,0,current_setting('test.step0')::jsonb||'{"cnpj":"04252011000110"}')$$,'P0001','CNPJ_DUPLICADO: solicite a reivindicação da página','CNPJ duplicado bloqueado');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,0,current_setting('test.step0')::jsonb||'{"site":"http://example.com"}')$$,'P0001',null,'HTTP rejeitado');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,0,current_setting('test.step0')::jsonb||'{"nome_fantasia":"<script>x</script>"}')$$,'P0001',null,'HTML rejeitado');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,0,current_setting('test.step0')::jsonb,'2000-01-01'::timestamptz)$$,'P0001',null,'conflito de versão bloqueia sobrescrita');
select lives_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,1,jsonb_build_object('logo_url','http://localhost/storage/v1/object/public/fornecedores/'||current_setting('test.sid')||'/logo.webp','capa_url','http://localhost/storage/v1/object/public/fornecedores/'||current_setting('test.sid')||'/cover.webp'))$$,'marca na pasta da empresa');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,1,'{"logo_url":"https://evil.test/logo.webp"}')$$,'P0001',null,'marca externa não autorizada bloqueada');
select lives_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,2,jsonb_build_object('descricao_curta','Descrição da empresa','sobre',repeat('Texto de apresentação sem contato. ',12),'ano_fundacao','2015','segmentos',(select jsonb_agg(id) from (select id from public.segmentos limit 1) s)))$$,'salva texto e segmento');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,2,jsonb_build_object('descricao_curta','Descrição','sobre','Ligue 11999999999','segmentos',(select jsonb_agg(id) from (select id from public.segmentos limit 1) s)))$$,'P0001',null,'contato no Sobre bloqueado');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,2,jsonb_build_object('descricao_curta','Descrição','segmentos',(select jsonb_agg(id) from (select id from public.segmentos limit 4) s)))$$,'P0001',null,'mais de três segmentos bloqueado');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,3,jsonb_build_object('cobertura',jsonb_build_array(jsonb_build_object('uf','RJ','cidade_id',(select id from public.cidades where uf='SP' limit 1)))))$$,'P0001',null,'cidade de outro estado bloqueada');
select lives_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,3,'{"cobertura":[{"uf":"SP","cidade_id":null}]}')$$,'salva cobertura estadual');
select lives_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,4,jsonb_build_object(
 'servicos',(select jsonb_agg(jsonb_build_object('titulo','Serviço '||n,'descricao','Exemplo','foto_url','')) from generate_series(1,3)n),
 'midias',(select jsonb_agg(jsonb_build_object('url','http://localhost/storage/v1/object/public/fornecedores/'||current_setting('test.sid')||'/'||n||'.webp','legenda','Foto')) from generate_series(1,5)n),
 'cases','[{"condominio":"Condomínio Exemplo","descricao":"Exemplo","foto_url":""}]'::jsonb,
 'faqs',(select jsonb_agg(jsonb_build_object('pergunta','Como funciona?','resposta','Resposta demonstrativa.')) from generate_series(1,3)n),
 'certificacoes','[]'::jsonb,'instagram_posts','[]'::jsonb,'video_url',''))$$,'salva conteúdo completo');
select is((public.obter_fornecedor(current_setting('test.sid')::uuid)->>'completude')::int,90,'completude real sem inventar avaliações');
select lives_ok($$insert into storage.objects(bucket_id,name) values('fornecedores',current_setting('test.sid')||'/foto.webp')$$,'dono grava na própria pasta');
select throws_ok($$insert into storage.objects(bucket_id,name) values('fornecedores','00000000-0000-4000-8000-000000000000/foto.webp')$$,'42501',null,'upload em pasta alheia bloqueado');
select lives_ok($$select public.convidar_membro(current_setting('test.sid')::uuid,'editor@phase2.test')$$,'dono cria convite');
select throws_ok($$select public.convidar_membro(current_setting('test.sid')::uuid,'editor@phase2.test')$$,'P0001',null,'convite duplicado bloqueado');
select throws_ok($$select * from public.convites$$,'42501',null,'tokens não expostos por consulta direta');
reset role;
select set_config('test.token',(select payload->>'token' from public.email_outbox where destinatario='editor@phase2.test'),true);
select is((select length(token_hash) from public.convites where email='editor@phase2.test'),64,'convite armazena hash');
select ok((select token_hash<>current_setting('test.token') from public.convites where email='editor@phase2.test'),'hash é diferente do token de aceite');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select is(public.obter_fornecedor(current_setting('test.sid')::uuid),null::jsonb,'outro fornecedor não lê a página');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,0,current_setting('test.step0')::jsonb)$$,'P0001','Acesso negado','outro fornecedor não edita');
select throws_ok($$select public.aceitar_convite(current_setting('test.token'))$$,'P0001','Entre com o mesmo e-mail do convite','token vinculado ao e-mail');
select is((select count(*) from public.servicos where fornecedor_id=current_setting('test.sid')::uuid),0::bigint,'serviços isolados por empresa');
select is((select count(*) from public.midias where fornecedor_id=current_setting('test.sid')::uuid),0::bigint,'galeria isolada');
select is((select count(*) from public.cases where fornecedor_id=current_setting('test.sid')::uuid),0::bigint,'cases isolados');
select is((select count(*) from public.faqs where fornecedor_id=current_setting('test.sid')::uuid),0::bigint,'FAQ isolado');
select is((select count(*) from public.cobertura where fornecedor_id=current_setting('test.sid')::uuid),0::bigint,'cobertura isolada');
select is((select count(*) from public.fornecedor_segmentos where fornecedor_id=current_setting('test.sid')::uuid),0::bigint,'segmentos da empresa isolados');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select lives_ok($$select public.aceitar_convite(current_setting('test.token'))$$,'membro aceita com e-mail correto');
select ok(public.has_role(auth.uid(),'fornecedor'),'aceite concede somente papel fornecedor');
select ok(public.obter_fornecedor(current_setting('test.sid')::uuid) is not null,'membro acessa a empresa');
select throws_ok($$select public.aceitar_convite(current_setting('test.token'))$$,'P0001',null,'convite não pode ser reutilizado');
select throws_ok($$select public.convidar_membro(current_setting('test.sid')::uuid,'outro@example.com')$$,'P0001','Somente o dono pode convidar','editor não gerencia equipe');
select lives_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,0,current_setting('test.step0')::jsonb)$$,'editor pode editar o conteúdo');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.convidar_membro(current_setting('test.sid')::uuid,'pessoa2@example.com')$$,'segunda vaga');
select lives_ok($$select public.convidar_membro(current_setting('test.sid')::uuid,'pessoa3@example.com')$$,'terceira vaga');
select throws_ok($$select public.convidar_membro(current_setting('test.sid')::uuid,'pessoa4@example.com')$$,'P0001','Limite de membros atingido','quarta vaga recusada');
select lives_ok($$select public.revogar_membro(current_setting('test.sid')::uuid,(select id from public.fornecedor_membros where fornecedor_id=current_setting('test.sid')::uuid),false)$$,'dono revoga membro sem apagar');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select is(public.obter_fornecedor(current_setting('test.sid')::uuid),null::jsonb,'revogação remove acesso imediatamente');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.enviar_fornecedor(current_setting('test.sid')::uuid)$$,'perfil completo enviado para análise');
select is(public.obter_fornecedor(current_setting('test.sid')::uuid)->>'status','em_analise','envio não publica');
select throws_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,0,current_setting('test.step0')::jsonb)$$,'P0001',null,'edição pausada em análise');
reset role;
select is((select count(*) from public.email_outbox where template='perfil_em_analise' and fornecedor_id=current_setting('test.sid')::uuid),1::bigint,'envio gera uma notificação');
select ok((select count(*) from public.audit_log where tabela='fornecedores' and depois->>'status'='em_analise')>0,'mudança de status auditada');
update public.fornecedores set status='publicado' where id=current_setting('test.sid')::uuid;
select set_config('test.slug',(select slug from public.fornecedores where id=current_setting('test.sid')::uuid),true);
set local role authenticated;
select lives_ok($$select public.salvar_fornecedor(current_setting('test.sid')::uuid,0,current_setting('test.step0')::jsonb||'{"nome_fantasia":"Novo Nome Sensível"}')$$,'mudança sensível vira proposta');
select is(public.obter_fornecedor(current_setting('test.sid')::uuid)->>'nome_fantasia','Empresa Fase Dois','nome anterior continua publicado');
select is(public.obter_fornecedor(current_setting('test.sid')::uuid)->>'slug',current_setting('test.slug'),'slug permanece estável');
select is((select depois from public.fornecedor_alteracoes where fornecedor_id=current_setting('test.sid')::uuid and campo='nome_fantasia'),'Novo Nome Sensível','proposta armazenada separadamente');

-- Expired invites and profile reminder idempotency.
reset role;
select set_config('test.expired',(select payload->>'token' from public.email_outbox where destinatario='pessoa2@example.com'),true);
update public.convites set expira_em=now()-interval '1 day' where email='pessoa2@example.com';
select ok(public.inspecionar_convite(current_setting('test.expired')) is null,'convite expirado não revela dados');
update public.fornecedores set cadastro_em=now()-interval '2 days' where dono_id='10000000-0000-4000-8000-000000000002';
select is(public.preparar_lembretes_fornecedor(),1,'régua prepara lembrete do dia 2');
select is(public.preparar_lembretes_fornecedor(),0,'régua não duplica lembrete');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.convidar_membro(current_setting('test.sid')::uuid,'novo@phase2.test')$$,'vaga expirada fica livre');
reset role;
select set_config('test.newtoken',(select payload->>'token' from public.email_outbox where destinatario='novo@phase2.test'),true);
insert into auth.users(id,email,raw_user_meta_data) values('10000000-0000-4000-8000-000000000004','novo@phase2.test',jsonb_build_object('nome','Novo Convidado','tipo','membro_fornecedor','convite',current_setting('test.newtoken'),'termos',true,'termos_versao','2026-10-19','privacidade_versao','2026-10-19'));
select is((select count(*) from public.fornecedor_membros where user_id='10000000-0000-4000-8000-000000000004' and ativo),1::bigint,'cadastro por convite vincula empresa');
select is((select count(*) from public.fornecedores where dono_id='10000000-0000-4000-8000-000000000004'),0::bigint,'editor convidado não cria outra empresa');
select is((select count(*) from public.consentimentos where user_id='10000000-0000-4000-8000-000000000004'),2::bigint,'convite registra consentimentos');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select throws_ok('select public.reservar_emails_fornecedor()','42501',null,'usuários não executam disparador de e-mail');
reset role;
set local role anon;
select throws_ok('select * from public.fornecedores','42501',null,'sem catálogo público nesta fase');
select throws_ok('select * from public.email_outbox','42501',null,'fila de e-mail nunca é pública');
select ok(public.inspecionar_convite('invalido') is null,'token inválido não revela convite');
reset role;
select * from finish();
rollback;
