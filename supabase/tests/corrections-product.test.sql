begin;
create extension if not exists pgtap with schema extensions;set local search_path=public,extensions;grant usage on schema extensions to authenticated;select no_plan();
select has_function('public','relatorio_editorial',array['uuid','date','date','integer'],'F18 relatório editorial com período');
select has_function('public','calendario_comercial',array['date','date','integer'],'F19 calendário com período');
set local role authenticated;
select throws_ok($$select public.relatorio_editorial(null,current_date-30,current_date,1)$$,'P0001','Acesso negado','F18 leitura protegida');
select throws_ok($$select public.calendario_comercial(current_date-30,current_date,1)$$,'P0001','Acesso negado','F19 faturamento protegido');
reset role;
insert into auth.users(id,email,raw_user_meta_data) values
('fa000000-0000-4000-8000-000000000001','correction@test.example','{"nome":"Teste","tipo":"fornecedor","empresa":"Teste Correção","cnpj":"11222333000181","telefone":"11999999999","termos":true,"termos_versao":"2026-10-21","privacidade_versao":"2026-10-21"}'),
('fa000000-0000-4000-8000-000000000002','staff@test.example','{"nome":"Staff","tipo":"sindico","cidade":"São Paulo","estado":"SP","termos":true,"termos_versao":"2026-10-21","privacidade_versao":"2026-10-21"}');
select set_config('test.sid',(select id::text from public.fornecedores where dono_id='fa000000-0000-4000-8000-000000000001'),true);

insert into public.user_roles(user_id,role) values('fa000000-0000-4000-8000-000000000002','admin');
insert into public.materias(id,titulo,slug,autor_id,tipo,status,publicada_em) values('fc000000-0000-4000-8000-000000000001','Matéria de medição','medicao-correcao','fa000000-0000-4000-8000-000000000002','editorial','publicada',now());
insert into public.metricas_diarias(data,entidade,entidade_id,tipo_evento,quantidade) values(current_date,'materia','fc000000-0000-4000-8000-000000000001','visualizacao_materia',2),(current_date,'materia','fc000000-0000-4000-8000-000000000001','tempo_materia',4),(current_date,'materia','fc000000-0000-4000-8000-000000000001','clique_perfil_materia',1);
insert into public.contratos(anunciante_nome,produto,valor_centavos,inicio,fim,status,pago) values('Contrato vigente','banner',10000,now()-interval '1 day',now()+interval '1 day','ativo',true),('Contrato anterior','banner',5000,now()-interval '10 days',now()-interval '9 days','encerrado',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','fa000000-0000-4000-8000-000000000002',true);
select is(public.relatorio_editorial(null,current_date,current_date,1)#>>'{items,0,leituras}','2','F18 relatório conta leituras');
select is((public.relatorio_editorial(null,current_date,current_date,1)#>>'{items,0,tempo_medio_segundos}')::numeric,60.0,'F18 média de tempo visível');
select is(public.relatorio_editorial(null,current_date,current_date,1)#>>'{items,0,cliques_perfil}','1','F18 cliques atribuídos');
select is(public.calendario_comercial(current_date,current_date,1)->>'total','1','F19 período exclui listagem anterior');
select is(public.calendario_comercial(current_date,current_date,1)->>'recebido_centavos','10000','F19 receita sem duplicar contratos');
reset role;
select * from finish();rollback;
