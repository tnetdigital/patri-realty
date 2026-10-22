# Patri Realty — diagnóstico atualizado de SEO, AEO, GEO e MPI

Data de referência: **22/10/2026**. Escopo: **prompts 00 e 01**, com código inalterado.

## 1. Veredito

**Não liberar lançamento orgânico nem expansão de páginas locais neste estado.** Existe uma base funcional relevante e o SSR próprio entrega conteúdo em testes controlados; não há razão demonstrada para migrar stack. Os bloqueios prioritários são exposição de rascunhos, proteção insuficiente da prévia, divergências técnicas de indexação e ausência da regra de elegibilidade regional.

O repositório remoto continua em `8102f37f4d53b90bc76f9160f0fa13722885570c`, o mesmo da auditoria citada no histórico. Isso explica a permanência de achados, mas eles foram revalidados nesta execução: por leitura do código, requisições reais à prévia e testes do SSR compilado com transporte sintético.

Não foram feitas correções, publicação, migração, escrita em banco ou alteração de configuração remota. O usuário recebe este diagnóstico antes da próxima decisão de implementação.

## 2. Ambiente, método e grau de evidência

Repositório: `https://github.com/tnetdigital/patri-realty`, público, branch `main`. Obtida uma cópia nova e isolada para não interferir em trabalhos existentes. A árvore começou limpa.

Ambiente local: Windows, Node 22.19.0 e npm 10.9.3. Instaladas dependências do lockfile usando `npm ci --ignore-scripts --no-audit --no-fund`; nenhum arquivo versionado foi regravado. Não há `.env`, `.env.local`, `.env.production` ou stack Docker configurada nesta cópia. Docker não foi encontrado no PATH.

Métodos:

- **Código atual:** rotas, SSR, servidor HTTP, modelos, loaders/APIs, projeções públicas, políticas SQL, schemas, eventos, estilos, testes e configuração de CI.
- **HTTP público real:** sete requisições GET anônimas; leitura dos bundles referenciados pelo HTML, incluindo o chunk editorial. Nenhum formulário foi enviado.
- **SSR real, dados sintéticos:** importação do módulo compilado e execução de 15 cenários de renderização mais falha de backend; servidor HTTP real em duas modalidades controladas. As chamadas de backend do modo live foram interceptadas em memória. Nenhum dado sintético foi publicado ou gravado em banco.
- **Verificações de engenharia:** build cliente/SSR, tipagem frontend/Edge, lint, testes unitários, suíte HTTP/regressões, auditoria de dependências e scanner de padrões de segredos.
- **Referência normativa:** Mestre v5.1 completo e Playbook 1.1 encontrados localmente, além do manual do agente e relatório MPI v3. Decisões específicas do usuário prevalecem nos conflitos identificados.

Limites: não foi testado um banco real, uma conta de produção, GSC, Bing, WAF, e-mail, pagamento, cron, backup ou conversão persistida. A tentativa de inspeção visual pela ferramenta de navegador não conseguiu anexar a página; mobile, hidratação e sobreposição visual não foram aprovados nesta rodada. HTTP público funcionou independentemente dessa ferramenta.

Os testes SSR controlados provam comportamento do código com determinada resposta de API. Não provam fornecedores reais, RLS em operação, disponibilidade de backend ou produção homologada. A consulta pública sem H1 não demonstra o que um robô verificado recebeu; não houve acesso ao GSC/logs para essa verificação.

## 3. Inventário encontrado

| Item | Situação observada |
|---|---|
| Stack | React 18.3.1, Vite 6.4.4, React Router 7.18.4, TanStack Query 5.104.5, Supabase JS 2.118.0, TypeScript 5.9.3 |
| Renderização no código | `src/entry-server.tsx`, `server.mjs`, cliente com hidratação em `src/main.tsx` |
| Prévia hospedada | AppDeploy, aplicação estática com HashRouter identificado no bundle; SSR próprio não é o HTML servido nas amostras |
| Arquivos versionados | 443 antes da documentação nova |
| Rotas | 72 padrões inventariados, incluindo fallback e cinco rotas de Auth produzidas por mapeamento; não equivalem a 72 páginas públicas indexáveis |
| Catálogo | 150 especialidades, 11 grupos, 27 arquivos de UF e 5.571 registros municipais no dataset versionado |
| Editorial para revisão | 12 registros, todos com `status=rascunho`, também disponíveis no chunk público |
| Banco | 38 arquivos de migration e 15 arquivos SQL de teste; aplicação em backend atual não verificada |
| OG local | PNG 1200 × 630, 36.685 bytes; dimensões/peso aprovados apenas para esse arquivo |
| Logotipo original | `public/resources/logotipo.jpg` ausente nesta cópia; aplicação em produção não homologada |
| Integrações | Contratos e implementações encontrados; configuração e funcionamento externos não comprovados |

`inventario-rotas.csv` tem **241 registros**, divididos entre padrões de rota, candidatas da taxonomia, rascunhos e URLs efetivamente consultadas. Cada linha informa o tipo de evidência; o total não é quantidade de URLs publicadas ou de oportunidades aprovadas.

Não há base para calcular o número de cidades viáveis, tráfego potencial ou fornecedores reais disponíveis. O produto cartesiano de 150 especialidades por 5.571 registros municipais produziria candidatas sem comprovação de valor e não constitui autorização de publicação.

## 4. O que a prévia realmente respondeu

| Consulta anônima | HTTP | Resultado |
|---|---:|---|
| `/` | 200 | HTML com raiz vazia, zero H1, sem canonical e sem JSON-LD inicial |
| `/guia` | 200 | Mesmo HTML da raiz, ainda sem conteúdo principal |
| `/previa-editorial` | 200 | Mesmo invólucro estático; não exige autenticação para obter o pacote da aplicação |
| `/rota-inexistente-auditoria-20261022` | 200 | Mesmo corpo do endereço válido: soft 404 no host atual |
| `/robots.txt` | 200 | Bloqueia `*`, exceto facebookexternalhit; não protege rascunhos |
| `/sitemap.xml` | 403 | XML AccessDenied, sem inventário utilizável |
| `/guia`, Accept `text/markdown` | 200 | HTML estático; nenhuma representação Markdown negociada |

Os quatro documentos HTML têm 6.932 bytes e o mesmo hash registrado nas evidências. O HTML inicial não contém meta robots nem X-Robots-Tag; há restrição em robots.txt e regras no cliente, que são mecanismos diferentes.

O HTML referencia `assets/index-D5OFtXHI.js`. Esse bundle referencia `assets/EditorialPreview-Ct34TpfK.js`, obtido por GET anônimo com HTTP 200 e **89.173 bytes**. Nele foram encontrados os slugs dos **12 rascunhos** e seus dados editoriais. Portanto, a exposição não depende de conseguir abrir visualmente a tela: o conteúdo está distribuído no recurso público.

O bloqueio de robôs da prévia é compatível com um ambiente de análise. Não recomendo simplesmente liberar robots nesse host: primeiro é necessário proteger staging e homologar o domínio/SSR de produção. `robots.txt` e `noindex` não são controles de confidencialidade. Referência: [Google sobre limites do robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

## 5. Reproduções no SSR atual

| Cenário com dados controlados | Resultado atual | Avaliação |
|---|---|---|
| Guia local, zero fornecedores | 200, `noindex=false` | Falhou |
| Guia local, um fornecedor | 200, `noindex=false` | Falhou |
| Guia local, dois fornecedores | 200, `noindex=false` | Falhou |
| Guia local, três fornecedores | 200, `noindex=false`, sem avaliação adicional de qualidade | Falhou como prova do gate completo |
| Guia nacional sem query | H1 no HTML e indexabilidade liberada, mesmo com resposta vazia | Falta gate de utilidade/oferta |
| Mesmo guia com `utm_source=chatgpt.com` | `noindex=true`; canonical HTTP contém a UTM | Falhou |
| Paginação/ordenação | Qualquer query recebe noindex no SSR; cliente adota outro critério | Falhou na consistência; estratégia por classe precisa ser definida |
| Fornecedor sintético existente | 200, um H1 e LocalBusiness, sem `@id` de fornecedor/Service | Parcial |
| Fornecedor inexistente | 404, noindex | Aprovado no escopo controlado |
| Matéria sintética existente | 200, um H1 e Article | Parcial; autoria institucional marcada Person |
| Matéria inexistente | 404, noindex | Aprovado no escopo controlado |
| Rota completamente inexistente | 404 local | Aprovado localmente; host público diverge |
| `/guia/elevadores/sp/campinas/extra` | 200, indexável no SSR, embora não exista rota correspondente no React | Falhou; achado adicional |
| `/previa-editorial` no SSR | Status 404/noindex, mas o corpo React ainda renderiza a prévia editorial | Falhou na confidencialidade; status não remove o conteúdo |
| Backend controlado responde indisponível | HTTP 503 do servidor real | Aprovado nesse caminho |
| Accept Markdown no SSR | 200 com `text/html`, mesmo corpo | Falhou no requisito interno de representação negociada |
| Asset `/assets/index-DTqFmAHe.js` no Windows | HTTP 403 | Falhou nesta plataforma; não extrapolar para Linux |

As UTMs identificam origem, não justificam excluir automaticamente uma página equivalente. Canonical, sitemap e comportamento do navegador devem concordar. Referência: [orientações de canonicalização do Google](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

## 6. Achados atuais e correções propostas

### F01 — P0: rascunhos públicos e ausência de controle efetivo de prévia

**Situação:** existe com lacuna. **Status: falhou.**

`src/pages/EditorialPreview.tsx:3` importa o JSON completo de rascunhos. `src/pages/App.tsx:129` expõe a rota sem RequireRole. A branch é pública e o chunk editorial é servido anonimamente pela prévia. No SSR, atribuir 404 não impede que a rota React produza o conteúdo.

Impacto: material não aprovado é distribuído e o controle editorial deixa de proteger a exposição. Correção proposta: autenticação na infraestrutura/servidor, fonte privada de rascunhos, projeção pública somente aprovada e exclusão do grafo público de imports. Tratar histórico/caches/cópias com plano específico, sem presumir que apagar do build elimina versões anteriores. Não foi alterada a visibilidade do repositório.

Aceite: GET anônimo não obtém rascunho por página, endpoint, arquivo, chunk, Markdown, feed ou cache; revisão autenticada funciona. Prova em servidor local e host real.

### F02 — P0 para lançamento: arquitetura publicada diferente do SSR implementado

**Situação:** existe com lacuna. **Status: falhou como prova de produção.**

Amostras públicas retornam raiz vazia, zero H1 e soft 404; o SSR local produz HTML e 404 nos casos básicos. Não é correto declarar que o projeto inteiro não tem SSR; o problema é a publicação efetiva da arquitetura necessária no destino.

Aceite: domínio/ambiente produtivo autorizado entrega conteúdo, status e metadata no HTML inicial, acesso direto e refresh; staging permanece restrito. Não migrar framework para resolver uma configuração de publicação sem necessidade demonstrada.

### F03 — P0: regras divergentes de canonical e indexação por query

**Situação:** existe com lacuna. **Status: falhou.**

`server.mjs:177` concatena `u.search` ao canonical. `src/entry-server.tsx:271` aplica noindex a qualquer query. `src/pages/Directory.tsx:65` também conserva query no canonical, enquanto `Directory.tsx:287` usa somente pesquisa textual/not_found para noindex. `ContentPublic.tsx` mantém ainda sua própria regra.

Aceite: política compartilhada por família/classe para UTM, paginação, ordenação, filtros e busca; UTM equivalente preserva indexabilidade e canonical limpo; servidor e cliente não se contradizem após navegação/hidratação.

### F04 — P0: mínimo de três fornecedores e cobertura municipal não aplicados

**Situação:** falta. **Status: falhou.**

Reproduzido `index,follow` no ramo live do servidor com zero fornecedores. O resultado se repete com um/dois no render compilado. Não há decisão compartilhada de elegibilidade em SSR, cliente e sitemap.

`supabase/migrations/20261020012603_public_directory.sql:99` gera localidades por fornecedores visíveis, mas a linha 107 expande cobertura estadual sem cidade para todos os municípios da UF, sem contagem mínima e sem prova municipal. A API pública de sitemap é reutilizada pelo frontend/servidor.

Aceite: identidade distinta de fornecedor, segmento correto, publicação, cobertura municipal comprovada, mínimo três, conteúdo útil e demais gates. Com prova insuficiente: noindex e fora do sitemap. Enquanto backend estiver adiado, usar os dados existentes e bloquear o que não puder ser comprovado; nenhuma migration é necessária para iniciar a proteção conservadora no servidor/frontend.

### F05 — P1: sitemap sem lastmod e sem fonte comum de elegibilidade

**Situação:** existe com lacuna. **Status: falhou.**

`server.mjs:82` produz XML e escapa valores, mas não serializa lastmod. Inclui localidades vindas do RPC sem gate, e o SQL lista todos os segmentos ativos, independentemente de utilidade/oferta. Em resposta sintética, o servidor publicou no sitemap a cidade que sua listagem exibiu vazia. Isso prova o comportamento do integrador, não uma inconsistência já consultada em banco real.

Aceite: somente URLs públicas canônicas elegíveis; lastmod derivado de alteração material quando houver fonte confiável, sem usar data do build; XML válido; resposta real verificada no destino. O 403 da prévia, isoladamente, não é evidência do comportamento de um domínio de produção desconhecido.

### F06 — P1: rota excedente recebe 200 e indexação no SSR

**Situação:** existe com lacuna. **Status: falhou.**

`src/entry-server.tsx:195` usa reconhecimento por prefixo amplo, enquanto App possui padrões completos. `/guia/elevadores/sp/campinas/extra` recebe 200/indexável; React cai no fallback. Não basta testar uma única URL completamente desconhecida.

Aceite: uma fonte de reconhecimento de rotas para servidor/cliente; rejeitar segmentos extras e parâmetros inválidos com status correto, sem regressão nas rotas existentes.

### F07 — P1: guias nacionais e locais sem conteúdo específico suficiente

**Situação:** existe com lacuna. **Status: falhou no template.**

`Directory.tsx:297` reutiliza a mesma introdução de `features/directory/texts.ts`. O template possui filtros, cards, ordenação e paginação, mas não critérios segmentados de escolha, escopo, limitações ou contexto local comprovado. Listagem SSR não emite CollectionPage/ItemList.

Aceite: informação útil para comparar/contratar por especialidade, somente dados comprovados, seleção real de empresas e metadados coerentes. Começar pelos guias nacionais prioritários, sem preencher todas as especialidades artificialmente.

### F08 — P1: grafo de entidades incompleto e autoria institucional incorreta

**Situação:** existe com lacuna. **Status: falhou.**

`entry-server.tsx:103` gera LocalBusiness para todo perfil, sem `@id` estável, sem Service.provider e sem verificar se LocalBusiness é semanticamente apropriado para cada empresa. Na home, Organization tem ID na linha 212; WebSite, na 217, não tem ID. Nas linhas 178–179, a redação institucional é representada por Person. Faltam relações estáveis entre plataforma, fornecedor, redação e páginas.

Aceite: Organization/WebSite/WebPage e entidades por família; Service.provider do terceiro; autoria verdadeira; listagens com CollectionPage/ItemList; schema seguro e coerente. Não foi encontrada criação de filiais fictícias da plataforma; preservar esse comportamento.

### F09 — P1: revisão editorial existe, mas aprovação exigida por versão não foi comprovada

**Situação:** existe com lacuna. **Status: falhou na comprovação do requisito específico.**

Há estados editoriais, versão, papéis de editor e auditoria no SQL. Isso é diferente de comprovar aprovação de Tércio da versão atual de texto, fontes, mídia e metadados. Os 12 rascunhos têm status e verifiedAt, sem prova acessível dessa aprovação. Busca no código não encontrou contrato integrado de aprovação por hash/versão que satisfaça o requisito atual.

Aceite: registrar aprovação real vinculada à versão do pacote editorial; alteração material exige revisão; sem nova tabela neste escopo adiado, reaproveitar estruturas e manter bloqueio conservador. Não interpretar a falta de comprovação como ausência de toda moderação.

### F10 — P1: OG genérica e ausência de alt social

**Situação:** existe com lacuna. **Status: falhou parcialmente.**

`server.mjs:177` usa imagem global e `og:type=website` inclusive em matérias; não emite og:image:alt. O arquivo global passa em dimensão/peso. A prévia usa ainda metadata própria do AppDeploy, diferente do SSR.

Aceite: metadata por família, tipo article para matérias, imagem autorizada/contextual e alt pertinente; verificar HTML no host final. Não é necessário recriar imagens existentes para corrigir o template.

### F11 — P1: possível sobreposição do CTA mobile requer nova inspeção visual

**Situação:** existe com lacuna. **Status: não testado visualmente nesta rodada.**

O achado anterior continua pertinente: navegação de contato está em `Directory.tsx:610`; barra mobile tem z-index 20; cookies chegam a 70. Isso demonstra potencial de sobreposição, mas não prova sozinho a geometria atual. A tentativa de navegador desta rodada falhou e não autorizo um novo “aprovado mobile” com base apenas no CSS.

Aceite: CTA visível/clicável em 320–390 pixels com banner, teclado, menu e áreas seguras; formulário funciona sem analytics; envio único comprovado com backend de homologação. Os handlers separam envio de mensuração no código, mas a persistência não foi retestada.

### F12 — P1 para lançamento: identidade e recursos finais incompletos

**Situação:** existe com lacuna. **Status: falhou na prontidão local; produção não testada.**

CNPJ informado consta em brand.ts/rodapé. Identidade legal tem fallback pendente e textos preservam necessidade de revisão; razão social e canais não foram comprovados. Original do logotipo ausente na árvore. Não foi feita consulta cadastral, prova jurídica ou verificação de conta de produção.

Aceite: identidade fornecida e validada pelo responsável, contatos testados, revisão jurídica registrada quando aplicável e logotipo original aplicado sem reconstrução. Creditar imagem não basta para provar direito de uso; as licenças dos 12 textos não foram reapuradas nesta auditoria.

### F13 — P2: representação Markdown não implementada

**Situação:** falta. **Status: falhou no requisito interno do Mestre.**

Accept text/markdown devolve text/html tanto no servidor local quanto na prévia. Arquivos Markdown de conteúdo não substituem negociação da representação por URL. Esse requisito é interno, não uma obrigação para ranking Google.

Aceite: se mantido o requisito v5.1, derivar HTML/Markdown da mesma projeção aprovada, com MIME, cache/Vary, privacidade e equivalência; sem liberar rascunhos.

### F14 — P1 no ambiente Windows: assets do SSR retornam 403

**Situação:** existe com lacuna. **Status: falhou nesta plataforma.**

Reproduzido com asset realmente emitido pelo build. `server.mjs:128` compara caminho resolvido do Windows com `resolve('dist') + '/'`; o separador incompatível causa rejeição de arquivos legítimos. Não foi reproduzido em Linux e isso não prova falha no container de produção.

Aceite: resolução segura e portável de caminhos, assets legítimos 200 e tentativas de escapar do diretório rejeitadas. Preservar proteção de path traversal.

### F15 — P2: regressão de tipagem não é portável para Windows

**Situação:** existe com lacuna. **Status: falhou como teste local; não comprova erro de tipo da aplicação.**

Dos 55 testes HTTP/regressões, 54 passaram. `tests/corrections-typecheck.test.mjs:12` executa `spawnSync('npx', ...)` e não trata falha de spawn; no Windows foi reproduzido ENOENT, stdout undefined, seguido de falha em assert.match. O typecheck normal frontend/Edge passou. O CI Quality em Linux do commit auditado está concluído com sucesso.

Aceite: invocação portável do compilador e diagnóstico explícito de falha do processo; fixture com erro realmente precisa falhar por tipo e o caso válido passar. Não corrigido nesta auditoria.

### F16 — P1/P2: operação de produção permanece não homologada

**Situação:** existe com lacuna. **Status: não testado no destino.**

O preflight desta cópia limpa informa 25 verificações pendentes. Isso decorre de ausência de configuração local e não prova 25 defeitos em um ambiente remoto. Contratos de Auth, RLS, orçamentos, newsletter, cobrança e filas existem; banco/serviços reais não foram acessados. Número de testes históricos não substitui homologação externa.

Aceite: domínio, SSR real, dados públicos elegíveis, autenticação, e-mail, pagamentos em sandbox, cron, monitoramento e recuperação testados nos destinos autorizados. Nenhuma criação de Supabase ou migration foi feita nesta rodada.

### F17 — P1: Quality Gate de página não implementado como política de publicação

**Situação:** falta no caminho público avaliado. **Status: falhou para a regra adotada no pacote MPI.**

Há diagnóstico de completude do perfil e fluxos de aprovação. Não são equivalentes a um Quality Score de página e portões eliminatórios compartilhados com SSR/sitemap. Não foi atribuído score numérico aos dados sintéticos ou às páginas reais sem revisão.

Aceite: rubrica interna explícita/versionada, evidências, revisão humana e bloqueios absolutos. Score >=75 não compensa cobertura desconhecida, rascunho ou erro técnico. Registrar a adaptação em relação ao Mestre v5.1.

### F18 — P1: influência paga na ordenação insuficientemente explicada

**Situação:** existe com lacuna. **Status: falhou no requisito de transparência junto à listagem.**

Há rótulos Patrocinado e Publicidade e política pública geral. A ordenação considera destaque/patrocínio, mas a listagem não explica claramente essa influência perto do resultado/controle de relevância. Não foi verificada a operação comercial real.

Aceite: explicar ordem e peso comercial sem confundir pagamento com certificação de qualidade; manter rótulos, política de avaliações e separação de conteúdo de marca.

## 7. Conformidade com o Mestre v5.1

“Já existe”, “Existe com lacuna” e “Falta” descrevem implementação encontrada. “Aprovado”, “Falhou”, “Não testado” e “Não aplicável” descrevem o resultado no escopo. Uma linha pode ter subitens aprovados e ainda falhar como conjunto.

### §14.1 — Fundação

| Requisito adaptado | Situação | Status | Evidência/limite |
|---|---|---|---|
| Domínio primário próprio/HTTPS/canonical | Existe com lacuna | Não testado em produção | Prévia HTTPS existe; domínio definitivo não foi identificado/homologado |
| SSR ativo na stack atual | Já existe | Aprovado local controlado | HTML com H1 em guias/perfil/matéria; não equivale à implantação no host |
| Robots, busca, agentes, treino e WAF | Existe com lacuna | Não testado no destino | Servidor live permite acesso público; prévia bloqueia robôs; contas/logs WAF não consultados |
| Controle generativo no GSC | Falta evidência | Não testado | Sem acesso à propriedade/conta |
| Sitemap elegível e lastmod real | Existe com lacuna | Falhou | F04/F05; XML tem escape, sem filtro/lastmod |
| 404, noindex e staging autenticado | Existe com lacuna | Falhou | 404 básico local passa; extra path e host falham; rascunhos expostos |
| GSC/Bing e eventos próprios | Existe com lacuna | Não testado em produção | Código de eventos existe, sem coleta real homologada |
| Identidade SEO/IDs/política de treino | Existe com lacuna | Falhou | Organization parcial; WebSite/fornecedor sem IDs completos |
| Privacidade/canal/identificação | Existe com lacuna | Falhou na prontidão | Páginas presentes, identidade/revisão finais não comprovadas |
| RLS/grants e ausência de segredos | Existe com lacuna | Não testado em backend | Scanner por padrões passou na árvore; não prova RLS nem ausência universal de segredos |

Migração para TanStack Start e implementação de GA4/Consent Mode para GA4: **não aplicáveis**, conforme decisões do usuário. Não são tarefas pendentes.

### §14.2 — Página indexável

| Requisito | Situação | Status | Evidência/limite |
|---|---|---|---|
| HTML inicial completo + JSON-LD + Markdown | Existe com lacuna | Falhou no conjunto | SSR HTML existe; schemas de listagens e Markdown faltam; prévia é SPA |
| HTTP/canonical/robots corretos | Existe com lacuna | Falhou | UTMs, query, extra path, elegibilidade e divergência cliente/SSR |
| Title/description únicos e adequados | Existe com lacuna | Falhou | Guias usam introdução genérica e metadados divergentes; unicidade do inventário real não verificada |
| H1/resposta inicial/FAQ acessível | Existe com lacuna | Falhou no conjunto | H1 único nas amostras; introduções não específicas; FAQ já existe em perfis |
| Utilidade/originalidade/fatos/fontes | Existe com lacuna | Falhou no template de guia | 12 textos têm fontes, mas não foram reapurados nem pontuados nesta rodada |
| Revisão humana registrada por versão | Existe com lacuna | Falhou na comprovação | Workflow existe; aprovação exigida de Tércio não comprovada |
| JSON-LD seguro/semântico/coerente | Existe com lacuna | Falhou no conjunto | Escape de `<` existe; faltam entidades/relações e há autoria institucional Person |
| OG contextual, dimensões/peso/alt | Existe com lacuna | Falhou no conjunto | Arquivo global passa em tamanho/peso; imagem por matéria/alt/tipo faltam |
| Links internos e ausência de órfãs | Já existe parcialmente | Não testado integralmente | Navegação HTML encontrada; grafo publicado real indisponível |
| CTA mobile, sem analytics e deduplicação | Existe com lacuna | Não testado ponta a ponta | Código separa envio/evento; sem prova atual visual/persistência |
| LCP/CLS e dados de campo | Existe com lacuna | Não testado nesta rodada | Evidências históricas preservadas; sem nova medição/campo |
| Sem hydration mismatch | Existe com lacuna | Não testado no browser | SSR em memória não valida hidratação; assets falham no Windows |
| Aprovação jurídica/direitos quando aplicáveis | Existe com lacuna | Não testado/aprovação pendente | Minutas e licenças precisam de comprovação apropriada |

### §8.7 — Diretório/marketplace

| Regra | Situação | Status | Evidência/limite |
|---|---|---|---|
| Plataforma, fornecedor e redação distintos | Existe com lacuna | Falhou na representação | Estruturas separadas, grafo incompleto |
| Service.provider do terceiro; sem filiais fictícias | Existe com lacuna | Falhou no conjunto | Service ausente; não encontrada criação de filiais locais da Patri |
| Cidade com >=3 reais e cobertura comprovada | Falta | Falhou | 0/1/2 indexáveis em testes; SQL expande UF |
| Avaliações reais/moderadas/política pública | Existe com lacuna | Não testado em operação | Código/termos presentes; realidade e viés da moderação não aferidos |
| Publicidade e ordem paga transparentes | Existe com lacuna | Falhou parcialmente | Rótulos presentes; influência na ordem não explicada na listagem |
| Demonstrações fora da indexação produtiva | Já existe parcialmente | Aprovado no render amostrado | Modo demo SSR aplica noindex; privacidade dos rascunhos segue falha própria |
| Conversões por público | Já existe | Aprovado na estrutura | Orçamento, cadastro/plano e newsletter; entrega real não homologada |
| Reaproveitar estruturas existentes | Já existe | Aprovado na abordagem | Nenhuma duplicação de tabelas proposta/implementada nesta rodada |

## 8. Resultados de engenharia desta execução

| Verificação | Resultado atual | Limite |
|---|---|---|
| Instalação pelo lockfile, sem scripts | Aprovado | 340 pacotes adicionados à cópia local; sem alteração do lockfile |
| Build cliente e SSR | Aprovado | Prova compilação, não hospedagem/conversão |
| Typecheck frontend + Edge | Aprovado | Não executa Edge Runtime real |
| Lint | Aprovado | Sem alterações de código |
| Unitários | **35/35 aprovados** | 10 arquivos |
| HTTP/regressões existentes | **54/55 aprovados** | Um teste de spawn npx incompatível com Windows; F15 |
| npm audit completo | **0 ocorrências reportadas** | Resultado do registro na data; não é auditoria completa de segurança |
| Scanner de segredos versionados | Aprovado no escopo por padrões | Não cobre todos os formatos, histórico, infraestrutura nem arquivos privados |
| CI GitHub do commit | Concluído com sucesso | [Execução Quality](https://github.com/tnetdigital/patri-realty/actions/runs/39825510665), Linux/Node 24, escopo do workflow |
| launch:check | **Bloqueado: 25 verificações pendentes nesta cópia** | Ausência de configuração local, não inventário de falhas do destino |
| SQL/RLS, E2E reais, Stripe/SMTP/Auth externos | Não testados | Sem stack/credenciais; scripts de integração gravam fixtures e não foram executados |
| Mobile/CWV/hidratação | Não testados nesta rodada | Tentativa visual indisponível; resultados antigos não foram reciclados como novos |

Os scripts históricos `test-public-ssr.mjs` e outros fluxos de integração criam/removem dados no banco local. Foram lidos, não executados. Para manter o escopo de leitura, os testes complementares usaram transporte interceptado, renderização em memória e GETs.

## 9. Ordem de execução recomendada após revisão do diagnóstico

1. **Prompt 02:** proteger prévia e rascunhos — F01; definir remediação de cópias públicas sem ação destrutiva implícita.
2. **Prompt 03:** unificar HTTP/canonical/robots e reconhecimento de rotas — F03/F06; considerar F14 para permitir homologação Windows.
3. **Prompt 04:** gate compartilhado de elegibilidade e qualidade — F04/F17; retirar localidades não comprovadas do sitemap, sem criar tabelas.
4. **Prompts 05–07:** pesquisa/matriz, entidades e guias nacionais — F07/F08/F18.
5. **Prompts 08–12:** perfis, editorial, interlinking, conversão, mobile e mídia — F09/F10/F11/F12.
6. **Prompts 13–16:** sitemap/descoberta, métricas, piloto e destino real — F02/F05/F13/F16.
7. **Prompt 17:** monitoramento e expansão somente com dados reais.

O backlog detalha impacto, esforço, dependências, aceites e QA. Não é necessário aguardar Supabase para iniciar proteção de rascunhos, correção de canonical/HTTP, bloqueios conservadores ou melhoria de templates. Persistência e produção continuam com status próprio.

## 10. Resultado dos prompts 00 e 01

**Prompt 00 concluído:** contexto e decisões registrados, referências identificadas e conflitos adaptados sem migração.

**Prompt 01 concluído:** inventário de 241 registros, diagnóstico com 18 achados/itens de atenção, matrizes dos requisitos e evidências reproduzíveis. Não foi fabricado inventário de empresas reais ou score de qualidade.

**Código, banco, GitHub e publicação permanecem inalterados.** A documentação nova está somente nesta cópia local. O próximo sprint é uma proposta, não foi iniciado.

Prévia anterior, sem atualização nesta entrega: [Patri Realty](https://patri-realty-previa-05je1j.v2.appdeploy.ai/). Continua sendo ambiente demonstrativo e não prova lançamento real.
