begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
grant usage on schema extensions to authenticated,anon,service_role;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
('fa000000-0000-4000-8000-000000000001','correction@test.example','{"nome":"Teste","tipo":"fornecedor","empresa":"Teste Correção","cnpj":"11222333000181","telefone":"11999999999","termos":true,"termos_versao":"2026-10-21","privacidade_versao":"2026-10-21"}'),
('fa000000-0000-4000-8000-000000000002','staff@test.example','{"nome":"Staff","tipo":"sindico","cidade":"São Paulo","estado":"SP","termos":true,"termos_versao":"2026-10-21","privacidade_versao":"2026-10-21"}');
select set_config('test.sid',(select id::text from public.fornecedores where dono_id='fa000000-0000-4000-8000-000000000001'),true);

insert into public.avaliacoes(fornecedor_id,autor_id,nota,titulo,texto) values(current_setting('test.sid')::uuid,'fa000000-0000-4000-8000-000000000002',5,'Avaliação','Avaliação privada para testar conta inativa');
update public.profiles set ativo=false where id='fa000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','fa000000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.avaliacoes),0::bigint,'F08 inativa sem linhas diretas');
select is(public.listar_avaliacoes(current_setting('test.sid')::uuid,'minha')->>'total','0','F08 RPC inativa sem linhas');
reset role;
select ok(not private.media_safe('https://untrusted.example/?path=/storage/v1/object/public/fornecedores/'||current_setting('test.sid')||'/logo.webp',current_setting('test.sid')::uuid),'F09 substring host recusada');
select ok(private.media_safe('http://127.0.0.1:54321/storage/v1/object/public/fornecedores/'||current_setting('test.sid')||'/logo.webp',current_setting('test.sid')::uuid),'F09 prefixo permitido');
select ok(not private.media_safe('http://127.0.0.1:54321.evil/storage/v1/object/public/fornecedores/'||current_setting('test.sid')||'/logo.webp',current_setting('test.sid')::uuid),'F09 host exato');
select is(public.document_version(),'2026-10-21','F12 versão publicada');
select has_function('public','meus_orcamentos',array['integer'],'F10 histórico próprio');
select has_table('public','mensagens','F16 mensagens persistidas');

update public.profiles set ativo=true where id='fa000000-0000-4000-8000-000000000002';
insert into private.quotation_requests(id,ip_hash,payload_hash) values('fd000000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64)),('fd000000-0000-4000-8000-000000000002',repeat('c',64),repeat('d',64));
insert into public.consentimentos(id,email,documento,versao,origem) values('fe000000-0000-4000-8000-000000000001','staff@test.example','privacidade',public.document_version(),'teste');
insert into public.leads(pedido_id,fornecedor_id,solicitante_id,segmento_id,nome,email,telefone,condominio_nome,cidade,uf,unidades,urgencia,mensagem,consentimento_id)
select ('fd000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,current_setting('test.sid')::uuid,('fa000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,(select id from public.segmentos where ativo limit 1),'Síndico Teste','staff@test.example','11999999999','Condomínio Teste','Campinas','SP',30,'planejamento','Pedido privado número '||n,'fe000000-0000-4000-8000-000000000001' from generate_series(1,2)n;
set local role authenticated;
select set_config('request.jwt.claim.sub','fa000000-0000-4000-8000-000000000002',true);
select is(public.meus_orcamentos(1)->>'total','1','F10 síndico lê apenas pedido próprio');
select is(public.meus_orcamentos(1)#>>'{items,0,mensagem}','Pedido privado número 2','F10 não devolve pedido de outra conta');
select lives_ok($$select public.enviar_mensagem('Síndico Teste','staff@test.example','Mensagem de contato para verificar persistência')$$,'F16 contato grava mensagem');
select is((select count(*) from public.mensagens),1::bigint,'F16 autor vê a própria mensagem');
select set_config('request.jwt.claim.sub','fa000000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.mensagens),0::bigint,'F16 outra conta não lê mensagem');
reset role;
select * from finish();rollback;
