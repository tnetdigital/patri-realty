# Fase 8 — comercial

Implementação autorizada após o aceite da fase 7. Gestão em `/admin/comercial`, leitura de contratos próprios em `/painel/anuncios`, relatórios públicos revogáveis em `/relatorio/:token` e redirecionamento por ID em `/r/:id`. A prévia AppDeploy continua frontend-only: `/#/demonstracao-comercial` usa exclusivamente dados fictícios no navegador, sem cobranças, contas ou envio de e-mails.

Contratos guardam produto, anunciante, fornecedor opcional, valor negociado, vigência, situação, observação e confirmação manual de pagamento. Preços de referência são configuráveis e iniciam em zero; não geram cobranças. Banners e destaques exigem contrato compatível e período contido. A exibição depende de campanha e contrato ativos e da data atual; o campo pago não impõe uma regra adicional de exibição.

Banners têm imagens mobile e desktop, upload em bucket próprio (JPG/PNG/WebP/GIF até 5 MB), URL HTTPS de destino, posição, UF e especialidade opcionais. As cinco posições são home_topo, home_meio, materia_meio, guia_topo e segmento_topo. A interface exibe Publicidade. Campanhas da mesma posição alternam a cada dez segundos, com aba visível. A impressão exige ao menos 50% de visibilidade por um segundo e consentimento para análises. Cliques e impressões não identificam visitantes únicos. Recusar opcionais mantém a navegação; preferências podem ser reabertas no rodapé.

Destaques usam vagas 1–3 por especialidade e UF, com cidade opcional, e períodos semiabertos [início,fim). Uma exclusão GiST impede sobreposição mesmo sob concorrência. O fornecedor precisa possuir a especialidade. Reservas ativas geram Patrocinado e precedência na busca; pausar ou encerrar libera a reserva. Contratos cancelados retiram a exibição imediatamente; para liberar sua vaga também deve ser pausada a reserva.

Relatórios têm token aleatório de 256 bits, hash privado, validade de 90 dias e revogação imediata. Gerar novo token invalida o anterior. Mostram período, impressões, cliques, CTR e totais diários; incluem CSV e impressão/PDF pelo navegador. Não expõem finanças, contatos ou identificadores de visitantes. Filtros limitados a 365 dias. O backend guarda eventos idempotentes por até 45 dias e hashes de limite por até dois dias, sem IP em texto. HMAC do IP só no servidor, limite de 180 eventos/hora por identificador. O relatório é acessível a quem possuir o link, sem login.

A rotina protegida `alertas_comerciais` prepara avisos internos para admin/comercial em 30 e 7 dias antes do contrato, e em 15 dias antes do destaque, com chaves idempotentes. Integração local envia somente ao Mailpit; o cron e provedor de e-mail definitivos seguem dependentes da infraestrutura de produção. Não há disparos externos realizados nesta entrega.

## Implantação definitiva

Aplicar `supabase/migrations/20261021204719_commercial_advertising.sql`, publicar Edge `banner-event` e a atualização de `supplier-jobs`, configurar `BANNER_IP_SALT`, `SITE_URL`, serviço de e-mail e rotina periódica protegida. Frontend pode configurar `VITE_BANNER_EVENT_URL`; gateway local em `http://127.0.0.1:8788/banner-event`. Nunca publicar chaves privilegiadas no frontend. RLS restringe contratos ao próprio fornecedor e às equipes comerciais; edição apenas por RPC para admin/comercial. As pendências externas Stripe da fase 6 permanecem.

## Validação

334 assertivas SQL, 30 testes unitários, 16 HTTP, fluxo real de campanha/evento/relatório e demonstração móvel de contratos, preços, consentimento e três vagas. Builds cliente/SSR, testes SSR de guia e editorial e advisors do banco sem alertas. A rodada completa teve 25 testes E2E aprovados. Os fluxos comerciais foram repetidos após o ajuste de carregamento de cidades e preservação das datas. Snapshot final 1792617042837, plataforma pronta sem erros de execução. Três fluxos comerciais também aprovados no endereço público, inclusive no celular.
