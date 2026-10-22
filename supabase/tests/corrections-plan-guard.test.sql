begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
grant usage on schema extensions to authenticated,anon,service_role;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
('fa000000-0000-4000-8000-000000000001','correction@test.example','{"nome":"Teste","tipo":"fornecedor","empresa":"Teste Correção","cnpj":"11222333000181","telefone":"11999999999","termos":true,"termos_versao":"2026-10-21","privacidade_versao":"2026-10-21"}'),
('fa000000-0000-4000-8000-000000000002','staff@test.example','{"nome":"Staff","tipo":"sindico","cidade":"São Paulo","estado":"SP","termos":true,"termos_versao":"2026-10-21","privacidade_versao":"2026-10-21"}');
select set_config('test.sid',(select id::text from public.fornecedores where dono_id='fa000000-0000-4000-8000-000000000001'),true);
insert into public.user_roles(user_id,role) values('fa000000-0000-4000-8000-000000000002','comercial');
insert into public.assinaturas(fornecedor_id,plano,status,periodo_ate,stripe_subscription_id) values(current_setting('test.sid')::uuid,'premium','ativa',now()+interval '30 days','sub_fix');
update public.fornecedores set teste_fim=now()+interval '90 days' where id=current_setting('test.sid')::uuid;
select is((select plano_codigo from public.fornecedores where id=current_setting('test.sid')::uuid),private.effective_plan(current_setting('test.sid')::uuid),'F02 cache do plano segue função única mesmo com teste e pago');
grant update(plano_codigo) on public.fornecedores to service_role;
set local role service_role;
select throws_ok($$update public.fornecedores set plano_codigo='gratuito'$$,'42501',null,'F02 nem papel de serviço altera plano diretamente');
reset role;select * from finish();rollback;
