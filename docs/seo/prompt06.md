# Prompt 06 — entidades e dados estruturados

Data: 22/10/2026. Prompt 05 aprovado. Implementação para análise, mantendo React/Vite, SSR e contratos públicos existentes. Sem migration ou gravação no banco, criação de fornecedor, matéria ou aprovação real.

## Alterações

- `src/seo/structured.ts`: builder compartilhado de grafo e serialização segura. IDs absolutos para plataforma, site, página, empresa, serviço, matéria, autor e breadcrumb. Apenas campos públicos explicitamente selecionados; não serializa o objeto completo.
- `src/seo/structured-cache.ts`: adapta o mesmo cache público já usado pela interface; não busca nova base nem duplica requisições. Liga `WebPage`/`CollectionPage` ao `WebSite`, e este ao publisher da plataforma.
- `src/entry-server.tsx` e `server.mjs`: substituem schemas isolados pelo grafo e serializador comuns; política final de SEO governa também a emissão do JSON-LD.
- `src/seo/metadata.tsx` e `src/pages/App.tsx`: atualizam o grafo na navegação e removem dados anteriores em páginas privadas, falhas e estados não indexáveis. Um único script por página.
- `src/pages/ContentPublic.tsx`: garante identificação visível de Conteúdo de marca mesmo se o DTO comercial não trouxer o selo textual.

## Regras por família

| Família | Representação e limites |
|---|---|
| Home e páginas públicas | Organization Patri Realty, WebSite e WebPage, sem atribuir serviços terceirizados à plataforma |
| Guias | CollectionPage, BreadcrumbList e ItemList com a seleção exibida e sua ordem; contagem da página, não o total geral da busca |
| Perfil | Organization da empresa; Service apenas para serviços públicos informados, com provider apontando à empresa correspondente |
| Matéria | Article somente com status publicada e data válida, passada; autor público Person ou redação Organization; publisher separado |
| Privadas, demonstração, prévia, erro e noindex | Sem grafo nesta implementação; bloqueios de indexação e autenticação preservados |

Empresas usam Organization como classificação conservadora. O DTO atual não prova natureza de estabelecimento local/subtipo; endereço ou cobertura declarados não bastam para promover a LocalBusiness. Nenhum endereço, coordenada, preço, disponibilidade, unidade ou certificação é inferido. Serviços não são criados a partir do nome de categoria.

Autor pessoal usa o nome público de autoria do contrato editorial existente. O ID de autor é estável no contexto da matéria, evitando unir homônimos ou expor o ID privado da conta. Uma futura entidade global de autor exige identidade editorial pública verificada. A redação exibida como fallback é Organization, sem jornalista inventado. `dateModified` foi omitido: o timestamp de atualização pode refletir moderação e não revisão editorial visível. Não se inventa data de revisão ou publicação.

Conteúdo comercial mantém tipo Article e genre Conteúdo de marca, com aviso visível; não é classificado como opinião independente. Não se infere patrocinador só porque um fornecedor aparece associado à matéria.

## Avaliações: mudança deliberada

Notas e avaliações continuam visíveis e seguem a moderação existente. O antigo AggregateRating foi retirado do JSON-LD nesta etapa: o DTO agregado informa nota/quantidade, mas não comprova sozinho origem direta de todas as avaliações, ausência de incentivos não divulgados e todos os critérios atuais do recurso. Não foram importadas notas externas. A restauração do markup exige evidências suficientes e classificação empresarial compatível; não basta marcar `source=live`.

O teste histórico `test-growth-ssr.mjs` foi ajustado à política conservadora: nota pública pode aparecer sem AggregateRating. Esse teste com banco/Docker não foi executado nesta rodada; os testes novos usam transporte sintético isolado. Sem alegar nova homologação produtiva de avaliações.

## Segurança e consistência

Serialização escapa `<`, `>`, `&`, U+2028 e U+2029 preservando os valores após JSON.parse, incluindo tentativa de fechamento de script. Origem passa pela política de canonical confiável. Sem credenciais, dados de conta, documentos privados ou atributos arbitrários do DTO no grafo. IDs e relações Service.provider, publisher, author e mainEntityOfPage são explícitos.

O conteúdo dos exemplos é sintético e identificado como tal; existe apenas no transporte de QA e nos arquivos de evidência. O exemplo municipal elegível usa fixture isolada do gate anterior, sem liberar município real. A queda de três para dois fornecedores retira o grafo municipal.

## Verificação

Resultados desta execução:

- 121 testes unitários aprovados, incluindo 18 novos casos de estrutura, dados ausentes, publicação, autoria, serviços e serialização.
- 60 testes HTTP/regressões aprovados.
- 14 cenários específicos HTTP/navegador aprovados: famílias, seleção visível, identificação comercial, bloqueios, igualdade SSR/hidratação em três famílias e navegação sem Article residual.
- 22 verificações do contrato SEO e 17 cenários do gate municipal aprovados.
- 12 verificações de proteção da prévia aprovadas, além dos cinco testes unitários HTTP de acesso executados pelo mesmo comando.
- Builds cliente/SSR, typecheck frontend/Edge, lint, contrato de ambiente e scanner de rascunhos aprovados.

Evidências: [cenários executados](evidencias-prompt06/qa.json) e [exemplos por família](evidencias-prompt06/exemplos-sinteticos.json). O script reproduzível é `npm run test:structured`, após `npm run build:ssr`, com Chrome instalado. Sem testes SQL ou gravações reais.

## Validade, elegibilidade e exibição

Tipos e propriedades consultados na documentação vigente em 22/10/2026: [Service](https://schema.org/Service), [CollectionPage](https://schema.org/CollectionPage), [ItemList](https://schema.org/ItemList), [Article](https://schema.org/Article), [author](https://schema.org/author) e [sponsor](https://schema.org/sponsor). Uso de tipos existentes e JSON bem formado foi verificado localmente; não se declara certificação por validador externo.

Elegibilidade Google é uma camada adicional: [orientações de avaliações](https://developers.google.com/search/docs/appearance/structured-data/review-snippet) e [empresa local](https://developers.google.com/search/docs/appearance/structured-data/local-business). Mesmo uma página válida/elegível não tem exibição garantida. Não houve submissão ao Rich Results Test, inspeção GSC nem comprovação de resultado em busca. Não foi adicionado FAQPage, HowTo ou speakable; o [registro oficial](https://developers.google.com/search/updates) confirma a retirada do recurso de FAQ. FAQ visível continua preservado.

## Link para análise e publicação

Código, relatório e exemplos disponibilizados no GitHub público, sem reescrever histórico. O link de análise desta entrega é o relatório versionado e seus exemplos.

A prévia AppDeploy permanece na versão anterior: o limite `CREDITS_USAGE_LIMIT_REACHED` registrado no Prompt 04 continua pendente. Nenhum novo deploy foi tentado, nenhuma proteção removida ou app alternativo criado. Portanto, não usar a prévia anterior como prova online do Prompt 06. Produção e validação externa continuam pendentes. Prompt 07 não iniciado.
