# Fase 6 — Planos, cobrança e créditos

Autorização: fase 5 aprovada e pedido para iniciar a fase seguinte. Implementação da fase 6 da especificação, preservando mobile first e ausência de emojis.

## Funcionalidades

- Planos Grátis, Premium e Destaque com limites no banco e preços editáveis. Os preços reais pagos começam em zero e o checkout permanece bloqueado até definição comercial. A prévia usa preços ilustrativos identificados.
- Assinatura de teste vinculada à aprovação, duração herdada da fase 5, teste único por CNPJ e extensão com motivo. O plano efetivo considera imediatamente as datas, inclusive antes do processamento agendado.
- Fim do teste e carência: migração para Grátis; fotos, serviços e cases excedentes ficam ocultos, preservados e voltam ao reativar o plano. Vídeo e selo também respeitam os benefícios. Os dados públicos aplicam limites no momento da leitura. A busca por relevância considera a prioridade do plano, sem inventar patrocinador.
- Quota por mês civil em America/Sao_Paulo: três primeiros pedidos no Grátis, seguintes bloqueados. A RPC retorna apenas especialidade, cidade/UF, status e datas do pedido bloqueado. A tabela de leads continua sem leitura direta pelo cliente. O upgrade libera pedidos bloqueados; a alternativa é gastar um crédito.
- Desbloqueio restrito ao proprietário, com bloqueio transacional do fornecedor, saldo conferido no servidor e lançamento único por pedido. Repetir a requisição não debita novamente.
- Extrato de compra, uso, ajustes e cortesia; créditos não expiram; estorno proporcional acumulado evita débitos duplicados. Saldo negativo após estorno de créditos consumidos impede novo uso.
- Página /painel/plano com plano, contagem de teste, comparativo, pacotes, saldo, extrato, pagamentos, CSV e acesso ao portal de cobrança. Admin /admin/planos com preços, limites, testes, assinaturas e exportação contábil; comercial somente consulta.
- Cortesia de uma matéria ao completar 100% durante o teste, registro único por fornecedor, separado do saldo de créditos para orçamento. Consumo editorial será implementado na fase de conteúdo.
- Régua 0/2/5/7/60/80/88, resumo com pedidos e preço configurado, aviso de fim do teste e notificações de pagamento. O worker protegido existente executa o ciclo antes da entrega de e-mails; no ambiente local a rotina horária usa apenas Mailpit.

## Pagamentos e segurança

Edge Functions `criar-checkout` e `webhook-stripe` com handler compartilhado. Identidade atual validada no Auth; propriedade e preços verificados no banco. Cliente não informa valor confiável. Checkout usa chave de idempotência; assinaturas verificam preço BRL mensal no Stripe. Pacotes aceitam cartão e Pix quando habilitados na conta. Checkout assíncrono não libera recursos enquanto não estiver pago.

O webhook valida HMAC SHA-256 do corpo bruto, timestamp com tolerância de cinco minutos e assinatura v1. Recupera o objeto atual no provedor antes de gravar. Trata checkout, confirmação assíncrona, faturas pagas/falhas, atualização/cancelamento de assinatura e estornos. IDs processados e transições de pedido impedem crédito duplicado mesmo com outro evento para o mesmo checkout. Cancelamento agendado preserva o período pago. Carência de sete dias termina em Grátis. Nenhuma confirmação é baseada na URL de retorno do navegador.

Novas tabelas com RLS, sem escrita direta de saldo/assinatura/pagamento pelo cliente. Escritas administrativas e financeiras auditadas. Funções privilegiadas privadas com search_path fixo, verificação de papel e permissões EXECUTE explícitas. Advisors de segurança e desempenho sem avisos após otimização das políticas existentes.

## Estado real da integração externa

A prévia pública é frontend demonstrativo, sem backend de produção ou credenciais Stripe. Não realiza cobranças. O fluxo real de conta Stripe em modo teste **ainda depende** de STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, configuração de preços/produtos e endpoint externo. Não foi executado pagamento na rede Stripe. Os testes HTTP usam provedor controlado; a integração adicional usa Auth, REST e Postgres reais locais com o transporte Stripe explicitamente simulado.

Para ativação: configurar secrets no ambiente Edge, SITE_URL, preços mensais BRL correspondentes aos Price IDs no admin, pacotes, portal do cliente e Pix na conta; registrar eventos citados acima; configurar no Stripe três tentativas em sete dias e agendar o worker protegido de forma horária. Validar cartão de teste, Pix, cancelamento e estorno na conta Stripe antes de ativar cobrança real. Sem esses dados o sistema mostra pagamento não configurado e não cobra. O aceite externo de compra Stripe em modo teste permanece pendente, portanto não iniciar automaticamente a fase 7 como se essa homologação tivesse sido feita.

## Validação

235 assertivas SQL, 27 testes unitários, nove testes HTTP e 18 cenários Playwright passaram. Build client/SSR, hidratação e integração SSR aprovados. Teste adicional `node scripts/test-billing-integration.mjs`: Auth real, preço do banco, checkout com transporte controlado, assinatura do evento, saldo 0 antes de pago, saldo 10 após e repetição sem duplicação.

Prévia de análise: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-plano

Publicação: snapshot 1792487697702, hospedagem pronta sem erros de frontend ou rede. Fluxo conferido na URL pública com scripts/test-billing-preview.mjs: teste, conteúdo preservado, falta de saldo, compra simulada, evento repetido, débito, persistência, upgrade e edição do preço no admin. Formatação e typecheck das três Edge Functions aprovados.
