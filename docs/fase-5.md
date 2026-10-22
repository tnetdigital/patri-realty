# Fase 5 — Administração

Aprovação recebida: “Ótimo aprovado pode seguir para a próxima fase”. Implementação corresponde à administração prevista na especificação.

## Entrega

- Painel com métricas operacionais, fornecedores, pedidos, usuários, especialidades, alterações pendentes, reivindicações, configurações e auditoria.
- Aprovação exige checklist manual de cinco itens e perfil mínimo válido; publica e abre teste de 90 dias uma única vez por CNPJ. Pedir ajuste, recusar e suspender exigem motivo e geram notificação.
- Edição administrativa pelo mesmo formulário validado do fornecedor, selo manual, plano de referência, extensão do teste e ajustes de créditos com motivo. Visualização privada de fornecedor somente leitura, sem assumir sua sessão, registrada na auditoria.
- CSV UTF-8 com nove colunas, prévia, erros por linha, processamento em lotes de 100, idempotência e relatório exportável paginado. Rascunhos importados não têm proprietário; convites individuais expiram em 14 dias, são vinculados ao e-mail e de uso único.
- Usuários: papéis, ativação, confirmação e exigência de nova senha. O último administrador ativo fica protegido. A senha pendente bloqueia permissões administrativas e acesso privado ao fornecedor até troca real no Auth.
- Pedidos: consulta, spam, reenvio e encaminhamento autorizado a fornecedor publicado da mesma especialidade; consentimento e motivo auditados.
- Especialidades: nome, grupo, ordem, ativação, exclusão somente sem vínculos históricos e redirecionamento de slug. Configurações limitadas a chaves e intervalos conhecidos.
- Escritas por RPC, autorização renovada no banco, RLS, trilha antes/depois e papel comercial somente consulta. Sem credenciais privilegiadas no navegador.

## Prévia e implantação

Prévia pública: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-admin

A prévia é frontend de demonstração com dados fictícios persistidos neste navegador. Não envia e-mails nem cria contas reais. A rota /admin permanece protegida. Backend, Auth, Storage, SMTP e permissões foram integrados e verificados no ambiente local; não foram conectados à hospedagem pública. Nenhuma credencial local foi publicada.

Cobrança automática, consumo/compra de créditos, conteúdo editorial, avaliações e contratos pertencem às próximas fases. As métricas desses módulos não são inventadas. Ajustes de plano/créditos nesta entrega são administrativos; não cobram nem substituem a integração de pagamentos.

## Verificação

Testes SQL cobrem checklist, aprovação, teste único, motivos, acesso comercial, último administrador, importação idempotente, convites, histórico e troca obrigatória de senha. Testes de navegador exercitam revisão real, projeção pública, ajuste, SMTP local e demonstração móvel com CSV. Build client/SSR, testes unitários e integração SSR complementam a validação. Resultados finais registrados na entrega.

Resultado final: 193 assertivas SQL, 25 testes unitários, 4 testes HTTP e 17 cenários Playwright aprovados; build client/SSR e integração SSR aprovados. Typecheck da função de jobs aprovado no Deno. O lint PL/pgSQL da CLI não executa neste Postgres local porque a extensão plpgsql_check não está instalada; isso não substitui nem invalida os testes funcionais e de autorização. Prévia publicada no snapshot 1792484412017, sem erros de frontend ou rede reportados pela hospedagem.

Conferência adicional na URL pública aprovada: checklist negativo/positivo, publicação simulada persistente, CSV com linha inválida e criação válida, auditoria, papel comercial sem escrita e ausência de overflow em 390px. Script reproduzível: scripts/test-admin-preview.mjs.
