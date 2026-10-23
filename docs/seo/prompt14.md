# PT14 — Mensuração SEO, IA e receita

Executado em 23/10/2026. Stack atual preservada. Entrega: relatórios revisados, contrato auditável, dicionário, reconciliação e conector de leitura preparado. Sem GA4, novas tabelas, migrations, eventos, cookies ou serviços contratados.

## Objetivo, escopo e aceite

Dependências: PT11 e PT13 aprovados. Objetivo: medir aquisição e resultado por família, segmento, fornecedor, localidade e cluster com autoridade e denominadores explícitos. Escopo: projeções de relatórios existentes, validação, exportações de leitura e documentação. Aceite local: dados auditáveis, fontes separadas, privacidade preservada e nenhuma métrica fictícia apresentada como real. As integrações de conta têm preparação concluída e acesso real pendente.

## O que mudou

| Área | Alteração e motivo |
|---|---|
| Painel de métricas | Relatórios separados para procura de fornecedores, aquisição de fornecedores e leitores. Publicidade preservada em visão separada para administrador. Evita misturar objetivos e contagens. |
| Ausência e zero | Campo ausente aparece “Não disponível”; zero exige retorno explícito. Falha de consulta ou payload inválido não é preenchida com zeros. |
| Fonte e atualização | Exibe fonte, fuso, cobertura parcial por consentimento e horário de recebimento. Última agregação permanece desconhecida; `now()` da RPC não é tratado como execução do job. |
| Datas e comparação | Validação de datas reais, intervalo, período retornado e duplicatas. Filtros iniciais em São Paulo, inclusive na virada UTC. Variação exige contadores explícitos e base anterior positiva. |
| Leitores | “Leituras” passa a “aberturas”. Ticks de atividade não representam leitores únicos ou leitura completa. Relatório editorial e CSV normalizam o antigo campo de tempo como proxy, indisponível sem aberturas. |
| CSV | Apenas agregados permitidos e campos normalizados. Relatório editorial conserva a neutralização existente de fórmulas de planilha. Não exporta o payload inteiro da API. |
| Reconciliação | Contrato por fonte, público, família, segmento, fornecedor, UF, cidade/UF e cluster. Mantém elegibilidade, listagem, submissão, indexação, impressões, cliques e pedidos operacionais separados. |
| GSC | Exportador preparado de leitura: verifica propriedade, consulta Web final por data/página e projeta apenas URLs públicas elegíveis do inventário. Padrão é gerar plano sem fazer chamadas. |
| IA | Dicionário e painel de 12 perguntas públicas planejadas. Fontes oficiais atuais consultadas; nenhuma resposta ou citação fictícia preenchida. |

O painel mantém a RPC `resumo_metricas`, o relatório editorial mantém `relatorio_editorial`, e as permissões/plano continuam existentes. A validação e os novos nomes são projeções de apresentação; não alteram schema ou persistência. A skill React foi aplicada à revisão de hooks, dependências, filtros, erros, acessibilidade e importações. A validação de tela não introduz Zod na cadeia de imports do navegador; o contrato Zod de reconciliação é usado pelas ferramentas locais.

## Entregáveis

- [Contrato e instruções de execução](contrato-mensuracao.md): fontes, denominadores, datas, coleta, privacidade, origem, passos de conta e comandos.
- [Dicionário de métricas](dicionario-metricas-prompt14.csv): definição, autoridade, unidade/denominador, atualização e limitações.
- [Painel de perguntas para IA](painel-perguntas-ia-prompt14.csv): intenção, público, plataforma/modelo, data, idioma/região, prompt, fontes, URL Patri, correção e evidência; resultados vazios, status não executado.
- [QA controlado](evidencias-prompt14/qa.json) e [exemplo explicitamente sintético](evidencias-prompt14/exemplo-sintetico.json). Os números do exemplo não pertencem à Patri Realty.
- Ferramentas `npm run report:measurement`, `npm run export:gsc` e `npm run test:measurement`. Entrada/saída documentadas no contrato. Exportações reais ficam fora do checkout público, sem sobrescrita de arquivos existentes.

## Como interpretar os resultados

O reconciliador aceita inventário revisado e lotes normalizados. Uma URL no XML não comprova submissão aceita, indexação ou tráfego. Uma sessão não equivale a clique GSC. Os conjuntos observados são contados dentro do inventário atualmente elegível, sem afirmar que formam um funil de pessoas ou uma coorte histórica completa. Exportações parciais são limites inferiores; ausência de linha não é zero.

Snapshots usam a última observação por URL; uma retirada não é apagada por união com inclusões antigas. Importações idênticas são deduplicadas; valores conflitantes para a mesma fonte/URL/dia/métrica interrompem o relatório. URLs fora do inventário ou hoje inelegíveis são sinalizadas. `null` preserva indisponibilidade. As fontes mantêm seu próprio fuso e datas, sem converter arbitrariamente dia do Pacífico em dia de São Paulo.

Eventos opcionais de recibo seguem distintos de pedidos operacionais. Registros de cadastro, fornecedor aprovado, pagamento e receita não estão integrados ao painel. O conector de relatórios aceita lotes operacionais verificados, mas não fabrica a relação entre URL e resultado. Receita confirmada nesses lotes não é receita atribuída ao SEO. Sem relação comprovada, a dimensão fica indisponível e o total deve ser acompanhado no sistema operacional apropriado.

UTM/canonical do PT03 foram preservados. Não se acrescentou origem livre a eventos ou PII a dimensões. O contrato atual não persiste ligação entre clique GSC, sessão, newsletter, pedido e receita: esta entrega não promete atribuição multitoque ou conversão orgânica individual.

## Contas e controles reais

A descoberta de conexões pelo Windsor.ai encontrou Search Console conectado para outros projetos, sem propriedade Patri Realty. Bing não estava conectado. Nenhuma métrica de outro domínio foi consultada ou incorporada, e nenhuma conta foi adicionada. O Supabase teve documentação e changelog conferidos; nenhuma base real ou credencial foi consultada para esta implementação.

Consequentemente, permanecem **não verificados** na conta Patri: propriedade/escopo real, dados GSC/Bing, controle de inclusão em recursos generativos e disponibilidade específica dos relatórios de IA. Essa indisponibilidade não foi interpretada como zero, exclusão ou problema de ranking.

A documentação atual do Google contempla relatório de impressões de IA e um controle de participação em recursos generativos na conta, distinto de Google-Extended/noindex e sujeito à herança da propriedade pai. O roteiro registra essa conferência, sem alterar o controle. O relatório de IA não deve ser somado a totais Web sobrepostos. O AI Performance do Bing cobre suas superfícies suportadas; citações não indicam posição universal ou vendas. Fontes oficiais e detalhes constam do contrato.

GSC preparado: escopo readonly, propriedade conferida em `Sites.list`, consultas de leitura em `SearchAnalytics.query`, paginação de até quatro chamadas de 25.000 linhas, coverage sempre parcial pelos limites internos da fonte. Sem envio de sitemap, criação de propriedade, inspeção em massa, OAuth iniciado automaticamente ou endpoint de IA não documentado. `PATRI_GSC_PROPERTY` e `PATRI_GSC_ACCESS_TOKEN` são opcionais, privados e vazios no exemplo de ambiente. O CLI não os carrega de arquivos públicos nem registra seus valores.

Bing, indexação, IA e operações têm adaptador de entrada validado e roteiro de exportação oficial/manual. Não há extração automática desses dados sem acesso e contrato da conta. O estado de configuração dos recursos generativos da Patri permanece pendente de inspeção autorizada.

## Testes

| Verificação | Resultado |
|---|---|
| Unitários, incluindo contratos de datas, zero/ausência, editorial, dimensões, consentimento declarado e reconciliação | 191 aprovados |
| HTTP e regressões existentes | 65 aprovados |
| PT14: mocks GSC, arquivos privados, CLI e navegador | 25 cenários aprovados |
| Conversões sob consentimento/recusa e falhas opcionais de analytics | 8 cenários aprovados |
| Sitemap, política de descoberta e revogação | 23 verificações aprovadas |
| Contrato SEO/SSR | 22 verificações aprovadas |
| Experiência pública e regressões editoriais | 24 + 12 cenários aprovados |
| CSVs de dicionário e painel de IA | 22 definições e 12 perguntas, estrutura validada |
| Build cliente e SSR, typecheck, lint, ambiente e isolamento editorial | Aprovados |

O QA PT14 cobre a propriedade correta/incorreta, resposta 403, paginação vazia, omissão de URLs privadas, ausência de credenciais na saída, saída proibida dentro do repositório, ausência de sobrescrita, geração de plano sem rede, relatórios separados, zero explícito, campos ausentes, erro/má formação sem números enganosos, plano bloqueado, datas e CSV editorial. Mobile sem overflow em 320/375/768 pixels CSS; sem erro JavaScript nos percursos controlados.

As chamadas GSC nos testes usam transporte simulado e as chamadas RPC do navegador são interceptadas. Não comprovam conexão da conta Patri, agregação ou persistência no banco real, cron, aprovação de conteúdo, recebimento financeiro ou entrega de mensagens. A demonstração existente só gera exemplos por ação explícita e continua identificada como fictícia. O novo painel real não recebe os exemplos sintéticos automaticamente.

## Publicação, limites e sequência

Código, testes e documentação publicados no repositório público atual, sem histórico reescrito. Relatório para análise: [PT14 no GitHub](https://github.com/tnetdigital/patri-realty/blob/main/docs/seo/prompt14.md).

A prévia AppDeploy permanece na versão anterior: o limite de créditos comunicado no PT04 não teve resolução informada. Não houve tentativa de deploy, remoção de senha ou criação de outro app. Esta entrega não é uma comprovação de painel atualizado online.

Para produção: confirmar domínio e propriedade Patri, fornecer acesso de leitura pelo meio privado apropriado, conferir controles/recortes na conta, homologar os jobs e fontes operacionais, gerar inventário real revisado e reconciliar o primeiro lote. Pendências anteriores de proteção, editorial/Data API, oferta municipal, identidade legal e integrações permanecem. Não existem números de aquisição, indexação, citação ou receita reais nesta entrega.

Próximo: **PT15 — piloto e portão de publicação**, após autorização. Preparar lote revisável com dados e aprovações reais, reduzindo-o onde faltar evidência. A preparação do lote não autoriza publicação externa nem o preenchimento de cotas com fixtures.
