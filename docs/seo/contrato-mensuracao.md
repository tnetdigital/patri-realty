# Contrato de mensuração — PT14

Versão `patri-measurement-14.1`. React/Vite/TypeScript/Node e contratos Supabase existentes. Sem GA4, tabelas, migrations, pixels, novos cookies ou eventos novos. Fontes sincronizadas do projeto permanecem somente leitura.

## Três relatórios e autoridade dos dados

| Relatório | Perguntas e fontes | Limite atual |
|---|---|---|
| Procura de fornecedores | Aberturas, buscas internas, cliques de contato e eventos de recibo. Pedidos reais na caixa operacional. Busca externa no GSC/Bing. | Evento aceito com consentimento é parcial. Clique não confirma conversa. Pedido não confirma qualificação, entrega de e-mail ou venda. |
| Aquisição de fornecedores | Cadastro, confirmação de e-mail, empresa aprovada, assinatura e pagamento são marcos distintos. CRM/comercial e financeiro são fontes operacionais. | Esses marcos não estão integrados ao resumo atual. Não inferir aquisição por orçamento de visitante, interesse comercial ou retorno de checkout. |
| Leitores | Aberturas de matéria, intervalos de atividade visível e cliques para perfil. Busca/citações na fonte externa correspondente. | Sem pessoas únicas, duração média ou leitura completa inferidas. Newsletter não tem atribuição individual à matéria no contrato atual. |

A visão administrativa de publicidade existente foi preservada separadamente, sem misturar impressões de anúncios com procura orgânica. O relatório editorial também usa projeção e exportação normalizadas: a razão de ticks por abertura é um proxy, nunca duração real de leitura.

O seletor do painel filtra os agregados que o usuário já tem permissão de consultar; não amplia acesso, não cria uma chamada por público e preserva o bloqueio de plano. A caixa operacional continua necessária, inclusive se analytics for recusado.

O dicionário completo está em [dicionario-metricas-prompt14.csv](dicionario-metricas-prompt14.csv). Ausente, indisponível e zero são estados distintos. Um campo ausente aparece como “Não disponível”. Zero exige retorno numérico explícito. Uma resposta inválida ou erro de rede mostra falha, sem substituir por zeros ou manter números antigos aparentando atualização.

## Datas, atualização e reconciliação

- Eventos próprios: dia civil em `America/Sao_Paulo`. Os filtros iniciais agora usam esse fuso, inclusive perto da virada UTC. Janela aceita pelo contrato existente: diferença de até 365 dias entre extremos inclusivos. O período anterior tem a mesma duração segundo a RPC.
- Search Console: datas no horário do Pacífico, representado por `America/Los_Angeles`. Não alinhar um dia GSC a um dia operacional como se tivessem a mesma fronteira UTC.
- Bing: registrar o fuso efetivamente informado pelo exportador. Se não estiver documentado na exportação, usar `source-unspecified`; não assumir São Paulo.
- `extractedAt` é extração; `dataThrough` é o último dia observado no lote, ou `null` quando desconhecido. `assessedAt` é a avaliação do inventário. Nenhum deles prova atualização instantânea.
- A RPC atual devolve `atualizado_em: now()`, horário da consulta, sem comprovar a última execução do job. O painel usa o recebimento da consulta e declara a agregação desconhecida. Não foi criada uma coluna para contornar essa limitação.
- Importações repetidas idênticas por fonte/URL/dia/métrica são deduplicadas. Sobreposição conflitante falha e deve ser resolvida pela origem, nunca somada. Snapshots de inclusão usam a última observação por URL; uma retirada não vira inclusão por união do histórico.
- A série de eventos vem agregada por dia/tipo na RPC. Seus agregados não dão dimensões de cidade, cluster ou URL de origem. Para detalhar mais, é preciso exportação autorizada com relação pública comprovada; não inventar um join.
- A classificação atual do backend pode usar a primeira especialidade e a UF da empresa. Isso não comprova todas as especialidades de atuação ou cobertura municipal. Não converter UF em atendimento a todas as cidades.

Os contadores reconciliados são observados dentro do **inventário atualmente elegível**. Fontes parciais produzem limites inferiores; não se presume zero para URL não retornada. As métricas de busca de URLs hoje retiradas ficam fora do cohort atual e precisam de um relatório histórico separado se o objetivo for histórico. O inventário não é um funil temporal de pessoas.

## Denominadores

1. `eligibleUrls`: URLs únicas que o inventário revisado declara publicadas e elegíveis, com versão/evidência e momento da avaliação. O reconciliador não aprova conteúdo nem substitui SSR/gate.
2. `listedUrls`: URLs desse conjunto observadas no XML. Não indica envio ou aceitação do sitemap por um buscador.
3. `submittedUrls`: URLs do lote relacionado a recibo de submissão. Um contador agregado do GSC não permite reconstruir a lista exata; manter indisponível se faltar essa relação.
4. `googleIndexedUrls`: evidência por URL inspecionada/exportada. Inspeção parcial não mede todo o inventário e uma URL não inspecionada não é “não indexada”.
5. `googleImpressionUrls` e `googleClickUrls`: URLs distintas com observação positiva, no recorte GSC. Cliques e sessões não são intercambiáveis.
6. `quotationUrls`: URLs com pedidos **operacionais** associados por evidência, distintos dos eventos opcionais de recibo. Não são URLs com vendas nem taxa de conversão SEO.

Não calcular uma taxa universal misturando datas, motores, filtros, timezones, coverage ou autoridade. CTR só é cliques/impressões do mesmo recorte. Posição média é uma média definida pela fonte, não posição fixa nem média simples de médias. O exportador atual omite posição em vez de agregá-la incorretamente. Impressões/citações de IA não são cliques; receita confirmada não é receita atribuída a SEO.

## Contrato de entrada e exportações locais

Validador e tipos: `src/features/measurement/reconcile.ts`. Fixture exclusivamente sintética: `tests/fixtures/measurement.ts`. O exemplo reconciliado público identifica `mode: synthetic`; nunca usá-lo como baseline produtivo.

Campos obrigatórios:

| Bloco | Campos |
|---|---|
| Raiz | `version`, `mode` real/synthetic, `origin` HTTPS sem caminho, `from`, `to`, `inventory`, `sources` |
| Inventário | `assessedAt` ISO com timezone, `evidenceId` slug da evidência privada, `complete`, `rows` |
| URL do inventário | `url` canônica pública, `eligible`, `audience` procura/aquisicao/leitores, `segment`, `supplier`, `uf`, `city`, `cluster` |
| Fonte | `source`, `evidenceId`, `extractedAt`, `dataThrough`, `timezone`, `coverage` complete/partial, `collection`, `rows` |
| Observação | `url`, `date` YYYY-MM-DD, `metric`, `value` inteiro não negativo seguro |

Dimensões sem comprovação devem ser `null`. Especialidade/cidade/cluster são slugs do catálogo ou mapeamento editorial aprovado; fornecedor é UUID público. Cidade exige UF e é agrupada como UF/cidade, sem fundir homônimos. Há uma classificação principal por URL; inventário duplicado com dimensões conflitantes é rejeitado. Não fazer alocação múltipla sem um modelo separado e denominadores explícitos. Família é derivada do caminho. Grupo `__unavailable__` é ausência de dimensão, não uma localidade real.

Fontes/métricas aceitas:

| source | metric | collection |
|---|---|---|
| sitemap | listed (0/1) | platform |
| submission | submitted (0/1) | platform |
| gsc-index | indexed (0/1) | platform |
| gsc-search / bing-search | impressions / clicks | platform |
| gsc-ai | impressions | platform |
| bing-ai | citations | platform |
| events | profile_views / article_views / contact_clicks / quotation_receipts | consented |
| operations | quotations_registered / suppliers_registered / suppliers_approved / payments_confirmed / revenue_cents | operational |

Lotes da mesma fonte com fusos divergentes são rejeitados. Tráfego GSC exige datas do Pacífico.

Os lotes operacionais devem ter sido deduplicados na fonte por ID de pedido/cadastro/pagamento antes da agregação. Os IDs pessoais não entram nas dimensões. O contrato confirma a forma declarada, não comprova sozinho a veracidade do sistema externo. Se a origem não permite associação por URL, manter a métrica por URL indisponível e usar o relatório operacional apropriado. Não distribuir receita total por todas as páginas.

URLs de outro host, tokens, áreas privadas, queries, fragmentos, campos adicionais e nomes/e-mails/telefones livres são rejeitados. Origens conhecidas de prévia ou fixture não podem ser marcadas `real`. Linhas públicas fora do inventário são contadas como divergência, sem entrar nos totais. Linhas de URLs não elegíveis também são sinalizadas. Receitas não podem ser importadas como métricas GSC. Um lote de analytics exige `collection: consented`; isso não dispensa auditoria do consentimento na origem.

### Execução

Executar na raiz do checkout, com Node 22 atual e dependências existentes. Criar uma pasta privada fora do repositório, como `output/patri-realty-private/measurement` no projeto pai. Arquivos reais e credenciais nunca devem entrar no Git público. O exportador recusa saída dentro do checkout, resolve o diretório pai e não sobrescreve destinos existentes. Não usar a pasta sincronizada `sources/` como destino.

```text
npm run report:measurement -- CAMINHO_PRIVADO/input-aprovado.json CAMINHO_PRIVADO/relatorio-novo.json
npm run export:gsc -- CAMINHO_PRIVADO/input-aprovado.json CAMINHO_PRIVADO/plano-gsc-novo.json
```

O primeiro lê JSON e gera reconciliação. O segundo **somente gera plano por padrão**, sem rede. `input-aprovado.json` deve seguir o contrato acima e conter inventário real revisado, não a fixture. Começar com `sources: []` se não houver exportações; ausências continuam `null` nos relatórios.

Com propriedade autorizada, fornecer `PATRI_GSC_PROPERTY` e `PATRI_GSC_ACCESS_TOKEN` por ambiente privado (não flags, código, arquivos públicos ou chat), com escopo `https://www.googleapis.com/auth/webmasters.readonly`. Então:

```text
npm run export:gsc -- CAMINHO_PRIVADO/input-aprovado.json CAMINHO_PRIVADO/export-gsc-novo.json --read
npm run report:measurement -- CAMINHO_PRIVADO/export-gsc-novo.json CAMINHO_PRIVADO/relatorio-gsc-novo.json
```

Esse conector faz apenas `Sites.list` e `SearchAnalytics.query`: valida acesso à propriedade selecionada e sua relação com o host; aceita propriedade de domínio pertinente ou URL-prefix da origem exata. Não cria propriedade, submete sitemap, faz inspeção de URL em massa, modifica controles ou solicita OAuth automaticamente. Falhas não imprimem token, resposta remota ou conteúdo privado.

Consulta Web final por data/página, 25.000 linhas por chamada, até quatro chamadas. A paginação não elimina os limites internos de top rows do GSC: coverage continua `partial`, mesmo quando acaba a paginação. Ao atingir o orçamento, `budgetReached` sinaliza a necessidade de particionar a extração sob controle. Só exporta cliques/impressões para URLs elegíveis já presentes no inventário. Não grava consultas de usuários, origem livre, posição ou URLs privadas retornadas pela API; conta omissões. A saída contém `input` normalizado e `audit`; o reconciliador aceita esse envelope.

Para Bing, GSC AI, indexação e operações, o adaptador de leitura é o contrato de lote normalizado acima. Exportar pela interface oficial ou pela RPC autorizada existente, selecionar somente colunas necessárias, registrar recorte/fuso/data/evidência e converter para esse JSON antes da reconciliação. Não foi inventada uma API de AI Performance ou um nome de coluna de CSV não confirmado. O resumo existente continua via `resumo_metricas(sid,date_from,date_to)` com o usuário autorizado; nenhum service role é exigido pelo painel. Dados crus, recibos e evidências ficam privados.

## Consentimento e atribuição

Os eventos existentes continuam com consentimento prévio e enumeração permitida, sem texto da busca, contato, formulário, URL de origem livre ou payload arbitrário. O identificador técnico de sessão existente não comprova uma pessoa ou visitante único e não é exportado como dimensão nestes relatórios. Nenhuma nova sessão foi introduzida. IDs públicos de empresa/matéria ajudam a associação permitida; não se atribui cidade, cluster ou canal que não esteja comprovado.

Pedidos operacionais e confirmação de pagamento seguem as finalidades e permissões existentes, sem depender do aceite de analytics. Rejeitar analytics não pode impedir orçamento. O gateway e o backend de produção continuam sujeitos à homologação anterior.

UTM e identificadores de origem continuam na URL quando já preservados pelo PT03, com canonical limpo; não foi alterada sua normalização. Os relatórios mantêm origem por fonte externa e recorte. O contrato atual de eventos não armazena origem de navegação nem relaciona clique GSC a sessão/pedido: não há atribuição multitoque, cross-device ou de receita por canal. Não introduzir parâmetros livres em eventos para simular essa ligação. Para mudança futura, será preciso desenho de consentimento e contrato próprio, com classificação de origem em enumeração restrita, nunca referer ou query crus.

## Contas, IA e governança

Verificação de disponibilidade em 23/10/2026 pelo conector Windsor: não há propriedade Patri Realty entre as contas Search Console conectadas; Bing não aparece conectado. Não foram consultadas métricas de outros projetos, adicionadas contas ou feitas alterações externas. Acesso à configuração real da propriedade Patri não foi comprovado.

Documentação atual consultada:

- [GSC Generative AI performance](https://support.google.com/webmasters/answer/16984139?hl=en): relatório de impressões por páginas e outros recortes para os recursos cobertos; ausência do relatório pode ter mais de uma causa. Não diagnosticar bloqueio ou zero pela ausência.
- [Controle Search generative AI](https://support.google.com/webmasters/answer/16908024): conferir na propriedade correta em Settings → Search generative AI, inclusive herança do domínio pai. Esse controle de participação em recursos generativos é distinto de Google-Extended e de noindex. Estado atual da Patri: **não verificado**; nenhuma configuração foi modificada.
- [Anúncio oficial dos relatórios Google](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports): dados de IA podem estar incluídos no total de desempenho; não somar recortes sobrepostos ao total Web.
- [Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/): citações em Microsoft Copilot, resumos do Bing e integrações parceiras selecionadas. Não indica ranking nem cobertura de todos os assistentes; confirmar escopo/filtros da versão disponível na conta antes de importar.
- [Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query): limites internos, dimensões, paginação e escopo de leitura. [Limites e privacidade do GSC](https://developers.google.com/search/blog/2022/10/performance-data-deep-dive) explicam por que totais e linhas podem divergir.

O painel de perguntas [painel-perguntas-ia-prompt14.csv](painel-perguntas-ia-prompt14.csv) contém 12 perguntas públicas planejadas, com resultados vazios e status `nao-executado`. Antes de executar manualmente, preencher plataforma, modelo/versão exibida ou “não informado”, data/hora com offset, idioma/região e contexto de busca habilitada. Guardar fontes citadas, URL Patri ou ausência explícita, correção factual, escopo da resposta e referência da captura privada. Comparar amostras com mesmo protocolo, registrar variação e repetir em momentos distintos. Não transformar amostra em ranking universal, não inferir presença por menção sem link e não enviar prompts privados. Não foi executada consulta automática a plataformas de IA.

Rotina sugerida, não agendada: semanalmente conferir qualidade e reconciliação; mensalmente revisar aquisição e financeiro com responsáveis; amostras de IA conforme protocolo. Tratar diferença de fontes como hipótese a investigar, não somar contagens incompatíveis. Sem criação de automação nesta etapa.
