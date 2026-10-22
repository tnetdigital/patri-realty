# Fase 10 — conta, privacidade e preparação do lançamento

Autorizada após o aceite da fase 9. O ambiente de produção continua bloqueado pelos pré-requisitos externos descritos em `lancamento.md`. A entrega é uma prévia demonstrativa atualizada e implementação real validada localmente.

## Entregue

- `/conta`: edição do nome; solicitação de novo e-mail com confirmação pelo Auth; troca de senha; encerramento global de sessões; exportação JSON; exclusão confirmada com senha atual.
- `/demonstracao-conta`: demonstração fictícia persistente, reinício explícito, download JSON, validação e cancelamento da exclusão; nenhuma conta ou mensagem real.
- `/sobre-o-projeto`, `/para-fornecedores`, `/termos`, `/privacidade`: páginas completas, documentos versão 2026-10-21, identificação do operador via configuração pública `identidade_legal`. Minuta permanece visível enquanto a identificação/revisão estiver pendente.
- Cookie analítico continua estritamente opt-in; recusa e revogação testadas. Instagram continua carregando somente por ação explícita.
- SSR institucional: título, descrição, canonical, sitemap; Organization/WebSite com SearchAction na home; 404 com busca útil; páginas de conta fora do índice. Headers de proteção no servidor SSR.
- `account` Edge verifica Auth confirmado, sessão persistida com até sete dias de inatividade, origem e reautenticação. Nunca aceita um user_id do navegador. Limite de cinco tentativas por conta/IP em 15 minutos com HMAC temporário.
- `auth-login` Edge protege a entrada pelo portal por e-mail/IP; `verificar_login` é hook nativo adicional para impedir contorno do bloqueio por conta pelo endpoint Auth direto. A integração real local confirma bloqueio após cinco senhas erradas e liberação após a janela. Suporte do plano hospedado e bloqueio por IP na borda do Auth precisam ser homologados no destino.
- A anonimização remove informações pessoais de cadastro, solicitações, avaliações, newsletter, notas, convites e cópias de auditoria ligadas à conta. Desativa o perfil/equipe, retira papéis e revoga sessões/refresh tokens dentro da transação. Preserva FK e registros de negócio. A página da empresa fica indisponível até regularização do responsável. Último admin ativo protegido.
- GoTrue soft delete remove informações pessoais também de Auth/identidades preservando a FK técnica. `privacy-jobs` retoma falhas de forma durável; não depende de provedor de e-mail para processar privacidade. Logs de e-mail: 12 meses. Registros anonimizados: redução de narrativa após 24 meses. Dados financeiros seguem revisão de retenção legal.
- `npm run launch:check` verifica pré-requisitos sem imprimir valores secretos. No ambiente atual termina corretamente como bloqueado: 23 verificações de produção pendentes. Não é uma falha da prévia nem uma homologação externa concluída.

## Validação

- 35 cenários Playwright passaram em uma rodada completa após os ajustes de Auth; cinco fluxos críticos: cadastro/fornecedor, aprovação, orçamento, bloqueio de plano, compra de créditos controlada.
- 411 verificações SQL em banco descartável, incluindo nenhuma tabela de aplicação sem RLS, isolamento de dados, limites, anonimização idempotente, sessão antiga e proteção do último admin.
- 30 testes unitários, 24 testes HTTP; builds cliente/SSR; testes SSR de guia, editorial, reputação e institucional. Advisors sem alertas.
- A conta móvel foi exercitada em 320 px, incluindo exportação, cancelamento, senha incorreta e persistência da anonimização.
- Os testes de exclusão validam também a ausência de nome/e-mail anteriores em identidades Auth e recusa da exportação por JWT antigo. A anonimização mantém uma identidade técnica pseudonimizada, não apaga fisicamente a FK.
- A rodada completa anterior passou com 34 cenários; uma repetição isolada identificou o limite compartilhado do IP de teste. O fixture de privacidade agora limpa exclusivamente o orçamento de tentativas do ambiente local antes de iniciar. A rodada final completa com 35 passou.

## Pendências reais de operação

Identidade jurídica/canal LGPD, revisão final dos textos e retenção, domínio, SMTP/Resend verificado, Stripe externo, backend/Edge/cron no ambiente produtivo, observabilidade, backups e homologação no destino. O hook Password Verification Attempt hospedado exige plano compatível (documentação consultada: Teams/Enterprise); não contratar plano nem declarar habilitado sem configurar e verificar. Ver `lancamento.md`.

O endereço AppDeploy mantém apenas código cliente e dados demonstrativos isolados. Não inclui `.env.local`, service role, segredos de jobs, credenciais Docker ou dados do banco de testes. Não foi enviado e-mail externo nem criada cobrança externa nesta entrega.

## Publicação para análise

Prévia atualizada no mesmo app_id `patri-realty-previa-05je1j`, snapshot `1792622928007`, status ready. Plataforma sem erros frontend/backend/rede. Dois fluxos conferidos na URL pública por `scripts/test-privacy-preview.mjs`: conta em320px (salvar/download/cancelar/senha incorreta/excluir/persistir) e institucional→termos→privacidade→busca404. Endereço de análise: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-conta.
