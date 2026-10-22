# Relatório de correção — Patri Realty

22 de outubro de 2026. Os sete lotes foram executados em local e na prévia de homologação. Nenhuma publicação ou instalação em produção foi realizada. Bloqueios externos permanecem explícitos; testes simulados não são homologação de provedores.

Estado inicial versionado em `9458510`. Um commit por lote, na ordem. A referência Git `correcao-pt-lote-7` identifica o commit final desta entrega, incluindo este relatório, sem depender de um hash autorreferente.

## Achados, commits e regressões

| ID | Status | Entrega / commit | Teste de regressão |
|---|---|---|---|
| F01 | CORRIGIDO | `7323590` — invoice, charge e PaymentIntent; estorno parcial/total acumulado | `supabase/tests/corrections-money.test.sql`; `tests/billing-http.test.mjs` |
| F02 | CORRIGIDO | `7323590` + `correcao-pt-lote-7` — concessão de origem admin com motivo, autor e validade; pago prevalece; escrita direta protegida | `corrections-money.test.sql`, `corrections-plan-guard.test.sql`, `tests/corrections-brand.test.mjs` |
| F03 | BLOQUEADO POR CREDENCIAL | `35b5396` — Dockerfile e roteiro de SSR; destino não publicado | `npm run launch:check` bloqueia; testes SSR locais passam |
| F04 | BLOQUEADO POR CREDENCIAL | `6761a34` + `correcao-pt-lote-7` — migrations por rotina, condicionais e reversíveis; sem instalar cron no destino | `tests/corrections-tooling.test.mjs`; `corrections-operations.test.sql`; reversão descartável |
| F05 | BLOQUEADO POR CREDENCIAL | `a9c3344`, `35b5396` — gateway obrigatório; produção bloqueia sem CAPTCHA; borda Auth de destino pendente | `corrections-access.test.mjs`, `corrections-integrations.test.mjs`, `privacy-http.test.mjs`, `login-guard-live.spec.ts` |
| F06 | BLOQUEADO POR CREDENCIAL | `35b5396` — Stripe e Resend desligados por padrão; modo simulado preserva fila | `billing-http.test.mjs`, `corrections-integrations.test.mjs`, SQL de idempotência |
| F07 | CORRIGIDO | `6761a34` — dependências atualizadas; auditoria final zero | `npm audit`; `docs/riscos.md` |
| F08 | CORRIGIDO | `a9c3344` — leitura própria exige conta ativa em RLS e RPC | `supabase/tests/corrections-access.test.sql` |
| F09 | CORRIGIDO | `a9c3344` — host e prefixo de Storage exatos, sem substring | `supabase/tests/corrections-access.test.sql` |
| F10 | CORRIGIDO | `a9c3344` — Área do síndico com histórico paginado próprio | `corrections-access.test.sql` verifica exclusão do pedido alheio; `auth-live.spec.ts` |
| F11 | CORRIGIDO | `7323590` + `correcao-pt-lote-7` — comercial altera só preço; limites e provedor restritos ao admin | `corrections-money.test.sql`; `corrections-brand.test.mjs`; suíte de permissões existente |
| F12 | CORRIGIDO | `a9c3344` + `correcao-pt-lote-7` — versão pública no banco, consumida por cadastro, orçamento e documentos legais/SSR | `corrections-access.test.sql`, `corrections-access.test.mjs`, `corrections-brand.test.mjs`, SSR legal |
| F13 | DECIDIDO PADRÃO | `2700fb7` + `correcao-pt-lote-7` — três documentos com revisão jurídica necessária e identidade pendente | `corrections-product.test.mjs`, `corrections-brand.test.mjs`, `privacy-demo.spec.ts` |
| F14 | CORRIGIDO | `910da58` — compressão, fontes locais de fallback, cache e dimensões | `scripts/lighthouse-mobile.mjs`; antes/depois em `docs/desempenho.md` |
| F15 | CORRIGIDO | `6761a34` — entradas TypeScript Edge e payload tipado | `npm run typecheck`; teste negativo `corrections-typecheck.test.mjs` |
| F16 | CORRIGIDO | `a9c3344` — evento, contato autenticado e mensagens persistidas com RLS | `corrections-access.test.mjs` e `.test.sql` verificam persistência e negação de leitura alheia |
| F17 | CORRIGIDO | `910da58` — relatório reconhecido no SSR e noindex | `scripts/test-corrections-ssr.mjs` |
| F18 | CORRIGIDO | `2700fb7` — leituras, tempo médio visível e cliques atribuídos; painel e CSV usam os mesmos dados | `corrections-product.test.sql` e `.test.mjs`; métricas existentes |
| F19 | CORRIGIDO | `2700fb7` — calendário por período e faturamento integral por contrato, sem duplicar campanhas | `corrections-product.test.sql`; `commercial.test.sql` cobre campanha fora da vigência |
| F20 | CORRIGIDO | `6761a34` — templates transacionais separados do transporte | `corrections-tooling.test.mjs`; `src/features/content/email-templates.test.ts` |
| F21 | CORRIGIDO | `6761a34` + `correcao-pt-lote-7` — falhas seguras, contagem admin e wrapper dos jobs SQL | `corrections-operations.test.sql`; testes de estrutura e permissões |
| F22 | CORRIGIDO | `6761a34` — dez reversões faltantes, todas as novas reversões e contrato público regenerado | `bash scripts/test-rollbacks.sh`; `corrections-tooling.test.mjs`; typecheck |
| F23 | CORRIGIDO | `6761a34` — revistas PDF e importações privadas, MIME e tamanho limitados | `corrections-operations.test.sql`; teste de buckets |
| F24 | CORRIGIDO | `910da58` — OG de título, descrição e imagem nas respostas públicas SSR | `corrections-indexing.test.mjs`; `scripts/test-corrections-ssr.mjs` |
| F25 | CORRIGIDO | `6761a34` + `correcao-pt-lote-7` — ESLint, formatação e CI | `npm run lint`; `npm run format:check` |
| F26 | CORRIGIDO | `a9c3344` — operações Supabase extraídas para API, incluindo uploads, conta, cobrança e conteúdo | `npm run check:architecture`; workflow Quality |
| F27 | CORRIGIDO | `6761a34` + `correcao-pt-lote-7` — exemplo de ambiente completo, sem valores secretos | `node scripts/check-env.mjs` |
| F28 | DECIDIDO PADRÃO | `2700fb7` + `correcao-pt-lote-7` — Patri Realty textual e `[PENDENTE: logotipo original]`, inclusive no HTML inicial | `corrections-product.test.mjs`, `corrections-brand.test.mjs`; verificação da prévia pública |

As evidências de reprodução e a distinção entre regressão e robustez adicional estão em [evidence/regressoes.md](evidence/regressoes.md). Os arquivos SQL abreviados na tabela ficam em `supabase/tests/`; os demais testes citados ficam em `tests/`, salvo indicação diferente.

## Resultado final

| Verificação | Resultado |
|---|---|
| SQL | **454 verificações aprovadas**, incluindo as 411 anteriores |
| Unitários | **33 aprovados**, incluindo os 30 anteriores |
| HTTP e regressões de contrato/arquitetura | **55 aprovados**, incluindo os 24 anteriores |
| Playwright | **35 aprovados** em rodada completa; documentos legais também repetidos após centralizar a versão |
| SSR | Cinco scripts aprovados: guia, conteúdo, reputação, lançamento e correções/OG/noindex |
| Typecheck | Frontend e entradas Edge aprovados; teste de quebra proposital aprovado |
| Lint / formato / ambiente | Sem erros |
| Auditoria npm | **0 vulnerabilidades**: sem críticas, altas, moderadas ou baixas |
| Segredos | Nenhum padrão de chave nos arquivos versionados; arquivos locais de credenciais excluídos |
| Reversão | Sequência completa aprovada em `patri_rollback_test`, banco descartável |
| Lighthouse mobile | **60 → 96**, LCP **6,96 s → 2,21 s**, acessibilidade **100**, SEO **100** |

Dados, metodologia e limites do benchmark: [desempenho.md](desempenho.md). A medição é local, não prova desempenho da hospedagem final.

## Bloqueios externos e decisões

[Decisões padrão](decisoes.md) e [checklist de lançamento](lancamento.md) registram as escolhas e o que falta para liberar cada integração:

- Supabase/SSR de destino: projeto, credenciais, homologação de migrations, URL HTTPS e proteção operacional.
- Stripe: chaves de teste, preços e webhook da conta; testar checkout, renovação e estornos na rede do provedor antes de habilitar.
- Resend: chave, domínio e remetente verificados, SPF/DKIM/DMARC e prova de entrega.
- Turnstile/Auth: chaves e domínios, CAPTCHA no Auth hospedado, hook compatível e limitação de IP na borda da API Auth direta. O gateway da aplicação não substitui essa borda.
- Cron: acesso ao destino, extensões e Vault autorizados, URLs/segredo dos workers e alertas externos. Nenhuma extensão foi instalada no destino.
- Domínio/DNS e backups: acesso ao provedor, registros, retenção e restauração verificável.

Todos esses itens estão **BLOQUEADO POR CREDENCIAL** para homologação externa. O preflight continua bloqueando o lançamento real (22 verificações pendentes), como esperado.

A assinatura paga prevalece sobre concessão; concessões são assinaturas de origem admin com prazo e motivo. O CNPJ fornecido **53.816.326/0001-58** foi preservado, sem alegar consulta cadastral oficial. Razão social, atendimento, domínio e revisão jurídica continuam marcados. O arquivo original do logo não está disponível como recurso da hospedagem; nenhuma reconstrução foi criada.

## Prévia de análise

https://patri-realty-previa-05je1j.v2.appdeploy.ai/

Somente demonstração/homologação, sem backend produtivo nem cobrança real. O snapshot utiliza HashRouter e CSS compilado equivalente para compatibilidade com AppDeploy; o código local mantém Tailwind 4 e SSR. Nenhuma credencial local foi enviada. A ausência do arquivo original do logotipo permanece como aviso de recurso, com fallback visível aprovado pelo PT.

Prévia final: snapshot `1792663241097`, status ready, sem erros frontend/backend/rede reportados pela plataforma. Conferência pública móvel de logo pendente, três documentos, contato, evento e calendário aprovada. Aviso conhecido: arquivo original do Logotipo ainda ausente no recurso.
