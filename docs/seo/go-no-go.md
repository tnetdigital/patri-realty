# PT16 — decisão de homologação e lançamento

Atualização após consulta autenticada: Hostinger Premium confirmado; painel exige upgrade/plano compatível para Web Apps. patrirealty.com.br está Registrando. Supabase ainda não criado, conforme titular. [Preparação atual do backend](backend-preparacao-pt16.md): worker desacoplado da publicação e endpoint Edge editorial bloqueado localmente; RPC/crons SQL permanecem pendentes. NO-GO preservado.

Data: 23/10/2026. Base inspecionada: `852320d4980c561aec69df47d66d2958b2218327` (PT15).

**NO-GO: lançamento impedido. Preparação e verificações disponíveis concluídas; homologação produtiva incompleta.** Nenhuma autorização de publicação do piloto é inferida da aprovação desta sprint. Stack atual preservada.

## Matriz de aceite

Responsáveis são papéis propostos, ainda sujeitos à designação nominal pelo titular. Tércio permanece o aprovador editorial definido. “Local aprovado” é prova de regressão controlada, não de serviço produtivo.

| Requisito | Prova disponível / prova que falta | Responsável | Status |
|---|---|---|---|
| Destino SSR e versão | Repositório PT15 compilado localmente. Domínio produtivo e serviço Node não identificados; falta vincular domínio, serviço, commit e configuração efetivamente servida | Titular + operação técnica | Bloqueado |
| HTTPS, domínio primário e variantes | GET HTTPS da prévia funciona; nenhum domínio próprio conectado ao app consultado. Faltam DNS/TLS, primário/variantes HTTP/HTTPS, redirects sem cadeia e hosts permitidos no destino real | Titular do domínio + operação | Bloqueado |
| HTML, canonical, OG, status e hidratação | Regressões SSR/cliente locais aprovadas. Prévia serve shell idêntico em caminhos diferentes; sem canonical no HTML inspecionado. Falta prova no destino | Operação técnica | Local aprovado / externo pendente |
| Isolamento da prévia | Navegador anônimo exibe “Prévia restrita”; snapshot remoto1792711230117. Testes locais fail-closed, senha inválida, assets/APIs e limitação de tentativas. Autenticação válida remota não testada; senha não acessada | Operação técnica | Parcial |
| Rascunhos e descoberta | Árvore pública verificada; gates e sitemap testados localmente. Seis candidatas PT15, zero prontas. Histórico Git público mantido por decisão do usuário. Falta equivalência real no backend e destino | Tércio + operação | Bloqueado para publicação |
| robots, sitemap, assets e cache | Prévia: robots200, sitemap404; shell no-store, rota inexistente200. Ausência de x-robots-tag/nosniff nas respostas amostradas não prova configuração produtiva. Regressões de política locais aprovadas; falta CDN/host real, assets versionados, compressão e privacidade de cache | Operação | Externo pendente |
| Backend, API, Auth e permissões | Descoberta Supabase sem projeto associado à Patri identificado; nenhum outro banco consultado/ativado. Regressões locais de gateways. Faltam RLS/RPC/Data API equivalentes ao gate editorial, sessões, papéis e exposição direta reais | Operação backend | Bloqueado |
| Cadastro, confirmação e recuperação | Roteiro abaixo; sem conta ou provedor produtivo homologado | Operação + responsável de atendimento | Pendente |
| Orçamento, newsletter e e-mail | Fluxos controlados aprovados; faltam persistência, deduplicação, recibo, opt-in aplicável, fila, retry e entrega no destinatário de teste autorizado | Operação + comercial | Pendente |
| Pagamentos e conciliação | Regressões HTTP de assinatura, preço no servidor e idempotência. Falta sandbox autorizado com cancelamento, estorno, repetição/ordem de eventos e conciliação no ledger | Financeiro + operação | Pendente; cobranças reais impedidas |
| Operador e privacidade | CNPJ previamente informado não comprova cadastro/operador. Identidade-visual-preflight registra razão social e e-mail ausentes; falta confirmação atual de operador, canal, versão e aprovação dos documentos | Titular + responsável jurídico/privacidade | Bloqueado |
| Termos, logotipo e mídia | Implementação/fallback não provam direitos ou revisão jurídica. Inventário remoto de recursos sem arquivo de logotipo. Falta comprovação de autorização do original e licenças/créditos por mídia/versão | Titular + Tércio + detentor dos direitos | Pendente |
| Antiabuso, logs e rotinas | Rate limiting e contratos testados em ambiente controlado. Faltam configuração distribuída real, cron/filas, logs sem PII, alertas recebidos e responsável de resposta | Operação + privacidade | Pendente |
| Backup e restore | Plano de reversão preparado; nenhum backup/restore produtivo comprovado. Falta teste isolado com reaplicação de exclusões e retenção de dados | Operação + privacidade | Pendente |
| Mensuração | Contrato PT14 preparado; sem propriedade Patri identificada ou dados reais. Falta vincular inventário/recorte/fontes e validar recibos | Responsável por métricas | Pendente |
| Piloto e autorização final | Manifesto PT15 mantém três nacionais bloqueados e três rascunhos privados; QS e aprovações materiais pendentes. Exige novo QA da versão e autorização explícita de destino/lote após gates | Tércio + titular | Bloqueado |

Não há revisão jurídica atestada por testes técnicos. Flags de ambiente, presença de chaves, selo de deploy “ready” e hash não substituem evidência. O antigo `launch:check` consulta configuração remota e aceita declarações por flags; não foi executado nem usado como certificado. `test-launch-ssr.mjs` é roteiro histórico com expectativas anteriores; o QA vigente usa test:seo e test:discovery-policy.

## Roteiro executável quando o destino estiver disponível

1. Titular informa domínio primário, variantes, hospedagem SSR, projeto backend correto e escopo autorizado de homologação; operação registra commit/build/configuração sem valores secretos. Não criar recursos ou tabelas para contornar o adiamento.
2. Fazer GET anônimo do domínio HTTPS, variantes HTTP/HTTPS, rotas representativas e inexistentes; registrar status, redirects, headers permitidos e hashes, sem cookies, tokens ou corpo privado. Conferir H1/conteúdo no HTML inicial, canonical/OG absolutos do destino, ausência de rascunhos, 400/404/503 corretos e host indevido. Repetir no navegador após hidratação, mobile e navegação interna.
3. Comparar sitemap e inventário independente com SSR; URLs200, indexáveis, autocanônicas e aprovadas. Conferir robots, assets/mídia/versionamento, compressão, cache público/privado e invalidação. Testar falha de backend em staging isolado, sem derrubar produção. User-Agent simulado não comprova acesso de crawler legítimo.
4. Homologar Data API/RPC/RLS com visitante, usuário A/B e administrador, usando contas de teste autorizadas; tentar leitura de rascunhos e alteração de campos privilegiados. Validar confirmação/recuperação, expiração/reuso de token e rate limiting com volume controlado, sem registrar segredos.
5. Enviar orçamento e newsletter apenas a destinatários de teste autorizados; conciliar recibo, linha persistida, repetição idempotente, fila, retry, entrega e falha. Separar inscrição, confirmação, pedido, envio e pagamento. Inspecionar logs mínimos sem PII.
6. Em sandbox financeiro autorizado, conferir assinatura inválida, preço/identidade no servidor, checkout repetido, eventos repetidos/fora de ordem, pagamento, cancelamento e estorno; reconciliar ledger e painel. Sem cobrança real. Os testes locais não comprovam toda essa cadeia.
7. Confirmar operador, canal de privacidade, termos revisados, autoria, aprovações e direitos por arquivo. Executar backup/restore em ambiente isolado e verificar reaplicação de exclusões, acesso, jobs, alertas recebidos e escala de resposta.
8. Anexar evidências datadas por requisito/URL/versão, com executor e responsável nomeados; atualizar esta matriz. Liberar somente lote efetivamente elegível, após autorização explícita. Se algum bloqueio persistir, manter NO-GO. Não remover a senha da prévia para indexar; staging e produção são distintos.

## Reversão sem perda presumida de dados

Antes da liberação, guardar versão do código/configuração, inventário, aprovações privadas, política de cache e backup validado. Em falha de segurança, conteúdo ou conversão: interromper o lote; retirar a projeção/aprovação afetada pelos controles existentes; manter staging protegido. Responsável de operação restaura somente aplicação/configuração homologadas e compatíveis com o banco atual, sem restaurar rascunhos ou permissões antigas. Invalidar apenas caches afetados; verificar SSR, API direta, sitemap e clientes abertos. Preservar recibos e evidência privada do incidente. **Não executar migrations down, reset ou restore destrutivo de banco como consequência automática de rollback de aplicação.** Retomada exige correção, reavaliação e autorização. Nenhuma reversão real executada nesta sprint.

## Dependências para retomar

Ordem: identificar destino/projeto e operador → disponibilizar serviços no ambiente autorizado → homologar segurança/fluxos/operação → concluir conteúdo/oferta/direitos/QS/aceite por versão → atualizar decisão e autorizar pequeno lote → acompanhar PT17. A disponibilidade do domínio, por si só, não resolve os demais gates.

## Retomada após PT17

Titular indicou Hostinger e domínio candidato patrirealty.com.br ou outro; domínio definitivo/propriedade, plano e projeto Supabase ainda não confirmados. [Roteiro detalhado de desbloqueio](retomada-pt16.md) e [mapa de configuração](configuracao-destino-pt16.csv). NO-GO mantido; nenhuma homologação produtiva nova declarada. Revisão do worker de e-mail/publicação e acesso direto do backend é dependência antes de ativar cron/entrega.

## Desenho do destino KVM2

[Arquitetura e sequência de implantação propostas](implantacao-kvm2.md) e [estado explícito](implantacao-kvm2.json), sem instalação/alteração remota. Supabase externo, staging isolado e protegido. Portas/limites/vhost/TLS ainda precisam validação; desenho não aprova implantação ou lançamento. NO-GO mantido.

## Configuração candidata após inspeção readonly

[Relatório e pacote de homologação](homologacao-kvm2-preparacao.md), somente preparados. Portas candidatas sem listener no instante, proxy existente parcialmente inspecionado; achados de segurança privados exigem revisão. Sem instalação/reload/DNS/backend/deploy. Sintaxe efetiva Nginx/Compose e runtime restrito seguem pendentes. NO-GO preservado.

## Plano de correção de segurança/TLS

[Plano priorizado](plano-seguranca-kvm2.md), preparado sem intervenção. S00recuperação/donos precede diffs de acesso/rede/TLS; homologação interna separada de HTTPS público e produção. Nenhum gate resolvido apenas por planejamento. Achados detalhados privados; NO-GO preservado.
