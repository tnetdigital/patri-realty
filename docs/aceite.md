# Aceite e estado real — 19/10/2026

A seção 11 da especificação determina: **“Não iniciar a fase seguinte com critério pendente.”** O usuário aprovou a fase anterior nesta conversa e autorizou o avanço para a fase 2. Essa aprovação foi registrada sem apagar as pendências hospedadas. A fase 2 foi implementada e validada no ambiente local, com demonstração pública separada.

## Fase 1

| Critério | Evidência | Estado |
|---|---|---|
| Cadastro de fornecedor | Playwright: UI → GoTrue → profile/papel/rascunho → e-mail Mailpit | Passou localmente |
| Cadastro de síndico | Playwright: cidade IBGE, confirmação e retorno à home | Passou localmente |
| Login | Playwright: logout e novo login do fornecedor | Passou localmente |
| E-mail de confirmação chega | Mensagem enviada pelo GoTrue via SMTP e aberta pelo teste | Passou em Mailpit; Resend/domínio pendentes |
| Fornecedor não abre `/admin` | Playwright com sessão real e pgTAP de permissões | Passou localmente |
| Admin criado no banco acessa `/admin` | Playwright concede papel pelo Postgres e verifica a rota | Passou localmente |
| RLS por papel | 35 assertivas pgTAP: visitante, síndico, fornecedor, editor, comercial, admin e inativo | Passou em PostgreSQL 17 isolado |
| Migrations aplicadas | Foundation aplicada no banco de integração e no banco da suíte RLS | Local; hospedado pendente |
| Tipos atualizados | Gerados pelo Supabase CLI a partir do banco com a migration | Entregue |

Também passaram 5 testes unitários, 4 testes Playwright e build TypeScript/Vite. Os testes de RLS usam uma tabela mínima de identidade Auth em banco isolado; os testes Playwright usam o GoTrue real com suas migrations. Isso não equivale a executar advisors nem homologar políticas em um projeto Supabase hospedado.

## Pendências da fundação antes do aceite hospedado

- Selecionar/provisionar projeto Supabase dedicado. A consulta somente leitura aos projetos disponíveis não encontrou um projeto Patri Realty. Nenhum projeto externo foi modificado.
- Configurar SMTP Resend, domínio, SPF/DKIM e confirmar entrega externa.
- Configurar CAPTCHA e verificar rejeição no servidor. O cliente já suporta site key/token; o segredo/provider precisa ser configurado no Supabase. O harness local não ativa CAPTCHA.
- Implementar e testar bloqueio exato de 5 tentativas por e-mail **e** IP por 15 minutos. O rate limit padrão do Auth não é evidência suficiente dessa regra.
- Homologar política de inatividade de 7 dias e recuperação com validade de 1 hora no ambiente contratado.
- Rejeição de senhas comuns no servidor depende da configuração do Auth; o Zod atual bloqueia uma lista inicial no cliente.

## Demais fases

| Fase | Próxima implementação | Situação |
|---|---|---|
| 2 | Assistente, uploads, completude, status, membros e convites | Implementada e testada localmente; demonstração publicada para análise |
| 3 | Guia público, busca, SSR, sitemap e SEO | Não iniciada |
| 4 | Leads, antispam e notificações | Não iniciada |
| 5 | CRUD administrativo, aprovação, CSV e auditoria de operações | Não iniciada; apenas acesso à área existe |
| 6 | Planos, carteira, Checkout, webhook e régua | Não iniciada |
| 7 | CMS, revista, pauta, newsletter e parceiros | Não iniciada |
| 8 | Banners, destaques, contratos e relatórios | Não iniciada |
| 9 | Avaliações, métricas e marketing | Não iniciada |
| 10 | LGPD completa, segurança e lançamento | Não iniciada; controles locais de cookies e noindex são preparatórios |

O `/painel` contém o cadastro funcional da fase 2. As telas de `/admin` e `/admin/conteudo` continuam iniciais. A conta mostra os dados e acesso à recuperação de senha; exportação e anonimização de dados pertencem à fase 10 e ainda não estão disponíveis.

Detalhes da fase 2, testes e limites da demonstração: [fase-2.md](fase-2.md).

Fase 2 publicada no snapshot `1792459229626`, status ready, sem erros de frontend ou rede no retorno da plataforma. A demonstração está em `#/demonstracao`.
