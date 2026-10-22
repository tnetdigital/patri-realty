# Fase 4 — Orçamentos

O usuário aprovou a fase 3 e autorizou a próxima fase. Entrega: 20/10/2026.

## Fluxos implementados

O perfil público oferece “Pedir orçamento”, inclusive na barra móvel. O formulário solicita nome, e-mail, WhatsApp, condomínio, cidade/UF, unidades, prazo, descrição e aceite específico de compartilhamento. Permite escolher até duas empresas adicionais da mesma especialidade. Não inclui publicidade no consentimento.

A Edge Function `quotation` valida origem, tamanho, CAPTCHA Cloudflare Turnstile (hostname e action), honeypot e sessão opcional. Não aceita IP, status ou identidade privilegiada enviados pelo formulário. Deriva um HMAC do IP recebido do gateway com salt privado. O serviço usa uma RPC restrita ao papel service_role: a chave nunca vai ao navegador.

O banco revalida o pedido e os fornecedores públicos/ativos, registra consentimento e grava os destinatários e e-mails na mesma transação. Locks por IP e request UUID evitam corrida no limite de cinco envios por janela móvel de uma hora. A tentativa repetida com mesmo identificador e payload não cria outro pedido; payload diferente com identificador reutilizado é rejeitado. O sexto pedido retorna HTTP 429. Cópias para destinatários inválidos cancelam toda a transação.

A caixa de pedidos fica em `/painel/orcamentos` e no botão “Pedidos de orçamento”. Inclui filtros de status, leitura, contatos, unidades/prazo, mensagem, linha do tempo, notas internas, registro manual da resposta e marcação de spam com confirmação. Abrir WhatsApp/e-mail não declara a resposta como realizada. Fornecedores não consultam nem alteram pedidos de outras empresas. A equipe autorizada e o admin têm acesso; comercial é somente leitura pela RPC. As tabelas não têm leitura/escrita direta liberada ao cliente. DTO de pedido bloqueado omite contato, texto e notas.

A rotina `preparar_alertas_orcamento` muda pedidos novos/vistos sem resposta há 48 horas para `sem_resposta`, com lembrete único. Não altera respondidos/spam/bloqueados. O worker de e-mails existente foi estendido com notificação ao fornecedor, confirmação ao solicitante e lembrete. As mensagens ao fornecedor levam ao painel; não colocam contatos do solicitante no corpo. A fila tem reserva/retry e idempotência de entrega no Resend.

## Testes e execução local

1. `npm run local:up` — stack PostgreSQL/Auth/API/Storage/Mailpit, migrations e variáveis públicas locais.
2. `npm run dev` — aplicação em 5173.
3. `npm run local:quotations` — gateway **somente local** em 8788; usa o mesmo handler HTTP da Edge, fixture explícita no lugar do Turnstile, SMTP somente no Mailpit e rotina horária enquanto estiver rodando. Não hospedar este script publicamente.
4. `npm run local:test:e2e` inicia os dois servidores automaticamente se necessário.

Verificações aprovadas nesta entrega:

- 139 assertivas SQL, incluindo isolamento/RLS, contato bloqueado, idempotência, sexto envio, status, notas e lembrete único.
- 18 testes unitários e 4 testes da fronteira HTTP, incluindo CAPTCHA incorreto, CORS, tamanho, honeypot, hash e falha recuperável.
- 10 Playwright, incluindo orçamento no celular, e-mails reais para o Mailpit, alerta de 48h, painel, nota e resposta após recarga.
- Teste SSR existente aprovado, inclusive hidratação móvel e ausência de campos internos no HTML.
- Teste completo da demonstração móvel: formulário inválido, envio simulado, painel, notas, simulação de 48h, resposta persistente e limpeza confirmada.
- `deno check` das duas Edge Functions aprovado. Supabase db advisors de segurança: nenhum problema reportado. Build cliente/SSR e formatação aprovados.

## Configuração do ambiente definitivo

Aplicar a migration `20261020015016_quotation_leads.sql` e publicar `quotation` e `supplier-jobs`. Configurar no servidor: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `TURNSTILE_SECRET_KEY`, `QUOTATION_IP_SALT` persistente/aleatório, `RESEND_API_KEY`, `EMAIL_FROM` e `SUPPLIER_JOBS_SECRET`. No build do cliente: chaves públicas Supabase, `VITE_TURNSTILE_SITE_KEY`, `VITE_SITE_URL` e opcional `VITE_QUOTATION_URL` (padrão: URL da Edge quotation). Nunca usar o gateway/fixture local em produção.

O IP deve ser fornecido pelo gateway confiável do Supabase (`x-forwarded-for`); em self-hosting, o proxy de entrada precisa remover valores recebidos do cliente e definir o endereço real. Não expor a Edge diretamente atrás de um proxy que preserve um header arbitrário.

O arquivo `supabase/schedules/quotation-jobs.sql` registra o worker protegido via pg_cron/pg_net e Vault. Preparar os segredos supplier_jobs_url e supplier_jobs_secret no Vault e ativar as extensões antes de aplicá-lo. A checagem idempotente de 48h pode rodar a cada minuto com a entrega da fila; portanto cumpre a cadência horária do requisito. O cron hospedado e as credenciais externas **não estão configurados** nesta entrega.

Antes de receber dados reais no domínio definitivo, completar a política de privacidade com responsável, canal de direitos e retenção. A página informa o funcionamento do orçamento e identifica o ambiente de desenvolvimento. Planos/cotas/créditos serão implementados na fase de monetização; esta fase não aplica cobrança ou limite mensal do plano Grátis. A proteção de DTO já contempla status bloqueado. Convite para avaliação após 15 dias depende da fase de avaliações.

## Prévia

A prévia estática permanece no mesmo endereço. Orçamentos nela são simulações identificadas, armazenadas somente no navegador e removíveis pela caixa de pedidos; não enviam e-mails nem usam o banco local. O botão “Simular passagem de 48 horas” é exclusivo da demonstração. O backend definitivo continua desconectado.

https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/guia

Snapshot AppDeploy: `1792461632530`. Status ready, sem erros de frontend, rede ou backend na inspeção do provedor.
