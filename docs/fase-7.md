# Fase 7 — Conteúdo editorial

O usuário aprovou a entrega anterior e autorizou a próxima fase. O desenvolvimento desta fase foi autorizado preservando explicitamente a pendência de homologação externa do Stripe da fase 6; não houve pagamento externo nem remoção dessa pendência.

## Entrega

- Portal /materias, categorias e /materia/:slug; revista /revista e /revista/:slug. Home com últimas matérias e edição publicada mais recente. Matérias do fornecedor também aparecem no seu perfil público.
- Editor de blocos: parágrafos, títulos, citações, listas, imagens, links HTTPS, vídeo YouTube sob clique e tabelas. Sem HTML arbitrário. Upload JPG/PNG/WebP até 5 MB, redimensionamento e conversão WebP sem metadados originais, pastas por matéria e autorização no Storage.
- Redação /admin/conteudo, acesso admin/editor: matérias, rascunhos, publicação imediata, agendamento, revisão com motivo, arquivamento, SEO e slugs com redirecionamento. Edição concorrente protegida por versão.
- Categorias editáveis/ativáveis, revistas, pautas em quadro com responsável/data/estado, portais parceiros com capacidade mensal e registro de entrega externa e canonical original. O portal registra a entrega; não publica automaticamente em sistemas de terceiros.
- Fornecedor /painel/materias: saldo, rascunho, prévia privada, envio e comentário de revisão. Limites de 600 palavras, um link e cinco fotos incluindo a capa verificados no servidor. Somente editor/admin publica. Matéria aprovada de fornecedor/patrocinada recebe Conteúdo de marca; o fornecedor aparece no cartão final.
- O primeiro envio reserva uma matéria do mês civil de São Paulo ou uma cortesia, sem novo débito em reenvio após ajuste. Recusa não devolve a franquia já enviada. Cortesia não renova mensalmente nem expira. Vagas de parceiros são reservadas sob transação e respeitam limite do plano e capacidade do portal.
- Newsletter: formulário com aceite, honeypot, CAPTCHA e limite de cinco tentativas por identificador derivado do IP/hora. Confirmação de 48 horas, hash de token, uso único, consentimento registrado somente no segundo aceite. Descadastro por link e endpoint One-Click. Lista e CSV são restritos à redação, sem tokens ou hashes. Esta fase capta a lista, não dispara campanhas.
- E-mails transacionais de revisão e newsletter integrados à fila e ao worker existentes; SMTP local somente Mailpit.
- SSR para matérias, categorias e revistas: HTML indexável sem JavaScript, metadados, canonical, Article, sitemap, redirecionamento 301 e retirada de conteúdo arquivado. Fornecedor suspenso retira também suas matérias públicas.

## Prévia e produção

Portal demonstrativo: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-editorial

Redação: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-conteudo

Fornecedor: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-materias

Todos os textos da prévia são fictícios e identificados. O estado é salvo somente neste navegador; os dois painéis demonstrativos compartilham exemplos para conferir o fluxo. Não há e-mail ou publicação externa real na prévia.

O backend foi aplicado e testado no stack local com Auth, REST, Postgres, Storage e SMTP. A prévia AppDeploy permanece frontend-only, sem credenciais locais. Para produção: aplicar migration 20261020091736_editorial_content.sql, configurar bucket e Edge newsletter/publicar-agendadas, NEWSLETTER_IP_SALT, site/CAPTCHA/Resend e rotina protegida de publicação a cada cinco minutos. A assinatura do CAPTCHA exige action newsletter. Agendar o worker de e-mails e manter a rotina de planos já documentada. Portais reais e edições oficiais precisam ser cadastrados pela equipe; nenhum foi inventado para o banco real.

As métricas de leitura, tempo e cliques por matéria dependem do módulo de métricas da fase 9; esta entrega não inventa números. Disparos de campanhas de newsletter estão fora do escopo da primeira versão, conforme a especificação. Contratos, banners e destaques seguem para a fase comercial.

## Verificação

Testes de banco cobrem papéis, revisão obrigatória, concorrência de versão, saldo mensal, cortesia, envio a parceiro e capacidade, agendamento, DTO público e newsletter. Testes de navegador cobrem o fluxo de revisão e publicação, saldo insuficiente, revista, pauta e segundo aceite. Um cenário integrado usa editor real, API real, agendamento real e e-mails no Mailpit: visitar o link não confirma sozinho; o clique explícito confirma e o descadastro retira a inscrição.

Scripts: `npm run local:test:db`, `npm test`, `node --test tests/newsletter-http.test.mjs tests/billing-http.test.mjs tests/quotation-http.test.mjs`, `npm run local:test:e2e`, `npm run build:ssr`, `node scripts/test-content-ssr.mjs`, `npm run test:ssr`. Advisors de segurança e desempenho devem permanecer sem avisos.

Resultados locais: 299 assertivas SQL, 30 testes unitários, 13 testes HTTP e 21 cenários Playwright aprovados. Upload real no bucket de matérias e fluxo com SMTP Mailpit incluídos. Build client/SSR, os dois scripts SSR e typecheck Deno aprovados; advisors de segurança e desempenho sem avisos.

Prévia publicada no snapshot 1792489509645. Hospedagem pronta sem erros de frontend/rede. Os dois fluxos de scripts/test-content-preview.mjs passaram no endereço público: revisão completa com saldo e newsletter, mais agendamento, pauta e revista. A navegação foi verificada em 320, 390, 768 e 1280px, com menu confortável também nos laptops menores.
