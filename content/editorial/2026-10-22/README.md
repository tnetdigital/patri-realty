# Patri Realty — edição editorial de 22/10/2026

12 artigos originais em português para revisão, antes da produção: cinco pautas de imóveis/condomínios/construção; uma curadoria Michelin; três hotéis e três restaurantes em perfis separados. Recorte imobiliário brasileiro e Michelin internacional. Não é ranking mundial oficial.

Abra `site/index.html` para leitura portátil, inclusive sem internet depois de extrair o ZIP. As fotos estão incluídas. As fontes externas e os canais de reserva exigem internet.

- `articles/`: 12 manuscritos Markdown com fontes, FAQ, verbetes e kit social.
- `articles.json`: conteúdo completo e metadados para integração editorial; status rascunho, sem data de publicação fabricada.
- `images/`: 11 fotografias reais e `licenses.json` com autoria, origem, licença, data, dimensões informadas e SHA-256. Uma foto é reutilizada na curadoria.
- `site/`: 13 páginas HTML portáteis de revisão, todas noindex.
- `research/`: respostas da API Commons e notas de apuração, preservadas para rastreabilidade.
- `export-schema.mjs`: gerador de BlogPosting, ImageObject, BreadcrumbList, DefinedTermSet e ItemList para a futura integração em produção. Exige domínio HTTPS definitivo e data real de publicação, não faz deploy.

## Critério de qualidade e limites

Apuração documental em 22/10/2026. Não simulamos visitas, refeições ou hospedagens. As recomendações de diligência e operação são síntese editorial da Patri Realty, não resultados medidos ou avaliações técnicas de um projeto. Não divulgamos retorno de investimento, economia percentual, disponibilidade, tarifas ou preços sem base adequada.

No Almaz, omitimos autoria dos interiores por divergência dentro da própria página oficial. A foto mostra o entorno do Ibirapuera, não uma obra concluída. A pauta usa um lançamento apresentado nas fontes recentes; não afirma lançamento ocorrido exatamente hoje.

Bosco Verticale é caso existente, concluído em 2014, não lançamento de 2026. A primeira foto candidata do Commons mostrava apenas um reflexo distante e foi descartada após inspeção visual; a imagem usada mostra o skyline com o conjunto identificado no contexto. A foto do Passalacqua, de 2019, antecede a abertura do hotel em 2022. A imagem do Le Louis XV é do exterior do hotel que o abriga. Fotografias de arquivo nunca são apresentadas como configuração atual de quartos ou pratos.

As distinções Michelin foram verificadas nas fichas e seleções oficiais. Hotéis: três Chaves; restaurantes: três Estrelas. Royal Mansour foi excluído por não estar na mesma faixa de Chaves no material consultado. Não misturar essas distinções com cinco estrelas hoteleiras ou rankings de outros veículos. Não há vínculo comercial inferido, avaliação presencial ou endosso destes estabelecimentos à Patri Realty.

## Fotos e reutilização

Não copiamos fotos de reportagens presumindo que crédito fosse autorização. As imagens vieram do Wikimedia Commons sob domínio público, CC BY ou CC BY-SA, conforme cada registro. Preserve nome do fotógrafo, link da fonte, licença e indicação de alterações. Uma adaptação de imagem BY-SA deve respeitar a mesma licença ou uma compatível; isso não transforma automaticamente todo o texto do artigo em obra sob essa licença. As fotografias foram mantidas sem edição editorial; quando aplicável, o Commons forneceu uma versão redimensionada. Cards no navegador exibem recorte visual por CSS; o arquivo e a leitura completa preservam a proporção.

## SEO, AEO e GEO aplicados

Cada texto tem intenção de busca própria, título e descrição exclusivos, slug, hierarquia H1/H2, resposta inicial direta, entidades identificadas por lugar/país, fontes próximas das afirmações, FAQ visível, verbetes, texto alternativo, crédito e ligações entre pautas complementares. AEO e GEO são usados como práticas de clareza e rastreabilidade para mecanismos de resposta e geração; localização das entidades é um atributo adicional, não uma redefinição de GEO como SEO geográfico.

A visão geral Michelin atende busca de comparação; os seis perfis atendem busca por estabelecimento, reduzindo sobreposição editorial. Não foram inventados volumes de busca ou resultados de ferramentas pagas. FAQ ajuda o leitor, mas não prometemos rich results: o Google informa que esse recurso deixou de aparecer em 7/05/2026. Não incluímos FAQPage como promessa de elegibilidade. Também não há esquema especial obrigatório para aparecer em respostas de IA, nem garantia de citação. Não foram gerados llms.txt, notas de avaliação ou estrelas de avaliação fictícias.

Referências técnicas consultadas em 22/10/2026:

- [Google Search — atualizações, incluindo FAQ e llms.txt em 2026](https://developers.google.com/search/updates)
- [Google — recursos de IA e seu site](https://developers.google.com/search/docs/appearance/ai-features)

## Integração antes de produção

1. Revisar conteúdo e reconfirmar informação volátil na data efetiva de publicação, especialmente Michelin, equipes, calendários e condições de atendimento.
2. Importar os manuscritos como rascunhos; não trocar dados fictícios de demonstração por notícias reais sem revisão editorial.
3. Hospedar as fotos incluídas em armazenamento controlado, preservar licenças e atualizar URLs. O preview remoto usa URLs públicas do Commons e oferece fonte alternativa em caso de indisponibilidade.
4. Definir domínio, URL canônica, data efetiva e autoria institucional no CMS. Gerar JSON-LD com `node export-schema.mjs URL_HTTPS_DEFINITIVA DATA_ISO_REAL`; incorporar ao HTML renderizado junto ao texto correspondente e conferir no validador aplicável. Se houver publicação em dias diferentes, gerar apenas os itens aprovados com suas datas reais; não atribuir a data deste lote a todos automaticamente.
5. Manter a prévia noindex. Ao publicar artigos aprovados nas rotas definitivas renderizadas no servidor, usar canonical próprio, Open Graph, sitemap e links internos reais. Não indexar URLs com hash do ambiente demonstrativo.
6. Conferir imagens, acessibilidade e leitura móvel; enviar sitemap e monitorar indexação no Search Console do domínio real. Medir consultas e engajamento para orientar revisões; não prometer ranqueamento.

A integração do lote ao banco/CMS e a publicação de produção ainda não foram executadas. A entrega concreta é o conteúdo completo, o pacote portátil e a área de revisão no endereço provisório permanente.
