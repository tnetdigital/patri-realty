# PT15 — Piloto e portão de publicação

Preparado em 23/10/2026. **Seis candidatas revisáveis: três guias nacionais bloqueados e três rascunhos editoriais privados. Nenhuma URL pronta para lançamento.** Não foram preenchidas as faixas de perfis e municípios com exemplos ou URLs inventadas.

## Objetivo, escopo e resultado

Dependências: PT02–14 aprovados. Objetivo: selecionar um primeiro lote útil e sustentável, com evidências, QA e decisão individual, antes de escalar. Escopo executado: inventário candidato, manifesto por caminho, verificação prévia, comparação entre irmãs, QA técnico de exclusão e plano de liberação/reversão. React/Vite/TypeScript/SSR Node, contratos de dados, conteúdo servido e proteções existentes foram preservados.

O critério de preparação foi atendido com um lote revisável e seus bloqueios explícitos. O portão de publicação continua fechado por falta de oferta, aprovação e homologação reais. Preparação concluída não equivale a lote publicável, publicação ou indexação.

## Manifesto e anexos

- [Manifesto legível para análise](manifesto-piloto-pt15.md): composição, decisões, campos e critérios.
- [Manifesto público sanitizado em JSON](manifesto-piloto-pt15.json): seis candidatas, sem identidades/caminhos dos rascunhos privados.
- Anexo local completo: `output/patri-realty-private/prompt15/manifesto-piloto.json` e `manifesto-piloto.md`, fora do checkout público. Contêm os seis caminhos, intenções e evidências por versão. Não são enviados ao GitHub.
- Auditoria privada de versões: `output/patri-realty-private/prompt15/auditoria-versoes.json`. Fontes e arquivos originais do PT09 não foram alterados.
- [QA com anexo](evidencias-prompt15/qa.json), [execução sem anexo](evidencias-prompt15/qa-sem-anexo.json), [proveniência e hashes do teste](evidencias-prompt15/proveniencia-qa.json) e [triagem editorial sem textos](evidencias-prompt15/similaridade-editorial-resumo.json).
- [Plano de homologação, observabilidade e reversão](plano-liberacao-piloto-pt15.md), incluindo suspensão de fornecedor, alteração de matéria e verificação após eventual publicação autorizada.

O anexo é necessário para análise editorial completa. O JSON público tem `redacted: true` e é recusado como entrada autoritativa de reavaliação; um documento público não deve reconstruir ou distribuir os rascunhos retirados no PT02/PT09.

## Seleção e redução do lote

| Família | Seleção desta preparação | Decisão |
|---|---|---|
| Guias nacionais | Administração condominial, portaria remota e elevadores — MPI-001/003/005 | Três bloqueados, sem oferta/briefing e aprovação homologados; retenção do PT07 mantida |
| Perfis | Nenhuma identidade real comprovada para integrar o lote | Zero selecionados; quantidade real disponível é desconhecida, não zero |
| Editorial | Três candidatas privadas existentes no PT09, sem geração de novos textos | Três rascunhos privados, aprovações pendentes e verificações materiais incompletas |
| Local | Nenhum conjunto municipal com oferta e prova homologadas identificado | Zero selecionados; não criar cidades ou contar cobertura estadual como prova municipal |

As três propostas novas MPI-002/004/006 continuam no backlog. As candidatas antigas não foram declaradas equivalentes a essas pautas; antes de produzir, comparar intenção e conteúdo para decidir entre atualização, consolidação ou pauta nova. A preparação não aprova uma expansão editorial paralela.

A conexão Supabase disponível foi consultada apenas para descoberta de projetos. Não foi identificado um projeto mapeado à Patri Realty; nenhum banco dos demais projetos foi consultado, ativado ou alterado. Não foi comprovado inventário produtivo de perfis, cobertura, conteúdo aprovado ou destino canônico. Supabase e serviços produtivos continuam adiados conforme decisões anteriores.

## O que foi implementado

1. **Manifesto por caminho.** Intenção, evidências, contagem elegível, Quality Score/rubrica, aprovação por versão, canonical/robots/schema, links, CTA, mídia, QA, bloqueios e decisão. Campos desconhecidos permanecem `null` ou pendentes.
2. **Verificação prévia offline** em `server/pilot.mjs`. Valida formato, identidade, família de rota, canonical, pesos máximos, evidências referenciadas, validade de aprovação/destino e portões. Reutiliza pesos do PT04 e a função de retenção nacional vigente. Um label editado não substitui reavaliação. Este contrato rejeita autorização externa e não modifica SSR, CMS ou hospedagem.
3. **Preparação de anexos** por `npm run prepare:pilot`. Lê candidatas já listadas, confere projeção/hash e observa o estado de revisão, sem promover aprovações. Grava anexo novo fora do checkout, sem sobrescrever anexos existentes, e uma projeção pública sanitizada. Não lê arquivos de segredo, não consulta banco e não faz deploy.
4. **Integridade e privacidade.** Hashes das três projeções editoriais coincidem com o PT09; originais permanecem em rascunho, com autoria/fatos/direitos/utilidade ainda não confirmados. A origem `real` descreve o arquivo existente, não certifica as afirmações. `checkedAt` no índice de arquivos registra leitura/integridade, não checagem factual. Os contratos dessas candidatas ainda não têm as fontes revalidadas vinculadas; referências de pesquisa anteriores não viram aprovação automaticamente.
5. **QA de todos os caminhos selecionados** em `scripts/test-pilot.mjs`, com as três URLs privadas obtidas do anexo, sem registrá-las no artefato público. O comando padrão também funciona em clone sem anexo, com caminhos editoriais sintéticos anônimos, claramente sem essa cobertura real de caminhos.
6. **Plano operacional** para os portões pendentes, responsáveis funcionais, observação, retirada, reversão e acompanhamento. Nenhum serviço ou monitor foi criado.

Não houve alteração do frontend, templates visuais, banco, permissões, RPCs, configuração remota, aprovação externa ou middleware de publicação. Foram acrescentadas ferramentas de preparação/teste e documentação; nenhuma dependência foi instalada.

## Quality Score e similaridade

Quality Score das seis candidatas: **não avaliado (`null`)**. O template de rubrica usa pesos de utilidade, diferenciação, precisão, editorial, técnica, links, conversão e mídia, somando 100 possíveis pontos. Essa referência interna não é nota do Google. Nenhum ponto foi atribuído a partir de testes de template; baseline ≥75 continua combinado com portões eliminatórios. A avaliação real por família/URL e a aprovação cabem aos responsáveis já definidos, com Tércio como aprovador editorial.

A comparação editorial usa somente o `corpo` dos arquivos: exclui campos SEO, cabeçalho, navegação e rodapé do site porque não fazem parte desse campo. Mantém os parágrafos e tabelas substantivos, inclusive coincidências, sem apagar conteúdo repetido para melhorar o resultado. Normalização Unicode e shingles lexicais de cinco palavras com Jaccard; alerta interno a partir de 0,65 ou conteúdo insuficiente. O limiar é triagem, não prova de originalidade ou requisito do Google.

Nos três pares editoriais, Jaccard ficou entre **0,0026 e 0,0027**; nenhum alerta lexical nesse recorte. Isso não confirma fatos, utilidade, direitos ou adequação comercial. A revisão humana continua pendente, como todos os demais portões editoriais.

Nos três pares de guias, o texto principal no laboratório, com navegação e controles removidos, foi idêntico (**1,0**). O parecer técnico da triagem confirmou o bloco comum “Guia em preparação”, coerente com a ausência de briefing homologado. Os guias foram mantidos bloqueados. Não se usou o teste para alegar que simples troca de segmento geraria conteúdo único ou para liberar páginas com boilerplate.

## QA e testes

| Verificação | Resultado |
|---|---|
| Unitários existentes | 191 aprovados |
| Portão do piloto — Node | 19 aprovados |
| PT15 com anexo: integridade, APIs, HTTP, navegação, hidratação, metadata, sitemap e exclusão | 26 verificações aprovadas nos seis destinos |
| Comando padrão sem anexo privado | 25 verificações de laboratório + os 19 testes de portão, sem depender dos originais |
| HTTP/regressões existentes | 65 aprovados |
| Proteção da prévia | 5 testes de acesso + 15 cenários HTTP aprovados |
| Descoberta/sitemap | 23 verificações aprovadas |
| Elegibilidade municipal | 17 cenários aprovados |
| Dados estruturados | 14 verificações aprovadas |
| Conversão controlada | 8 cenários aprovados |
| Experiência pública | 24 cenários aprovados |
| Contrato SEO/SSR | 22 verificações aprovadas |
| Perfis e editorial | 9 + 12 cenários aprovados |
| Build cliente/SSR, tipos, lint, ambiente e isolamento de rascunhos | Aprovados |

O QA específico percorreu os três guias e os três caminhos privados em **320/375/390/768 pixels CSS**, totalizando 24 navegações com conferência de hidratação. Guias: 200/noindex, sem grafo e ausentes do sitemap. Artigos sem aprovação: 404/noindex, projeção editorial pública sem item e sem Article. Canonical de erro ausente; canonical dos guias restrito ao loopback do teste. H1, title e description presentes; conteúdo/metadata preservados após hidratação; sem overflow ou erro JavaScript observado. Links públicos inspecionados responderam 200, sem redirects. Hashes privados conferidos sem modificar os arquivos originais.

Esses resultados comprovam o comportamento de exclusão **com transporte sintético local**, incluindo caminhos de candidatas reais do anexo. Não comprovam que esses conteúdos estejam publicados, sejam originais/verdadeiros, possuam mídia licenciada ou convertam no backend produtivo. Os testes de perfis/mídia/formulários complementam a verificação dos templates com fixtures isoladas; não acrescentam empresas, aprovações ou conteúdo ao lote real.

Os campos de QA de **liberação produtiva** permanecem pendentes no manifesto. Mídia real, entidades/fatos, interlinking editorial útil e conversão real precisam de avaliação por URL no ambiente homologado. Não houve prova de persistência remota, entrega de e-mail, cobrança, acesso legítimo de crawler, indexação ou citação de IA. Backend/RPC/Data API precisam aplicar política equivalente antes de expor conteúdo editorial; o proxy SSR sozinho não resolve essa dependência.

## Critérios e próxima liberação

Para uma candidata avançar, comprovar valor individual, oferta quando necessária, direitos e evidências, pontuação, aprovação da versão, runtime, exposição do backend, destino, QA operacional, observabilidade e reversão. Quando faltarem dados, reduzir o lote; não remover barreiras para preencher a faixa sugerida. Uma página em noindex público exige utilidade e justificativa reais; falta de conteúdo não basta.

Na eventual suspensão de fornecedor, retirar projeção/listas/grafo/sitemap e recalcular o gate municipal. Em alteração de matéria ou suas evidências, revalidar aprovação/hash, listas, API, Markdown e descoberta. O plano de reversão preserva a proteção da prévia e evita restaurar conteúdo ou permissões antigas. As operações reais não foram executadas.

Próxima etapa: **PT16 — homologação do destino e lançamento**, após autorização, condicionada à identificação do projeto/domínio e às dependências acima. Se os serviços produtivos continuarem adiados, concluir preparação e registrar pendências, sem criar infraestrutura ou publicar conteúdo para contorná-las.

## Publicação desta entrega

Relatório, manifesto público sanitizado, ferramentas e evidências no GitHub. Anexos e textos continuam locais e privados. Não houve publicação externa do lote nem alteração da visibilidade/histórico do repositório.

A prévia AppDeploy permanece no snapshot anterior: o limite de créditos já informado não teve resolução comunicada. Não houve nova tentativa de deploy, remoção de senha ou criação de outro app. O link de análise desta etapa é o relatório/manifesto no GitHub, e não uma prévia atualizada.

## Referências

Aplicados AGENTE_MESTRE_MPI, relatório MPI v3 (qualidade, diferenciação e piloto antes de escala), matriz PT05 e decisões PT02–14. Informações históricas de volume, indexação ou metas não foram tratadas como garantias.

Consultas oficiais em 23/10/2026: [conteúdo útil e confiável](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) orienta a avaliação de valor e evidência; [políticas de spam](https://developers.google.com/search/docs/essentials/spam-policies) sustentam a retenção de páginas sem valor criadas apenas para consultas semelhantes; [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing) é controle de indexação, sem substituir autenticação para conteúdo privado. O changelog Supabase foi consultado; SDK e contratos de banco não foram alterados.
