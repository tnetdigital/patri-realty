# Patri Realty

Portal para conectar síndicos e fornecedores de condomínio, com publicação moderada, conteúdo editorial e operação comercial. A especificação original está preservada em [docs/especificacao.md](docs/especificacao.md).

**Estado em 22/10/2026:** fases 1–10 e correções implementadas, com integração local e demonstrações públicas. O cadastro real de fornecedores foi homologado no ambiente local com Auth, Storage e e-mail de teste. **A prévia pública não cria contas reais:** autenticação, CAPTCHA e serviços de produção ainda dependem de configuração externa. Veja [a auditoria do cadastro](docs/auditoria-cadastro-fornecedores.md) e [os requisitos de produção](docs/lancamento.md).

Código: [tnetdigital/patri-realty](https://github.com/tnetdigital/patri-realty). Prévia: [Patri Realty](https://patri-realty-previa-05je1j.v2.appdeploy.ai/). Os blocos de fases abaixo preservam o histórico da implementação.

## Rodar

Requer Node 22+ e Docker com Compose.

```bash
npm ci
npm run local:up
npm run dev
```

Na primeira execução, `local:up` gera `compose.yml` e `bootstrap.sql` a partir dos templates versionados, com credenciais aleatórias; arquivos existentes são preservados. Esses dois arquivos e `.env.local` não entram no Git. Também é possível executar `npm run local:init` separadamente.

Abra http://127.0.0.1:5173. E-mails locais chegam em http://127.0.0.1:54324. O banco do ambiente de integração atende em `127.0.0.1:55432`. As credenciais em `infra/local` são exclusivas desse ambiente descartável. Não as reutilize em produção.

O caminho principal também suporta a stack local oficial:

```bash
npx supabase start
npx supabase status
```

Copie a URL e a chave pública locais para `.env.local`. Não execute a stack oficial junto com o harness: ambas usam a porta 54321. Neste ambiente a imagem Postgres oficial do Supabase não coube durante a extração com o driver Docker `vfs`; o harness usa PostgreSQL 17, GoTrue, PostgREST, Kong e Mailpit para testar os serviços reais sem essa imagem. Ele não substitui a homologação em Supabase hospedado, inclui o Storage API real, mas não o Edge Runtime.

## Verificar

```bash
npm test                  # Validação, regras de negócio e regressões de cadastro
npm run local:test:db     # 454 assertivas pgTAP, em banco de testes isolado
npx playwright install chromium
npm run local:test:e2e    # Testes no Chromium, incluindo Auth, Storage e convites reais locais
npm run build            # TypeScript estrito e bundle Vite
npm run format:check
```

A suíte de integração cria contas fictícias no ambiente local; a suíte RLS usa `patri_rls_test`, recriado a cada execução. Não execute scripts locais contra produção. `npm run test:e2e` sem a variável `PATRI_LIVE_TESTS=1` executa os cenários de demonstração independentes do harness.

## Entregue

- React 18, TypeScript, Vite, Tailwind, botão no padrão shadcn/Radix, Router, Query, RHF e Zod, com versões travadas no lockfile.
- Layout responsivo com identidade provisória azul-petróleo e laranja, home de apresentação sem indicadores ou fornecedores fictícios.
- Cadastro de síndico e fornecedor, login, confirmação, recuperação e redefinição de senha, logout, seletor de áreas e rotas por papel.
- Trigger transacional para perfil, papel permitido, consentimentos versionados e empresa em rascunho. Metadados do usuário não concedem privilégios administrativos.
- Nove tabelas com RLS, auditoria, função `has_role`, proteção do último admin ativo, validação de CNPJ no cliente e no Postgres.
- Textos centralizados em `src/lib/texts.ts`, campos opcionais de condomínio/cargo e duas migrations de fundação.
- 27 UFs, 5.571 municípios obtidos da API do IBGE em 19/10/2026 e seis segmentos iniciais assumidos.
- Migration, rollback de desenvolvimento, seed separado, tipos TypeScript gerados pelo Supabase CLI e testes.

## Configuração externa

O `.env.example` lista todas as variáveis solicitadas sem valores. Só as variáveis `VITE_` ficam disponíveis no navegador. Nunca coloque service role, Stripe secret, Resend ou Turnstile secret em variável `VITE_`.

Para Supabase hospedado, configurar URL/chave pública, migrations, seed de catálogo, confirmação obrigatória de e-mail, URLs de callback, SMTP Resend com domínio validado, CAPTCHA Turnstile e política de sessões. Não foi identificado um projeto hospedado Patri Realty entre os projetos disponíveis; nenhum projeto existente foi alterado. O projeto hospedado e os provedores de e-mail/pagamento não foram criados.

Em desenvolvimento, conceda o primeiro admin diretamente no banco após criar e confirmar a conta:

```sql
insert into public.user_roles(user_id, role)
select id, 'admin' from auth.users where email = 'SEU_EMAIL';
```

Não existe senha padrão de admin. Papéis posteriores são gerenciados pelo admin quando o módulo da fase 5 estiver implementado.

## Banco e decisões

```bash
# Stack oficial
npx supabase db reset
npm run db:types
# Harness desta entrega
# Defina PATRI_LOCAL_DB_URL com a conexão local gerada (não versione o valor).
npx supabase gen types --db-url "$PATRI_LOCAL_DB_URL" --schema public > src/lib/database.types.ts
```

Migrations de produção devem ser aplicadas pelo CLI em um projeto explicitamente vinculado. O script `local:up` usa histórico próprio de migrations apenas no harness. Não é um gerenciador de migrations para produção. Rollback destrutivo está separado em `supabase/rollbacks` e não foi executado no ambiente de aplicação.

Leia [a análise do produto e arquitetura](docs/arquitetura.md), [o estado dos critérios de aceite](docs/aceite.md) e [as decisões e pendências](docs/decisoes.md).

Layout refinado em 20/10/2026: veja [a direção visual](docs/direcao-visual.md). As capturas da fundação anterior são históricas.

A fase 2 está descrita em [docs/fase-2.md](docs/fase-2.md). Para testar sem conta na prévia, abra [a demonstração do fornecedor](https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao).

## Guia público — fase 3

Guia, filtros regionais e perfis públicos implementados. Execute `npm run build:ssr && npm start` para servir HTML com conteúdo, sitemap e metadados na porta 5175. Detalhes, testes e limites em [docs/fase-3.md](docs/fase-3.md). A prévia de análise estática continua no [mesmo endereço](https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/guia), com empresas fictícias identificadas.

## Orçamentos — fase 4

Formulário público, envio protegido por Edge, e-mails em fila, caixa de pedidos com notas/status e lembrete de 48 horas. Para integração local, execute também `npm run local:quotations`; os testes E2E iniciam esse gateway automaticamente. Configuração definitiva e limites em [docs/fase-4.md](docs/fase-4.md). A prévia permanece uma demonstração identificada sem envio de e-mails.

## Especialidades e filtros inteligentes

O guia reúne 150 especialidades em 11 grupos, com seleção múltipla opcional e busca por nomes alternativos. Estado e cidade usam sugestões a partir de duas letras, com base de 27 UFs e 5.571 cidades. Fontes, conciliação e testes em [docs/guia-filtros-inteligentes.md](docs/guia-filtros-inteligentes.md).

### Administração — fase 5

Implementada e documentada em [docs/fase-5.md](docs/fase-5.md). Prévia administrativa: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-admin . O ambiente público continua demonstrativo; as integrações reais são verificadas no stack local. 193 assertivas SQL, 25 testes unitários, 4 HTTP, 17 E2E e integração SSR aprovados. Conferência pública: `node scripts/test-admin-preview.mjs`.

### Planos e créditos — fase 6

Prévia: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-plano . Implementação e pendências externas em [docs/fase-6.md](docs/fase-6.md). Preços reais aguardam definição; a prévia usa valores ilustrativos e não cobra. Stripe em modo teste ainda requer credenciais e configuração da conta para homologação externa. Validação local: 235 assertivas SQL, 27 unitários, nove HTTP e 18 E2E. `node scripts/test-billing-integration.mjs` verifica Auth/REST/banco reais com transporte Stripe controlado; `node scripts/test-billing-preview.mjs` confere a prévia pública.

### Conteúdo editorial — fase 7

Portal demonstrativo: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-editorial . Redação: `#/demonstracao-conteudo`; fornecedor: `#/demonstracao-materias`. Matérias, revistas, categorias, pautas, parceiros, revisão e newsletter com duplo aceite. Documentação em [docs/fase-7.md](docs/fase-7.md), incluindo agendamento de produção e limites de envio. O backend foi verificado localmente; a prévia usa dados fictícios e não envia e-mails. 299 assertivas SQL, 30 unitários, 13 HTTP e 21 E2E aprovados. SSR editorial: `node scripts/test-content-ssr.mjs`; conferência pública: `node scripts/test-content-preview.mjs`.

Fase 8 comercial: [documentação](docs/fase-8.md). Prévia no mesmo endereço, em [demonstração comercial](https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-comercial). Contratos e preços manuais, banners responsivos, três vagas de destaque por especialidade/UF e relatórios com links revogáveis. A prévia usa dados fictícios no navegador; backend e serviços definitivos seguem a implantação descrita na documentação.

Fase 9: [avaliações, métricas e crescimento](docs/fase-9.md). [Demonstração de resultados](https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-crescimento), [avaliações](https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-avaliacoes) e [moderação](https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao-moderacao). A prévia é fictícia e isolada no navegador; a implantação definitiva do backend e dos serviços externos permanece separada.
