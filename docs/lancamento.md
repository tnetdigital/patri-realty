# Operação de produção — Patri Realty

A URL AppDeploy é uma prévia frontend, sem banco produtivo conectado. Não subir as credenciais Docker ou `.env.local`. A entrega de desenvolvimento não representa lançamento com dados reais.

## Pré-requisitos concretos

1. Informar razão social/CNPJ do operador, domínio e e-mail de privacidade. Em Administração → Configurações, preencher `identidade_legal` (pública): `razao_social`, `cnpj`, `email_privacidade`, `email_atendimento`, `revisado`. Marcar `revisado` somente após revisão jurídica. A minuta mantém o aviso enquanto incompleta.
2. Criar ambientes separados de staging e produção, aplicar todas as migrations, carregar apenas estados/cidades/especialidades/planos. Não copiar seed/contas dos testes para produção. Guardar chaves no cofre do provedor.
3. Deploy SSR de `server.mjs` e artefatos cliente/servidor; usar domínio HTTPS. Build: `npm ci` e `npm run build:ssr`. Configurar `SITE_URL`/`VITE_SITE_URL` definitivos e redirects Auth para esse domínio. As demonstrações públicas continuam isoladas.
4. Configurar Auth com confirmação de novo e antigo e-mail, senha mínima, recuperação/cadastro com Turnstile e expiração após sete dias de inatividade. Ativar `public.verificar_login` como Password Verification Attempt hook. O hook impede login direto após cinco falhas por conta durante 15 minutos, sem derrubar sessões legítimas. A documentação Supabase consultada em 21/10/2026 restringe esse hook hospedado aos planos Teams/Enterprise; em self-hosted foi testado. Validar suporte ou implementar proteção equivalente antes de liberar dados reais.
5. Deploy `auth-login`, `account`, `privacy-jobs` e demais Edge Functions existentes. Definir os segredos de `.env.example` do lado servidor. Definir `VITE_LOGIN_URL` para `auth-login`: gateway aplica cinco tentativas por e-mail e IP em 15 minutos, com HMAC temporário. **O limite por IP também deve existir na borda do endpoint Auth direto**; CORS ou a URL do gateway não impedem acesso direto ao Auth. Homologar o limite de IP na infraestrutura de destino. Gateway e hook são complementares.
6. Configurar provedor de e-mail e SMTP Auth no domínio próprio, verificar SPF/DKIM/DMARC e testar confirmação, recuperação, mudança de endereço, convite, orçamento e unsubscribe em contas controladas. `EMAIL_FROM` deve pertencer ao domínio verificado. Mailpit é exclusivamente local. Não ativar campanhas na fase de verificação.
7. Configurar Stripe teste/produção e webhooks; homologar compra, repetição de evento, estorno e cancelamento. A fase 6 validou transporte controlado, não a conta externa. A exclusão da conta não cancela uma cobrança externa; as condições de cancelamento precisam ser conferidas antes dela.
8. Agendar editorial a cada cinco minutos, agregação/ciclos/notificações diariamente, `privacy-jobs` a cada cinco minutos. A fila privada permite repetir a anonimização no Auth quando houver falha. Monitorar pendências, falhas de filas e funções sem registrar senhas/tokens/corpo de solicitações. Integrar a observabilidade do provedor/Sentry com remoção de PII antes de produção.
9. Testar backups e restauração em staging. Reaplicar as exclusões desde a data do backup antes de abrir acesso. Ajustar a retenção de backups e obrigações fiscais com a revisão jurídica. A implementação de 24 meses reduz a narrativa de registros já anonimizados; os totais financeiros e identificadores técnicos permanecem conforme a obrigação aplicável, a validar juridicamente.
10. Executar `npm run launch:check`. O comando imprime só nomes e estados, nunca valores. As confirmações `EMAIL_DOMAIN_VERIFIED`, `STRIPE_VERIFIED`, `AUTH_GUARDS_VERIFIED`, `JOBS_VERIFIED` e `BACKUPS_VERIFIED` devem refletir verificações reais no destino, não servir como substituto delas.

## Homologação

- `npm test`; `node --test tests/*-http.test.mjs`.
- `npm run local:test:db`: banco descartável com RLS e negações por papel.
- `npm run local:test:e2e -- --workers=1`: cinco fluxos críticos mais conta, privacidade, publicação, conteúdo, comercial e métricas.
- `npm run build:ssr`; `npm run test:ssr`; `node scripts/test-content-ssr.mjs`; `node scripts/test-growth-ssr.mjs`; `node scripts/test-launch-ssr.mjs`.
- Repetir os cinco fluxos com sandbox dos provedores no staging, testar 320/390 px, teclado, preferências de cookies e anonimização com token antigo. Medir LCP móvel no destino; o resultado local não comprova latência pública.

## Direitos e retenção

`exportar_minha_conta()` não aceita identidade arbitrária. Exporta cadastro, versões aceitas e registros próprios; exclui notas de terceiros, segredos e hashes de tokens. A Edge exige Auth confirmado e sessão persistida recente.

A exclusão exige senha atual e a palavra APAGAR. A transação remove dados de cadastro, contatos, relatos, notas, newsletter, convites, mensagens e cópias de auditoria ligadas à pessoa, preservando referências de negócio. Desativa perfil/membros, retira papéis e revoga sessões/refresh tokens. O último admin não pode ser removido. GoTrue soft delete anonimiza também as identidades e metadados de Auth, mantendo a FK técnica. Uma fila privada retoma falhas desse serviço. Conteúdo corporativo e financeiro não é tratado como desaparecido; a página fica indisponível até regularizar o responsável.

Logs de e-mail expiram em 12 meses. Após 24 meses da exclusão, a rotina reduz o conteúdo narrativo dos registros anonimizados. Direitos de solicitantes sem conta usam o canal do operador após verificação de identidade; não existe busca pública por e-mail ou ferramenta que exponha pedidos de outras pessoas.

## Correção PT — integrações desligadas em 22/10/2026

A prévia pública é demonstração de interface, sem SSR de produção ou operação financeira real. Nenhuma publicação em produção foi executada.

| Integração | Estado | Falta para liberar |
|---|---|---|
| SSR e Supabase de destino (F03) | BLOQUEADO POR CREDENCIAL | Projeto, segredos no servidor, URL pública, migrações e homologação isolada |
| Stripe (F06) | BLOQUEADO POR CREDENCIAL | Chaves de teste, preços, endpoint de webhook, secret e `STRIPE_ENABLED=true`; compras/renovação/estornos reais em modo teste |
| Resend (F06) | BLOQUEADO POR CREDENCIAL | Chave, remetente verificado e `EMAIL_DELIVERY_ENABLED=true`; testar confirmação e entrega sem dados reais |
| Turnstile e Auth (F05) | BLOQUEADO POR CREDENCIAL | Chaves/site, `CAPTCHA_ENABLED=true`, `VITE_CAPTCHA_ENABLED=true`, CAPTCHA no Auth hospedado e limite de IP na borda da API Auth direta |
| Cron de destino (F04) | BLOQUEADO POR CREDENCIAL | Acesso ao projeto, extensões previamente autorizadas e Vault com URLs/segredo dos workers |
| Domínio e DNS | BLOQUEADO POR CREDENCIAL | Acesso ao provedor e domínio confirmado; HTTPS/canonical e redirects |
| SPF/DKIM/DMARC | BLOQUEADO POR CREDENCIAL | Remetente/domínio e registros oficiais do provedor; verificar envio e alinhamento |
| Backups | BLOQUEADO POR CREDENCIAL | Destino, retenção, acesso, agendamento e prova de restauração em ambiente isolado |

### Homologação SSR (comandos documentados, não executados no destino)

1. Configurar variáveis a partir de `.env.example` em um gerenciador de segredos; nunca no repositório.
2. `docker build -t patri-ssr:homologacao .`
3. `docker run --env-file /caminho-seguro/homologacao.env -p 8080:8080 patri-ssr:homologacao`
4. Conferir SSR, OG, sitemap, proteção do relatório, acesso e pagamentos de teste antes de qualquer promoção.

O servidor só usa a chave anônima para conteúdo público. Chaves privilegiadas ficam exclusivamente nas funções servidoras.

### Instalação dos agendamentos no destino — não executar sem configurar o destino

As migrations `*_cron_*.sql` são condicionais: sem pg_cron não fazem nada; não instalam extensões. Cada rotina tem reversão própria. Workers externos exigem pg_net, Vault, `supplier-jobs_url`, `privacy-jobs_url` e `supplier_jobs_secret`. As URLs e o segredo devem ser cadastrados pelo operador no Vault, sem copiá-los para SQL versionado.

Depois de revisar extensões, permissões e backups: executar a migration de cada rotina com `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/ARQUIVO_cron_ROTINA.sql`. Este comando está documentado, não foi executado em produção. Confirmar jobs em cron.job e falhas em cron.job_run_details; testar os workers autenticados e `status_rotinas`. A função executar_rotina é uma opção de execução SQL com captura de falhas na tabela rotina_falhas. Logs nativos do cron também devem ter alerta no provedor.

### Checklist de domínio, e-mail e recuperação

- [ ] Domínio confirmado pelo responsável; DNS aponta apenas para homologação até aprovação final.
- [ ] HTTPS válido, redirect HTTP, domínio canônico e páginas privadas fora do sitemap.
- [ ] SPF sem múltiplos registros conflitantes, DKIM validado, DMARC alinhado e política revisada.
- [ ] Caixa de atendimento e canal de privacidade informados e testados.
- [ ] Backup criptografado do banco e arquivos, retenção e responsável definidos.
- [ ] Restauração testada em banco descartável, com RPO/RTO registrados.
- [ ] Chaves rotacionáveis, acesso mínimo e alertas de falha testados.

Modo simulado de e-mail não marca mensagens como enviadas nem consome a fila. Simulação e testes locais não comprovam entrega por Resend ou pagamento na conta Stripe.
