# Manifesto do piloto — PT15

Preparado em 23/10/2026. Versão `patri-pilot-15.1`. **Seis candidatas; zero URLs prontas para lançamento.** O lote foi reduzido às evidências disponíveis. Nenhuma URL foi publicada, aprovada para indexação ou enviada a buscadores.

O [JSON público](manifesto-piloto-pt15.json) permite revisar critérios e bloqueios. Ele é explicitamente uma projeção com dados privados ocultos, **não um manifesto executável de publicação**. O manifesto completo por caminho está no anexo local `output/patri-realty-private/prompt15/manifesto-piloto.json`, fora do Git público. Rascunhos, nomes, caminhos editoriais e hashes privados continuam nesse anexo, conforme PT09. A pasta privada também contém a auditoria de versões e a comparação editorial, sem alterar originais.

## Composição e decisão

| ID | Caminho ou referência | Família e intenção | Decisão | Falta para avançar |
|---|---|---|---|---|
| NACIONAL-01 | `/guia/administracao-condominial` — MPI-001 | Selecionar administradoras comparando escopos e evidências | Bloqueada | Oferta real, conteúdo útil próprio, avaliação, aprovação e homologação do destino; retenção PT07 vigente |
| NACIONAL-02 | `/guia/portaria-remota` — MPI-003 | Comparar contingências e responsabilidades antes de selecionar empresas | Bloqueada | Mesmas dependências; sem promessas comerciais ou cobertura inventadas |
| NACIONAL-03 | `/guia/elevadores` — MPI-005 | Comparar manutenção, inclusões e exclusões antes de selecionar empresas | Bloqueada | Mesmas dependências; não preencher com empresas sintéticas |
| EDITORIAL-01 | Caminho restrito no anexo PT15 | Retomar candidata real do arquivo privado PT09 | Rascunho privado | Fontes materiais vinculadas ao contrato, autoria, direitos, utilidade e aprovação por versão |
| EDITORIAL-02 | Caminho restrito no anexo PT15 | Retomar candidata real do arquivo privado PT09 | Rascunho privado | Mesmas dependências |
| EDITORIAL-03 | Caminho restrito no anexo PT15 | Retomar candidata real do arquivo privado PT09 | Rascunho privado | Mesmas dependências |

As três candidatas editoriais já existiam: não foram criadas para completar o lote. Não equivalem automaticamente às pautas propostas MPI-002/004/006. Essas três propostas continuam no backlog, condicionadas à comparação de intenção com o acervo privado antes de encomendar textos. Nenhum texto novo foi gerado ou republicado.

| Família | Teto inicial do PT15 | Selecionadas para preparação | Prontas |
|---|---|---|---|
| Guias nacionais | 3–5 | 3 bloqueadas | 0 |
| Perfis reais | 5–10 | 0; inventário real não comprovado | 0 |
| Matérias | 3–5 aprovadas | 3 candidatas privadas, nenhuma aprovada | 0 |
| Guias locais | 0–3 elegíveis | 0; provas municipais não comprovadas | 0 |

“Zero selecionadas/prontas” é uma decisão deste lote, não uma contagem do mercado ou do banco produtivo. `supplierCount` e `localityCount` permanecem `null` por falta de verificação. Não foram criadas URLs de fornecedor ou município com placeholders. Não há página classificada como “noindex pública justificada”: os guias continuam bloqueados; uma mensagem de preparação não comprova utilidade comercial suficiente para essa classificação.

## Campos e estado de cada candidata

O anexo completo e sua projeção possuem ID, família, intenção, referência MPI, caminho, evidências, total elegível, Quality Score/rubrica, aprovação por versão, canonical esperado, robots, schema, links, CTA, mídia, bloqueios e decisão. Para rascunhos privados, somente o anexo conserva os campos restritos.

- **Origem/canonical:** domínio produtivo não homologado; origem e canonical absoluto são `null`. O caminho esperado está registrado. Canonicals loopback nos testes não se tornam canonicals reais.
- **Total elegível:** desconhecido, `null`, onde a oferta importa. Não se confunde com contagem de fixtures ou cartões do laboratório.
- **Quality Score:** `null` em todas as seis candidatas. A rubrica de preparação reaproveita pesos do PT04: utilidade 20, diferenciação 20, precisão 15, editorial 10, técnica 10, links 10, conversão 10 e mídia 5. A referência é interna, não uma nota do Google, nem uma avaliação automática de artigos e perfis. Pontos exigem análise e evidência por critério; o QA técnico não preenche pontos. Baseline de indexação: 75, mais portões eliminatórios. Sua aplicação às famílias do piloto ainda precisa da avaliação humana real.
- **Aprovação:** pendente, sem revisor/data/hash de aprovação fabricados. Tércio permanece o responsável definido no projeto. Os hashes das três projeções editoriais conferem com o PT09, o que prova consistência de versão, não veracidade, direitos ou aceite humano. As fontes validadas ainda não estão vinculadas aos contratos dessas candidatas; isso não significa ausência de referências nos arquivos de pesquisa anteriores.
- **Robots/HTTP:** guias nacionais continuam retidos por `nationalPilotBlocked`, em noindex e fora do sitemap. Resposta produtiva depende de catálogo/backend ainda não homologados. Artigos privados devem permanecer sem conteúdo público e sem Article; no laboratório, seus caminhos retornam 404/noindex. A prévia deve exigir autenticação antes de qualquer conteúdo.
- **Schema:** não emitir grafo nessas candidatas enquanto inelegíveis. Expectativas futuras de CollectionPage/ItemList e Article são condicionais à elegibilidade e ao conteúdo real. Sem notas, preços, endereços, cobertura, datas ou entidades inventadas.
- **Links:** `/guia` é um destino estrutural previsto; nenhum perfil ou município foi inventado como alvo. Metas de links aprovados permanecem vazias até existir oferta. Links de layout testados não comprovam interlinking editorial relevante.
- **CTA:** guias deverão permitir seleção de empresas reais; perfis futuros, orçamento; matérias, objetivo editorial/newsletter conforme adequação. Os CTAs concretos e suas integrações continuam não homologados para o lote real.
- **Mídia:** uma mídia referenciada em cada candidata editorial, com direitos ainda pendentes. Nenhum arquivo foi inserido no site. Hash, crédito ou URL de imagem não substituem licença/uso autorizado.
- **QA de liberação:** conteúdo, fatos, entidades, direitos, HTTP, hidratação, metadata, sitemap, links, mobile, mídia, conversão, elegibilidade em runtime, exposição do backend, observabilidade e rollback possuem estado/evidência separados. Permanecem `not-run` para homologação produtiva; não foram convertidos em “passed” por testes sintéticos.

## Ferramentas e reavaliação

`server/pilot.mjs` é uma verificação prévia offline. Reutiliza os pesos municipais e a retenção nacional do código existente. Recalcula decisões, rejeita referências não resolvidas, conflitos de identidade/canonical/família, excesso de pontos e tentativa de autorizar publicação por este contrato. Material sintético não se torna aprovação real. “Pronta”, se futuramente aplicável, será um resultado de conferência de dados/evidências declarados, não identidade digital do aprovador ou autorização de deploy. O gate editorial/municipal e a homologação do PT16 continuam obrigatórios.

```text
npm run prepare:pilot -- CAMINHO_PRIVADO/prompt09 CAMINHO_PRIVADO/NOVA_REVISAO_PT15
npm run test:pilot
node scripts/test-pilot.mjs --private-manifest CAMINHO_PRIVADO/prompt15/manifesto-piloto.json
```

Executar na raiz do checkout com Node 22 e dependências existentes. O primeiro comando lê candidatas existentes, sem banco, rede ou ambiente secreto; exige diretório privado externo, não sobrescreve os anexos e atualiza a projeção pública sanitizada. O conjunto PT09 aceita de zero a cinco candidatas explicitamente listadas; o gerador não busca substitutas para cumprir quota. Mudança de lote exige revisar seleção, manifesto e QA. Não usar `sources/` sincronizado como saída.

`npm run test:pilot` é reproduzível sem anexos privados: usa destinos editoriais sintéticos anônimos e não comprova seus caminhos reais. Nesta execução, o teste também foi rodado com o anexo completo, cobrindo os três caminhos privados sem publicá-los no relatório. O JSON sanitizado é deliberadamente recusado como entrada autoritativa de reavaliação.

Após qualquer edição de conteúdo, fontes, autoria, mídia, metadados, oferta, host ou permissões, revalidar evidências e aprovações no contrato de runtime correspondente, gerar nova revisão e repetir o QA afetado. Editar `decision`, score derivado ou labels não libera uma URL. A ferramenta não escreve no CMS, nos arquivos de aprovação, no servidor ou na hospedagem.

Evidências de QA e limites no [relatório PT15](prompt15.md).
