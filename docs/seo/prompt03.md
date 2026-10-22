# Prompt 03 — SSR, HTTP, canonical e parâmetros

Data: 22/10/2026 (America/Sao_Paulo). Base: commit 0e37cd6a7777a78caff527872df85401b1ab4844. Prompt 02 aprovado. Stack React + Vite + SSR próprio preservada.

## Resultado

Implementada uma política versionada compartilhada entre servidor e navegador para reconhecimento completo da rota, normalização de URL, status, canonical, robots, título e descrição. Sem migração de framework, tabela, alteração de dados ou publicação de conteúdo editorial. A demonstração foi atualizada no mesmo AppDeploy, com a proteção anterior preservada.

## Alterações

- `src/seo/policy.ts`: fonte comum das decisões, normalização NFC e rejeição de separadores codificados, parâmetros de campanha, filtros, paginação, rotas privadas e redirects internos seguros.
- `src/seo/metadata.tsx`: atualização dos metadados do navegador; remove duplicatas e canonical anterior ao entrar em rota sem canonical. Open Graph de título, descrição e URL acompanha a decisão.
- `src/entry-server.tsx`: aplica a política antes de consultar rotas inválidas e ao produzir a resposta; reconhece rotas completas; títulos e descrições de guia/editorial usam os mesmos builders do cliente. Mantém os contratos de API existentes.
- `server.mjs`: canonical validado, Host verificado por allowlist, origem da requisição nunca refletida em metadata; canonical não inclui parâmetros de campanha; 301 entrega Location seguro; erro temporário entrega 503/no-store/noindex e Retry-After. Falha do destino de anúncio não é convertida em 404.
- Componentes de guia, perfil, editorial, institucional e aplicação usam a política comum. Paginação editorial passou de botões dependentes de JavaScript para links HTML reais.
- `src/main.tsx`: converte links públicos legados com hash no cliente. O adaptador da prévia mantém HashRouter e desativa essa conversão dentro da revisão protegida.
- Ambiente público SSR é serializado junto da hidratação: somente origem, modo e a configuração pública/anon já usada pela aplicação. Nenhuma senha ou chave privilegiada é serializada.
- Novos testes de política e HTTP/SSR. CI executa `npm run test:seo` depois do build SSR. O teste arquitetural anterior de relatórios agora consulta a política compartilhada.

## Tabela de decisão

| Classe | HTTP no SSR | Canonical | Robots e observações |
|---|---:|---|---|
| URL pública existente | 200 | Próprio, origem configurada | index,follow somente no modo público e sem outros bloqueios; não certifica qualidade |
| UTM, gclid, fbclid, msclkid e atribuição listada na política | 200 | Mesmo canonical limpo | Não ativa noindex apenas pela atribuição; query permanece disponível para mensuração |
| Busca, múltiplas especialidades, UF/filtro e ordenação não padrão | 200 | URL normalizada da própria seleção | noindex,follow; não declara equivalência ao hub nacional |
| Parâmetro desconhecido | Conforme recurso | Preservado no canonical próprio, quando cabível | noindex conservador, sem presumir equivalência |
| Página 1 explícita | 200 | Remove pagina=1 | Mesmo conjunto da página inicial |
| Página 2+ com resultados reais | 200 | Próprio, preservando pagina=N | Título inclui página; links anteriores/próximos descobríveis |
| Página 2+ sem resultados | 404 | Omitido | noindex,nofollow |
| Paginação inválida ou escape malformado | 400 | Omitido | noindex,nofollow; não vira silenciosamente página 1 indexável |
| URL inexistente ou com trechos extras | 404 | Omitido | noindex,nofollow |
| Slug movido com mapeamento existente | 301 | Destino interno equivalente informado pela projeção | Sem mapa fictício ou redirecionamento massivo ao hub |
| Barra final redundante | 301 | Versão sem barra final | Query de atribuição preservada no Location |
| Backend indisponível | 503 | Omitido | no-store, noindex,nofollow, Retry-After: 60 |
| Painéis, tokens, confirmação, relatórios e demonstrações | Tratamento da funcionalidade; 200 não significa público/indexável | Omitido | noindex,nofollow; acesso segue controles existentes |
| Host fora da allowlist | 421 | Omitido | Rejeita a requisição sem refletir o host |
| Prévia autenticada | Acesso anterior preservado | Omitido | Nunca se torna canonical de produção |

## Origem canônica e hospedagem

No modo live, `VITE_SITE_URL` precisa estar explicitamente configurada como origem, sem credenciais, caminho, query ou fragmento. HTTPS é exigido, exceto loopback explicitamente configurado para testes. Hosts AppDeploy/Vercel de demonstração não são origens canônicas de produção. Nenhum domínio real foi inventado ou configurado nesta entrega.

O host de VITE_SITE_URL é permitido; aliases de proxy/homologação exigem `PATRI_ALLOWED_HOSTS`, separado por vírgulas, com host e porta quando aplicável. X-Forwarded-Host não é usado para gerar links. O proxy de produção ainda precisa ser homologado com a configuração real.

Fragmentos não chegam ao servidor: `/#/guia?utm_source=legado` é convertido pelo cliente em `/guia?utm_source=legado`, que então recebe SSR normal. Só rotas públicas reconhecidas são convertidas; tokens e painéis não são promovidos. HashRouter continua deliberadamente ativo dentro da prévia protegida.

## Testes e evidências

- 67 testes unitários aprovados, incluindo 32 casos novos da política.
- 60 testes HTTP/regressões aprovados.
- 22 verificações HTTP em servidor SSR real com backend sintético: HTML inicial, UTM, filtros, busca com escapes, paginação, rota com excesso de segmentos, conteúdo ausente, redirects, token, Host inválido e indisponibilidade do backend/editorial e destino de anúncio.
- 12 verificações do servidor de prévia preservadas: bloqueio anônimo, acesso autorizado e cabeçalhos privados.
- Builds cliente/SSR, tipagem frontend/Edge, lint, contrato de ambiente, guarda de rascunhos e scanner de segredos aprovados.
- Navegador real: cinco amostras comparadas antes/depois da hidratação (guia com UTM, matéria paginada, rota inválida, perfil ausente e confirmação). Título, descrição, robots e canonical concordaram; nenhum erro de console observado nessas amostras.
- Link legado com hash converteu para a URL pública sem fragmento, preservando UTM.
- Revisão protegida local, com senha exclusivamente sintética: abriu o portal, exibiu os 12 rascunhos e encerrou sem manter o documento. Sem uso da senha real pelo agente.
- Online: raiz entrega apenas acesso; bundle antigo de rascunhos, JSON e módulo privado retornam 403; backend anônimo retorna 401 com no-store e noindex. Nenhum título/resposta dos rascunhos nos corpos públicos examinados.

Evidências HTTP reproduzíveis em `evidencias-prompt03/`. Logs completos permanecem em output/prompt03-* no workspace. Os dados e nomes da matriz local são sintéticos, não fornecedores ou publicações reais.

## Publicação e link de análise

App `patri-realty-previa-05je1j`, snapshot `1792709705332`, estado pronto, sem erros frontend/backend/rede na publicação. Atualizado somente o documento privado gerado do backend; tela de acesso, segredo e testes de proteção existentes preservados.

https://patri-realty-previa-05je1j.v2.appdeploy.ai/

Use a senha cadastrada no Prompt 02. Após acessar, navegue pelo portal, guia e matérias; Revisar textos mantém a curadoria privada.

## Limites e próximos passos

O contrato HTTP/SSR foi implementado e validado localmente; o AppDeploy continua sendo uma prévia estática protegida que entrega o portal autenticado. Não se afirma que 404/301 do SSR foram homologados em domínio público de produção, nem que páginas foram indexadas. Domínio, infraestrutura e dados produtivos continuam pendentes.

Este prompt não implementa o Quality Gate do Prompt 04, a prova de cobertura municipal ou a regra dos três fornecedores. Não considerar uma resposta 200/index tecnicamente elegível como aprovação editorial/comercial ou permissão para lançar páginas locais. A demonstração permanece noindex e protegida. O sitemap produtivo e as suas regras de elegibilidade precisam da próxima etapa; não foi expandido nesta entrega.

Não houve teste SQL, Auth real, cobrança, e-mail ou persistência em Supabase: esses contratos não foram alterados e a integração produtiva permanece adiada. O repositório continua público e seu histórico não foi reescrito, conforme decisão explícita do usuário.

## Referências consultadas

Manual AGENTE_MESTRE_MPI.md, relatório MPI v3 (leitura dos trechos técnicos), pacote de prompts e diagnóstico aprovado. Em temas temporais, prevaleceu a documentação oficial consultada em 22/10/2026:

- Canonical: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls — sinal consistente, sem fragmentos e sem usar noindex como substituto para canonical de duplicatas.
- Paginação: https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading — links rastreáveis e canonical próprio para conjuntos distintos.
- HTTP: https://developers.google.com/crawling/docs/troubleshooting/http-status-codes — distinção entre recurso ausente e falha temporária.

## Reversão

Reverter somente o commit deste prompt na main e reconstruir o documento protegido. Preservar integralmente o Prompt 02 e a senha existente. Não restaurar o pacote editorial público nem publicar snapshots anteriores à proteção. Não usar força, outras branches ou tags para enviar histórico antigo.
