# PT13 — Sitemap, rastreamento e acesso por IA

Executado em 23/10/2026. Stack preservada: React 18, Vite, TypeScript e servidor Node SSR. Sem migration, novas dependências, alteração de permissões do banco ou liberação de conteúdo.

## Resultado e alterações

O sitemap agora recebe o mesmo runtime revisado usado pelo SSR, incluindo o manifesto editorial. Antes, `contentSitemap(runtime)` não recebia as aprovações externas. Cada candidato agora passa pelo próprio `render`, que devolve a avaliação compartilhada `decideSeo`: somente resposta 200, rota pública, indexável, sem redirect e com canonical exatamente igual à URL candidata entra no XML. Isso revalida perfis, publicações, aliases e o gate municipal, sem copiar suas regras.

`server/discovery.mjs` centraliza geração e política de robôs. Candidatos são deduplicados; slugs vindos dos inventários aceitam somente letras minúsculas ASCII, números e hífens. Entradas com query, fragmento, outra origem ou caminho inseguro são recusadas. XML em UTF-8 com namespace e escape; sem `lastmod`, `priority` ou `changefreq` inventados. `/evento`, sem programação homologada, foi retirado da lista fixa. Demais páginas institucionais mantêm o contrato de publicação anterior; isso não certifica conclusão de sua identificação legal.

Os três guias nacionais retidos continuam fora. Uma matéria revogada desaparece na próxima requisição; cidades exigem o gate vigente; perfil ausente não entra. Não há autorização adicional de Tércio nem dados reais fabricados.

Na prévia, autenticação continua antes de robots, sitemap, APIs e assets. Mesmo autenticada, a prévia entrega sitemap vazio e `Disallow: /`, sem anunciar sitemap. `noindex` e cache privado permanecem. Em produção, robots anuncia somente a origem configurada e restringe áreas administrativas, autenticação, APIs, tokens, demonstrações e busca interna. Guias em `noindex` continuam rastreáveis para leitura da diretiva. Não foi usado `Disallow` como mecanismo de segurança.

## Escala, integridade e limites

O limite oficial é 50.000 URLs ou 50 MB descompactados por sitemap. O lote atual usa um único `urlset`; nenhum índice ou paginação artificial foi criado. Há um orçamento operacional explícito de **200 candidatos únicos**, menor que o limite oficial, porque esta implementação revalida o SSR completo a cada requisição, sem cache público. Acima disso, ou em falha de dependência, responde 503/no-store em vez de publicar inventário truncado ou desatualizado. Essa barreira exige inventário e avaliação de custo antes de ampliar; não significa suporte produtivo já homologado a grandes catálogos.

O teste controlado final produziu 13 URLs, incluindo uma matéria e um perfil sintéticos, já com a cidade revogada. O inventário produtivo e sua quantidade não foram aferidos. Não há comprovação de completude do RPC de origem, nem descoberta automática de páginas ausentes nele. Antes de escalar, comparar um inventário independente com RPC, navegação e sitemap, avaliar duração, timeouts e limites do backend. Se necessário, implementar inventário elegível paginado e índices/partições estáveis; não aumentar o orçamento sem QA. O rastreador do PT10 continua aceitando este `urlset`; futuros índices exigirão adaptação dele.

Paginação HTML segue o PT03 e permanece acessível pelos links de navegação. Este sitemap lista destinos canônicos de entrada, sem enumerar filtros ou páginas de resultados; não é obrigatório listar toda paginação. A paginação editorial piloto continua limitada ao contrato do PT09, sem alegação de escala.

## Política de busca e IA

Não havia decisão específica aprovada para restringir treinamento. Foi preservado o acesso público pelo grupo `User-agent: *`, com as restrições comuns acima. Não foram criadas permissões especiais, bypass de autenticação ou respostas diferentes para robôs. Esta continuidade permite também crawlers de treinamento que respeitem esse grupo; não equivale a contrato de licenciamento nem obrigação de acesso a dados privados.

| Agente/controle | Função e decisão neste PT |
|---|---|
| Googlebot | Busca Google, inclusive elegibilidade para recursos de IA da busca. Acesso público pelo grupo comum; nenhuma garantia de indexação ou citação. |
| Google-Extended | Controle distinto relacionado ao uso em Gemini/treinamento e grounding descritos pelo Google; não é um User-Agent separado de transporte e não determina inclusão na Busca Google. Mantida a política anterior, sem novo bloqueio. |
| Bingbot | Rastreamento de busca Bing. Sitemap preparado; ferramentas e propriedade ainda precisam homologação. |
| OAI-SearchBot | Descoberta para busca no ChatGPT; acesso comum preservado. |
| GPTBot | Coleta potencial para treinamento; acesso comum preservado, distinguido de busca. |
| ChatGPT-User | Requisições iniciadas por usuários; a documentação informa que robots pode não se aplicar como em crawlers automáticos. Autenticação e autorização continuam obrigatórias. |
| Claude-SearchBot | Busca e relevância de respostas; acesso comum preservado. |
| ClaudeBot | Coleta para treinamento; acesso comum preservado. |
| Claude-User | Recuperação solicitada por usuário; tratar separadamente de coleta automática. Sem exceção de acesso a dados privados. |

Não foi criado `llms.txt`: opcional para consumidores que o utilizem, sem efeito positivo ou negativo prometido na Busca Google. Não havia feed público adicional a adaptar. HTML e Markdown editorial continuam derivados do mesmo payload aprovado no PT09; não se criou cópia de rascunhos.

## Homologação online e WAF/CDN

Não há acesso comprovado nesta execução à configuração real de WAF/CDN, aos logs de origem ou a uma propriedade produtiva de buscadores. Alterar User-Agent no laboratório verifica apenas consistência da resposta; não prova visita legítima nem passagem pelo WAF real.

Antes da produção:

1. Confirmar domínio HTTPS e `VITE_SITE_URL`, hosts autorizados e ambiente; não usar domínio da prévia como canonical produtivo. Manter a prévia autenticada.
2. Publicar o SSR revisado no ambiente autorizado e confirmar sitemap/robots, headers e cada amostra com 200/autocanonical/indexável. Nunca abrir áreas privadas por User-Agent ou IP de robô.
3. Exportar e revisar regras reais do WAF/CDN, desafios, bloqueios por país, limites de taxa e cache. Usar identidade de bot verificada pelo provedor ou IPs oficiais atualizados; para Google, validar IPs oficiais ou DNS reverso **e resolução direta correspondente**. Não confiar no texto do User-Agent, nem em IP enviado livremente por header.
4. Correlacionar requisições reais nos logs de borda/origem com rastreadores verificados e testes das ferramentas de webmaster. Inspecionar 401/403/429/5xx, desafios e acesso a HTML, XML, CSS e JS. Não registrar tokens, senhas ou dados de formulários nos relatórios.
5. Conferir retirada de aprovação, redirects e indisponibilidade. Robots não garante desindexação de URL conhecida; `noindex` exige leitura da página, e conteúdo privado exige controle de acesso.

## Submissão e IndexNow — preparado, não executado

Após homologar domínio, backend e lote aprovado, acessar a propriedade verificada correta no Search Console e em Bing Webmaster Tools, submeter `https://DOMINIO_CONFIRMADO/sitemap.xml` e guardar recibo, horário e estado de processamento. O placeholder é instrução de configuração, não URL publicada. Monitorar URLs elegíveis, submetidas e indexadas separadamente; envio não garante indexação. Reenviar somente quando houver motivo ou erro corrigido. Sem ping descontinuado do Google e sem Indexing API para páginas comuns deste diretório.

IndexNow foi avaliado, mas não ativado: requer domínio confirmado, autorização operacional e prova de controle. Sua chave é uma prova pública de propriedade servida em arquivo UTF-8 no domínio, **não um segredo de autenticação**; proteger a gravação/rotação do arquivo e manter credenciais administrativas fora do frontend/Git. Confirmar `host`, `keyLocation` e URLs do mesmo domínio, enfileirar somente alterações materiais reais, deduplicar e respeitar respostas/retentativas e limite de até 10.000 URLs por POST. Payload de teste deve permanecer local, sem enviar fixtures ou prévia. Não promete indexação e não substitui sitemap; remoções reais exigem tratamento próprio (404/410 ou diretiva adequada), sem reaproveitar cegamente a lista de URLs atualmente elegíveis. Nenhuma chave foi gerada ou integração externa chamada.

## QA e critérios de aceite

Evidências em [qa.json](evidencias-prompt13/qa.json) e [sitemap sintético](evidencias-prompt13/sitemap-sintetico.xml). São fixtures locais, não aprovações, inventário ou respostas produtivas.

- 23 verificações específicas de descoberta: candidatos seguros, duplicatas, exclusões, erro de origem, orçamento, indisponibilidade, robots, status/canonical reais no servidor controlado, gate municipal, perfis e aprovação/revogação editorial.
- XML validado adicionalmente com parser `ElementTree`: namespace, origem e unicidade das 13 URLs sintéticas.
- Proteção: 5 testes de acesso e 15 cenários HTTP, incluindo robots/sitemap autenticados sem descoberta e robô simulado anônimo negado.
- Build cliente/SSR, 158 unitários, 65 HTTP, 22 SEO, 17 gate municipal, 11 descoberta e 14 grafo aprovados. Typecheck, lint, ambiente e isolamento editorial aprovados.
- Nenhuma comprovação de WAF real, Google/Bing/OpenAI/Claude rastreando produção, submissão, indexação ou citação. Sem teste de banco real nesta etapa.

Critérios locais cumpridos: regra do SSR aplicada; prévia protegida; rascunhos e áreas privadas excluídos; manifesto editorial compartilhado; XML válido; falha fechada; stack preservada. Escala e publicação online dependem da homologação descrita acima.

## Publicação e próximo passo

Alterações e relatório entregues pelo GitHub. A prévia AppDeploy continua no snapshot anterior: limite de créditos informado no PT04 permanece sem resolução comunicada. Não houve nova tentativa de deploy, remoção de senha ou criação de outro app. O link de análise desta entrega aponta ao relatório, e não a uma prévia atualizada.

Pendências anteriores preservadas: aprovação real de conteúdo/oferta municipal, gate equivalente na Data API/RPC antes de expor artigos em produção, identidade legal e integrações externas. Próximo: **PT14 — mensuração SEO, IA e receita**, após autorização, aproveitando eventos existentes sem introduzir GA4, tabelas ou números artificiais.

## Fontes oficiais consultadas em 23/10/2026

- [Google: construção e submissão de sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- [Google: lastmod e descontinuação do ping](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping).
- [Google: otimização para recursos generativos](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
- [Google: controles Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers).
- [Google: verificação de crawlers](https://developers.google.com/search/docs/crawling-indexing/verifying-googlebot).
- [OpenAI: funções e controles dos bots](https://developers.openai.com/api/docs/bots).
- [Anthropic: três classes de agentes](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler).
- [Bing: sitemaps](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed).
- [IndexNow: protocolo](https://www.indexnow.org/documentation).

Aplicados também o manual AGENTE_MESTRE_MPI e o relatório MPI v3 (seção 7), com precedência das instruções do projeto e da documentação oficial atual sobre exemplos históricos.
