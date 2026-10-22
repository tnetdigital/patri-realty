# Prompt 04 — elegibilidade e Quality Gate

Data: 22/10/2026, America/Sao_Paulo. Base: df23ec80a9c67780689878d3414e258b90753599. Prompt 03 aprovado pelo usuário. React, Vite e SSR próprio preservados.

## Resultado e escopo

Implementado um avaliador compartilhado e determinístico para páginas de segmento/município. A decisão participa da resposta SSR, metadata hidratada, sitemap e links locais do guia nacional. Ausência de evidência bloqueia a indexação. Nenhuma página real recebeu aprovação, pontuação fabricada ou liberação de produção.

Não houve tabela, migration, banco paralelo, gravação em Supabase ou mudança de permissões. A fonte das empresas continua sendo a projeção pública existente. O documento de revisão contém somente referências, comprovações, conteúdo local e aceite editorial; não substitui o cadastro de fornecedores.

## Arquivos e integração

- `src/seo/eligibility.ts`: schemas, rubrica, hash da versão revisada, contagem por identidade distinta, bloqueios e decisão com prazo de revalidação.
- `src/features/directory/api.ts`: consulta novamente os perfis públicos referenciados, calcula a decisão e filtra candidatos locais do sitemap. A contagem independe do total da busca e da página atual.
- `src/seo/policy.ts`: uma URL municipal sem decisão atual e elegível permanece noindex. A decisão de outra cidade não pode ser reaproveitada.
- `src/entry-server.tsx`: carrega a mesma decisão na hidratação e inclui somente conteúdo local aprovado para exposição. Hubs nacionais recebem apenas links locais revalidados.
- `src/pages/Directory.tsx`: mostra orientação útil e link ao guia nacional quando a seleção não estiver elegível; explicita que cobertura estadual declarada não confirma atendimento municipal. Revalida sem recarregar a página.
- `server.mjs`: endpoints GET `/api/local-eligibility` e `/api/local-guides`, ambos sem cache e com noindex; documento de revisão lido novamente por requisição. Desativa o cache de HTML municipal e, quando existe revisão configurada, o cache dos hubs relacionados.
- `scripts/review-local-document.mjs`: confere o documento e calcula os hashes, sem modificar o arquivo nem registrar aprovação.
- Testes unitários e matriz HTTP próprios, com execução adicionada ao CI após o build SSR.

## Contagem de fornecedores

Um fornecedor conta somente se:

1. O ambiente é live e a revisão não está marcada como fixture.
2. A consulta fresca à RPC existente de perfil público retorna a mesma identidade e slug, sem redirect. O contrato existente limita essa projeção a fornecedor publicado e responsável ativo; não foi alterado por este prompt.
3. Existe comprovação explícita de empresa real, identidade econômica estável e referência pública. Perfis/filiais do mesmo negócio contam uma vez; identificadores duplicados ou conflitantes não aumentam a contagem.
4. O segmento está na projeção atual do fornecedor.
5. A cobertura atual contém o ID municipal, slug da cidade e UF exatos. Cobertura com cidade_id nulo não é expandida automaticamente.
6. A prova municipal está vigente e sua versão corresponde ao atualizado_em atual do perfil. Alteração posterior exige revalidação.

O businessKey precisa ser definido pelo responsável a partir da identidade jurídica/econômica comprovada, não simplesmente copiado do ID de cada perfil. Não há CNPJ fabricado ou agrupamento jurídico inferido automaticamente. A chave é normalizada para impedir contagem extra por espaços ou caixa.

O total retornado é de identidades confirmadas no conjunto revisado, não uma estimativa de todas as empresas do município. Sem comprovação, confiança é desconhecida e a nota permanece nula quando não existe revisão; isso não significa que não existam fornecedores na região. O número total de resultados da busca não abre o gate.

## Rubrica interna versionada

Versão: `patri-local-2026-10-22.04`. Adaptação da seção 6 do pacote aprovado, não uma métrica oficial de buscadores.

| Critério | Máximo |
|---|---:|
| Utilidade e resolução da intenção | 20 |
| Diferenciação e evidências verificáveis | 20 |
| Exatidão de entidades, oferta e cobertura | 15 |
| Conteúdo e revisão editorial | 10 |
| HTTP, SSR, canonical e indexabilidade | 10 |
| Interlinking e descoberta | 10 |
| Conversão funcional e UX móvel | 10 |
| Mídia, acessibilidade e metadados sociais | 5 |
| Total | 100 |

Cada avaliação exige referência pública HTTPS e nota inteira dentro do limite. O código soma avaliações fornecidas por uma pessoa; não atribui notas a textos, não julga originalidade por número de palavras e não produz aceite editorial.

| Faixa | Tratamento |
|---|---|
| 0–59 | Conteúdo local não é publicado; seleção funcional pode continuar sem esse conteúdo e com noindex |
| 60–74 | Rascunho privado; exposição pública com noindex somente quando explicitamente aprovada e legítima |
| 75–89 | Elegível apenas se passar também todos os bloqueios |
| 90–100 | Candidata a âncora, sem garantia de ranking |

Bloqueios absolutos incluem demonstração/fixture, menos de três identidades confirmadas, cobertura incerta, dados não verdadeiros, falta de direitos, conteúdo sem utilidade única, falha técnica ou CTA essencial quebrado e ausência, revogação ou expiração do aceite da versão atual. Nota alta não compensa esses bloqueios.

Conflito documental registrado: o Mestre v5.1 usava portões eliminatórios, enquanto a metodologia MPI e o Prompt 04 solicitado exigem nota >=75 junto dos bloqueios. Foi implementada essa combinação, sem substituir o checklist de publicação nem o score de completude de perfil já existente. Os demais templates não recebem nota fictícia por esta entrega; o gate integrado aqui é municipal.

## Contrato de revisão e responsabilidade humana

Uma revisão pendente pode ter aprovador, datas e hash nulos: não é necessário inventar um aceite para preparar o documento. Esses campos precisam estar completos e atuais para aprovação efetiva.

O schema executável é `localReviewSchema` e o parser é `parseLocalReviews`. Por localidade, o documento exige versão da rubrica, origem real/fixture, segmento/UF/cidade/ID, revisão do conteúdo, título/descrição/introdução/contexto/checklist, avaliações com evidências, checks absolutos, provas dos fornecedores e aceite com responsável, datas e hash.

O hash SHA-256 vincula conteúdo, notas, checks, localidade, referências e provas à versão revisada. Qualquer mudança nesses campos invalida o aceite anterior. O hash não é assinatura digital e não autentica a identidade de quem editou o arquivo. A responsabilidade de aprovar conteúdo e metadata continua com Tércio; o agente não assinou em seu nome.

As referências precisam ser públicas, HTTPS e sem credenciais, query ou fragmento, evitando URLs assinadas no contrato. O documento deve conter apenas material autorizado para essa finalidade; conteúdo pendente não é entregue como conteúdo local. O runtime e a resposta hidratada não incluem o documento bruto de revisão ou chaves de identidade econômica. A decisão pública inclui motivos, nota, contagem, IDs públicos, referências autorizadas, versão e prazo.

## Configuração e operação

1. Manter `PATRI_LOCAL_REVIEW_FILE` vazio enquanto não houver evidências reais. Esse é o estado atual: páginas locais bloqueadas para indexação.
2. Preparar o JSON privado conforme o schema, fora do repositório, com origem e referências verdadeiras. Um array vazio é válido; revisões duplicadas ou malformadas falham fechadas. Máximo atual: 50 localidades e 50 provas por localidade, com consultas em lotes de cinco.
3. O responsável confere cada nota e bloqueio e revisa a versão. Depois do build SSR, `npm run review:local -- CAMINHO_ABSOLUTO` calcula o hash e confere o documento, sem aprovar ou gravar nada.
4. Somente após o aceite humano real, registrar status approved, responsável, datas e o hash aprovado. Configurar o caminho absoluto no servidor SSR autorizado. O servidor verifica que o destino real está fora do checkout, inclusive quando há link simbólico.
5. Homologar as respostas, sitemap, links e hidratação no host SSR de produção antes de liberar aquisição. A configuração não é uma variável VITE e não deve ser enviada ao frontend ou usada na prévia como aprovação produtiva.

Não foi criado um documento preenchido com aprovações reais. Fixtures em `tests/fixtures` são estritamente sintéticas e não entram nos builds. O cenário positivo de QA emula uma projeção live exclusivamente em loopback; não é uma declaração sobre empresas reais ou autorização de publicação.

## Perda de elegibilidade e caches

- SSR, endpoint e sitemap reconsultam perfis e documento a cada requisição pertinente; não conservam HTML municipal em cache. Respostas usam no-store.
- Suspensão/despublicação remove o perfil da projeção pública; mudança de segmento, cobertura ou atualizado_em invalida a comprovação.
- Prova ou aprovação vencida, revogada ou incompatível retira indexação, sitemap e links.
- A SPA revalida a cada 15 segundos e ao recuperar foco; cada decisão tem deadline de até 15 segundos ou a expiração mais próxima. Timers impedem conservar metadata indexável e links depois do deadline, inclusive durante falha de rede.
- Atualização de cache do buscador não é instantânea nem controlada por esta implementação. Nenhuma cidade fraca é redirecionada automaticamente para o hub, e robots.txt não bloqueia /guia para esconder o noindex.

## Validação executada

- 103 testes unitários aprovados, incluindo 36 novos casos do gate.
- 60 HTTP/regressões anteriores aprovados.
- 17 cenários HTTP integrados do gate, verificando SSR, endpoint, sitemap e links: 0/1/2/3; perda após liberação; cobertura estadual; segmento errado; perfil alterado; conteúdo alterado sem aceite; revisão ausente; score 74; prova vencida; aprovação vencida; parâmetros inválidos; rastreabilidade e documento malformado sem vazamento.
- 22 verificações do contrato HTTP/SSR do Prompt 03 e 12 de proteção da prévia aprovadas.
- Build cliente/SSR, tipagem frontend/Edge, lint, contrato de ambiente e guarda de rascunhos aprovados.
- Navegador real: metadata indexável no transporte sintético com três empresas; passou a noindex sem recarga ao reduzir para duas. Aviso e fallback ficaram visíveis. Link local desapareceu do hub e retornou somente após restabelecer o gate. Sem erros de console observados nessa amostra.
- Revisão protegida local abriu os 12 textos e encerrou corretamente, usando senha exclusivamente sintética. A senha real não foi acessada pelo agente.
- Busca nos arquivos do build: zero rascunhos no frontend público; zero marcadores da fixture de elegibilidade no build público ou no documento privado do portal.

Evidências reproduzíveis em `evidencias-prompt04/`; logs em output/prompt04-* no workspace. O número 999 usado pelo transporte sintético demonstra que total de busca não substitui contagem elegível.

## Publicação e análise

Prévia atualizada no mesmo app `patri-realty-previa-05je1j`, último snapshot publicado `1792711230117`. Senha, entrada pública e privacidade dos rascunhos preservadas.

https://patri-realty-previa-05je1j.v2.appdeploy.ai/

Use a senha existente e navegue pelo guia. A demonstração permanece noindex e não contém provas/aceites sintéticos de QA. Publicação pronta confirmada pelo provedor, sem erros de frontend/backend/rede. Verificação independente: antigo bundle de rascunhos, JSON e módulo privado retornam403; backend anônimo retorna401/no-store/noindex. A raiz mostra somente a tela de acesso e nenhum dos corpos públicos examinados contém título ou resposta dos rascunhos.

## Diferença entre código final e prévia

A última tentativa de sincronização foi recusada pelo AppDeploy com CREDITS_USAGE_LIMIT_REACHED, sem novo snapshot. Não houve nova cobrança ou tentativa de contornar o limite. A prévia preserva o snapshot 1792711230117, que já contém o gate municipal e a proteção de acesso.

O ajuste posterior, disponível no código final testado do GitHub, permite preparar revisão pending com aprovador, datas e hash nulos, sem fabricar aceite. Esse ajuste não foi sincronizado para a prévia devido ao limite do provedor. Os 103 testes descrevem o código final local; não se afirma equivalência integral entre esse código e o documento privado atualmente publicado.

Para sincronizar, liberar uso no AppDeploy, reler o snapshot corrente e publicar somente o artefato privado gerado atualizado no mesmo app, sem alterar senha ou visibilidade. Painel do provedor: https://dashboard.appdeploy.ai/credits-and-billing

## Limites e sequência

A integração produtiva com Supabase continua adiada. RPCs SQL, RLS e dados remotos não foram modificados nem homologados: o adaptador da aplicação filtra as projeções existentes antes de expor sitemap e links; não se afirma que a RPC SQL bruta foi reescrita. Nenhum teste de banco ou operação externa foi declarado nesta rodada.

O contrato do gate está implementado e demonstrado; a elegibilidade de páginas reais depende das evidências e do aceite humano faltantes. Nenhuma cidade foi liberada para produção. A prévia AppDeploy continua sendo demonstração estática protegida; ela não substitui homologação do SSR no domínio definitivo.

Próxima etapa prevista: Prompt 05, pesquisa/taxonomia/matriz, mediante autorização. Não gerar volume de páginas para preencher o mínimo, nem remover a proteção para tentar indexar a prévia.

## Referências

Manual AGENTE_MESTRE_MPI.md, relatório MPI v3 (gate >=75), pacote de prompts (seção 6 e Prompt 04), diagnóstico e decisões locais. Regras temporais verificadas em documentação oficial em 22/10/2026:

- Noindex precisa ser rastreável: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Sitemap deve representar URLs canônicas pretendidas para busca: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Contratos públicos: migrations do repositório, especialmente `20261030012603_public_directory.sql` e substituições posteriores; changelog Supabase consultado, sem mudança de plataforma nesta entrega.

## Reversão

Reverter o commit deste prompt, preservando os prompts 02 e 03 e a senha. Se houver revisão real configurada, esvaziar a configuração retira a liberação local antes de qualquer reversão. Não restaurar rascunhos públicos ou snapshots anteriores à proteção. Não reescrever histórico ou enviar branches/tags antigas.
