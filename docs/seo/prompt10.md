# Prompt 10 — interlinking e descoberta

Data: 22/10/2026. Execução autorizada. React/Vite/TypeScript e SSR existentes preservados; sem migração, publicação de rascunhos, nova aprovação editorial ou mudança de URLs.

## Objetivo e resultado

Conectar guias, perfis e matérias por especialidade declarada e vínculo editorial explícito, com links presentes no HTML inicial. O lote controlado passou com **zero links quebrados, zero órfãs, zero redirecionamentos internos e um único componente conectado**. São 9 destinos no inventário sintético e 11 páginas públicas rastreadas; a profundidade máxima do inventário foi 3.

Este resultado é de QA sintético. **Não constitui homologação do inventário produtivo, aprovação de fornecedores ou aprovação de conteúdos reais.**

## Implementação

| Origem | Destino e condição |
|---|---|
| Entrada pública | Guia e matérias, por navegação existente |
| Guia geral | Especialidades presentes no catálogo com oferta positiva; pilotos em preparação excluídos |
| Perfil | Especialidades declaradas que também existem no catálogo com oferta positiva |
| Perfil | Até 3 outros perfis da mesma primeira especialidade; reconsulta da projeção pública, identidade/slug diferentes, sem redirect e requisitos essenciais válidos |
| Guia de especialidade | Até 3 matérias aprovadas vinculadas explicitamente aos primeiros 3 fornecedores da seleção; sem inferência por palavras ou categoria |
| Matéria | Perfil associado, somente se a projeção pública atual existir, tiver identidade essencial e não for alias |
| Guia nacional | Guias municipais pelo gate já implementado, com validade e oferta comprovada |
| Listagens | Paginação HTML existente preservada e conferida sem JavaScript |

Os vínculos com matérias de empresas são identificados como autoria/associação, sem alegação de recomendação editorial. Não foram inventadas relações para matérias editoriais sem associação documentada. A limitação aos primeiros fornecedores acompanha a ordenação já existente, que pode incluir destaque pago; não representa ranking de qualidade ou seleção editorial independente.

As recomendações de fornecedores e leituras são pré-carregadas no SSR. Falha em recomendação opcional omite o bloco; a página principal não depende dela. O destino da matéria e as recomendações revalidam no cliente a cada 15 segundos e ao voltar à janela. Não existe garantia de retirada instantânea de um documento já aberto.

Cards de perfis incompletos deixam de emitir links; o ItemList usa o mesmo filtro para refletir os cards visíveis. As contagens e a paginação continuam sendo as informadas pelo backend; esta etapa não altera o cálculo produtivo dessas contagens. Os breadcrumbs e os bloqueios de publicação anteriores foram preservados.

Não há município escolhido por proximidade, sorteio de links, UTM interno novo, geração de páginas ou ciclo artificial para produzir volume. Filtros funcionais continuam disponíveis, separados do inventário recomendado para indexação. Os três guias nacionais retidos no PT07 continuam noindex e fora das novas recomendações.

## Áreas afetadas

- `src/features/directory/relations.ts`: consulta e validação dos fornecedores relacionados.
- `src/features/directory/SupplierDestination.tsx`: destino público atual da matéria.
- `src/features/content/GuideReadings.tsx`: relações editoriais explícitas da seleção.
- `src/pages/Directory.tsx`, `ContentPublic.tsx` e `src/entry-server.tsx`: navegação e HTML inicial.
- `src/seo/structured.ts`: ItemList coerente com os cards elegíveis.
- `scripts/crawl-discovery.mjs`, `scripts/test-discovery.mjs` e `tests/discovery-http.test.mjs`: rastreamento e QA.

## Relatório de rastreamento

Evidência: [grafo sintético](evidencias-prompt10/grafo-sintetico.json). Contém inventário, páginas/arestas, status, noindex, órfãs, erros, redirects, profundidade por URL, páginas além de três cliques, componentes conexos e sinal de truncamento. O grafo considera as famílias guia/perfil/matéria/revista; não pretende auditar todo o portal administrativo ou institucional.

O rastreador parte exclusivamente de `/` para medir descoberta. Depois consulta também os itens do inventário que não encontrou, distinguindo uma página órfã de uma página indisponível. Só extrai âncoras HTML com href da mesma origem; não executa scripts, não usa sitemap como atalho de navegação, não segue formulários nem solicita ações de conversão. Paginação `pagina` entra no percurso; filtros, parâmetros de rastreamento e demonstrações ficam fora.

Limites explícitos: até 200 páginas por rodada, requisições com prazo de 10 segundos, sitemap simples `urlset` e um domínio/origem. Sitemap index, grande escala e autenticação não são suportados nesta ferramenta piloto. Uma rodada truncada ou com órfãs, erros ou redirects termina com falha. Erro de rede interrompe a execução; não autoriza declarar aceite. A proteção da prévia não deve ser contornada. O grafo não mede indexação, posição no Google, backlinks ou citações por IA.

### Como repetir na origem homologada

Com o servidor e seu ambiente já configurados, executar:

```text
npm run audit:discovery -- ORIGEM_HOMOLOGADA - CAMINHO_DO_RELATORIO.json
```

`-` lê o inventário do sitemap público dessa origem. Para comparar com um lote aprovado independente do sitemap, substituir `-` pelo caminho de um JSON com array de URLs relativas, por exemplo `["/", "/guia", "/fornecedor/slug-validado"]`. Esse inventário independente é necessário para detectar páginas ausentes tanto da navegação quanto do sitemap.

Não interpretar um sitemap vazio, uma tela de senha ou o HTML antigo da prévia como confirmação do código atual. Para inventário real, cruzar sitemap com o registro autorizado de perfis e matérias antes do aceite. Não usar apenas o conjunto descoberto como inventário, porque isso esconderia órfãs.

A meta de até três cliques é convenção de navegação adotada neste piloto; não é requisito oficial de ranking nem promessa de indexação.

## Testes e critérios de aceite

[Evidência específica](evidencias-prompt10/qa.json): 11 cenários, incluindo navegação guia → matéria → perfil sem JavaScript em 375px, links no HTML inicial, paginação até a 13ª matéria, exclusão de perfil incompleto, retirada de fornecedor, perda de elegibilidade municipal e revogação editorial. O teste negativo do rastreador também injeta órfã, erro, alias, noindex e limite de páginas para verificar que o relatório acusa os problemas.

Verificações executadas:

| Verificação | Resultado |
|---|---:|
| Unitários | 143 aprovados |
| HTTP/contratos, incluindo 2 novos testes do rastreador | 62 aprovados |
| Descoberta PT10 | 11 aprovados |
| Dados estruturados SSR/navegador | 14 aprovados |
| Guias nacionais | 11 aprovados |
| Perfil e mobile | 9 aprovados |
| Governança editorial | 12 aprovados |
| Contrato SEO | 22 aprovados |
| Gate municipal | 17 aprovados |
| Proteção de prévia | 12 verificações HTTP e 5 testes de acesso aprovados |
| Build cliente/SSR, tipos, lint, ambiente e proteção dos rascunhos | Aprovados |

Não houve envio real de orçamento, cobrança, alteração SQL ou teste de produção. A revisão React verificou hooks incondicionais, chaves estáveis, links semânticos, consultas limitadas e reaproveitamento do cache hidratado.

## Dependências e limites de publicação

Dependências 07–09 preservadas: guias nacionais sem homologação continuam retidos; municípios dependem do gate; artigos dependem de aprovação/direitos válidos. Nenhum documento real foi aprovado automaticamente. A recomendação similar comprova compatibilidade de especialidade entre perfis públicos, não independência econômica entre empresas, qualidade técnica ou cobertura municipal.

O inventário editorial mantém o teto de 25 candidatas do PT09. A busca de relacionados inspeciona até 6 candidatos na primeira especialidade e entrega até 3; não é busca exaustiva do diretório. Antes de escalar, homologar paginação e custo das consultas com o backend real.

A pendência produtiva do PT09 permanece: o gate na aplicação não revoga acesso direto à Data API/RPC. Antes da abertura pública, aplicar proteção equivalente no backend ou restringir a exposição direta.

**Prévia online não atualizada:** o limite `CREDITS_USAGE_LIMIT_REACHED` do AppDeploy permanece sem resolução informada. O snapshot 1792711230117 é anterior aos PT05–10 e ao último ajuste do PT04. Não houve nova tentativa de deploy nem criação de outro aplicativo. O link de análise desta entrega é este relatório e o código atualizado no GitHub.

## Referências e próximo passo

Aplicado o manual AGENTE_MESTRE_MPI, seção 12, e a referência MPI v3, preservando o Quality Gate e a validação por lote. As práticas atuais de âncoras e paginação foram conferidas na documentação oficial:

- [Links rastreáveis e texto descritivo — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).
- [Paginação e carregamento incremental — Google Search Central](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading?hl=pt-BR).

Próxima etapa: **Prompt 11 — conversão e eventos sem depender de analytics**. Auditar os percursos de orçamento, cadastro/plano e newsletter, com confirmação real do backend, idempotência e consentimento independente. Esta entrega não inicia o PT11.
