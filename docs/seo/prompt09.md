# Prompt 09 — editorial, AEO e direitos de mídia

Data: 22/10/2026. Execução autorizada pelo usuário. Stack React/Vite + SSR preservada. Nenhum texto, fornecedor, prova ou aprovação real publicado; sem mudança de banco, cobrança, mensagem ou deploy.

## Auditoria dos 12 rascunhos

Foi lido o pacote privado, incluindo seções, respostas iniciais, FAQ, glossários, fontes e mídia. O original foi preservado. Resultado: **3 publicar após revisão, 1 aprofundar, 1 consolidar e 7 adiar**. “Publicar após revisão” é uma classificação de prioridade, não uma aprovação.

| Pauta | Classificação | Motivo principal |
|---|---|---|
| Almaz/Ibirapuera | Adiar | Revalidar área, autoria e estágio comercial; acesso direto à fonte principal falhou |
| Gestão condominial | Publicar após revisão | Forte relação com contratação; corrigir passagem que sugere serviço próprio de acompanhamento da Patri |
| Bosco Verticale | Aprofundar | Conectar referência internacional a critérios verificáveis de manutenção e contratação no Brasil |
| Sustentabilidade condominial | Publicar após revisão | Priorizar consumo, operação e evidência; limites técnicos/jurisdicionais ainda exigem fechamento |
| BIM e operação | Publicar após revisão | Focar entregáveis e continuidade da informação, sem inventar obrigação universal ou economia |
| Curadoria Michelin | Consolidar | No máximo uma seleção, condicionada à hipótese lifestyle; não apresentar ranking mundial |
| Cheval Blanc Paris | Adiar | Perfil de viagem precisa demonstrar relação com o público e não duplicar a curadoria |
| Passalacqua | Adiar | Mesma restrição; confirmar edição vigente da distinção e contexto da foto de arquivo |
| Hôtel du Cap-Eden-Roc | Adiar | Calendário anunciado não comprova disponibilidade; conexão comercial com portal não demonstrada |
| Osteria Francescana | Adiar | Evitar série de perfis turísticos sem validação; nenhuma experiência presencial foi comprovada |
| El Celler de Can Roca | Adiar | Preservar distinção entre curadoria documental, reserva e resenha presencial |
| Le Louis XV | Adiar | Atualizar evidência da distinção vigente; passagem histórica não comprova situação atual |

A auditoria privada registra 426 unidades de texto para rastreabilidade, 37 vínculos de fontes e 11 imagens únicas. Essas unidades não são 426 fatos certificados. Há afirmações materiais, recomendações autorais, perguntas e definições; vínculos candidatos e pendências estão identificados. Não se converteu existência de URL em comprovação factual.

Três candidatas privadas foram preparadas no contrato de revisão, com estado rascunho, sem data de publicação inventada, checks falsos e aprovação pending. A correção da falsa aparência de serviço próprio foi aplicada somente à candidata de gestão. Fontes específicas ainda precisam de fechamento e direitos precisam de aceite humano antes de qualquer liberação.

## Pesquisa e limites de revalidação

Foram consultadas fontes primárias. O [Decreto 11.888/2024](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/decreto/d11888.htm) contextualiza a Estratégia BIM BR; não é evidência de obrigação universal de adoção por condomínios privados. Referências do [Inmetro](https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/edificacoes), [MME](https://www.gov.br/mme/pt-br/assuntos/ee/indices-minimos-de-ee/eficiencia-energetica-das-edificacoes) e [GBC Condomínio](https://www.gbcbrasil.org.br/certificacao/certificacao-condominio/) não comprovam economia ou certificação de um prédio específico.

O [Código Civil](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm), a [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) e o [texto consolidado de saneamento](https://www2.camara.leg.br/legin/fed/lei/2007/lei-11445-5-janeiro-2007-549031-normaatualizada-pl.html) foram consultados. Isso não substitui análise jurídica/técnica do caso. Recomendações de reúso, privacidade e responsabilidades permanecem condicionadas à revisão especializada.

O operador do [Hôtel du Cap-Eden-Roc](https://www.oetkerhotels.com/hotels/hotel-du-cap-eden-roc/) anuncia temporada futura, que deve ser tratada como anúncio, sem inferir reserva. Fichas Michelin e publicações oficiais de seleção foram consultadas; quando o texto extraído não demonstrou a distinção atual, a pendência foi mantida. Não foram inventados preços, menus, disponibilidade, rankings ou experiências presenciais.

O registro privado distingue evidência encontrada, acesso parcial, falha e não revalidação. A fonte Almaz apresentou falha, a página BIM do MGI retornou 401 e houve timeout no acesso direto ao projeto Bosco. A pesquisa oficial e documentos complementares ajudam a revisão, mas não encerram automaticamente essas pendências. **Não se declara revalidação integral das 37 referências ou de todas as afirmações.**

## Direitos de mídia

As 11 imagens têm origem, autor, licença declarada, legenda, contexto e hash registrados; os 11 arquivos privados coincidem com os hashes anteriores. Nove fichas Commons foram acessíveis nesta consulta; duas tiveram falha. Acessibilidade não equivale a homologação da licença ou de todos os direitos de uso.

Crédito isolado não prova permissão. As condições de [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) exigem atenção à atribuição, licença, alterações e compartilhamento de adaptações. Fichas com outras licenças/domínio público exigem sua própria evidência. Todas as mídias reais deste lote permanecem bloqueadas para liberação até fechamento da revisão. Foto de contexto/arquivo não é case próprio, visita ou retrato da operação atual.

## Implementação

- Contrato `src/seo/editorial.ts`: hash canônico da projeção pública e hash de texto/fontes/mídia/metadados/checks; aprovação corrente, validade, origem e aprovador definidos. Rascunho, versão divergente, fonte vencida e mídia sem prova impedem a versão.
- Manifesto privado externo ao checkout, por `PATRI_EDITORIAL_APPROVAL_FILE`. Ausência significa zero matérias reais liberadas. Arquivo antigo de revisão protegida permanece separado.
- Adaptador em `contentPublic`: aplica o gate no SSR e no proxy `/api/editorial-public`. O navegador recebe a mesma projeção aprovada. Listagens, home, matérias de fornecedor e sitemap usam apenas versões liberadas; sem contagem de rascunhos. Limite de piloto: 25 candidatas aprovadas.
- Template: fontes vinculadas a blocos/afirmações, limites de apuração, autoria verdadeira, créditos e alt das imagens, inclusive em cards. Sem número obrigatório de palavras, FAQ ou verbetes.
- Article e OG: imagem/alt específicos somente da mídia revisada, tipagem social atualizada na navegação e datas verdadeiras. Não foi inventada data de revisão como publicação ou dateModified.
- Markdown por negociação de conteúdo, oriundo da mesma projeção do HTML; título, resposta, corpo, tabelas, autoria, fontes e créditos coerentes. Cabeçalhos, escape, q=0 e preservação de Vary/compressão testados. Requisito interno da v5.1 acessível, sem promessa de ranking.
- CLI `review-editorial-document.mjs`: prepara candidato pending e histórico privado. Não concede aprovação nem sobrescreve registro aprovado/revogado.

[Contrato e fluxo operacional](contrato-editorial.md). Hash controla integridade, não comprova sozinho a identidade de Tércio; a decisão real e o controle de escrita precisam existir no processo humano. Nenhuma decisão real foi simulada como produção.

## Testes e evidências

| Verificação | Resultado |
|---|---|
| Unitários | 143 aprovados, incluindo 13 novos casos editoriais |
| Governança editorial HTTP/navegador | 12 cenários aprovados |
| Grafo SSR/hidratação | 14 cenários aprovados |
| Guias nacionais | 11 cenários aprovados |
| Perfis/mobile | 9 cenários aprovados |
| Contrato SEO | 22 verificações aprovadas |
| Gate municipal | 17 cenários aprovados |
| HTTP/regressões | 60 aprovados |
| Proteção da prévia | 12 verificações e 5 testes HTTP aprovados |
| Builds cliente/SSR, typecheck frontend/Edge, lint, ambiente e scanner editorial | Aprovados |

O teste novo verifica ausência de aprovação, projeção pública bloqueada, versão alterada em HTML/Markdown/cliente, revogação, fontes, negociação, mídia sintética autorizada, crédito no detalhe/listagem e OG/alt. Fixtures têm origem explícita, funcionam apenas no transporte local e não são aprovações reais. Os testes de SEO passaram a usar esse contrato sintético, inclusive paginação real de 13 itens, em vez de considerar um texto sem data/autor como matéria pública.

Comandos: `npm run build:ssr`, `npm test`, `node scripts/test-editorial-governance.mjs`, `npm run test:structured`, `node scripts/test-national-guides.mjs`, `node scripts/test-profile-quality.mjs`, `npm run test:seo`, `npm run test:eligibility`, `npm run test:http`, `npm run test:preview-security`, `npm run typecheck`, `npm run lint`, `npm run check:env`, `npm run check:private-editorial`.

[Evidência dos cenários](evidencias-prompt09/qa.json). A auditoria detalhada, os textos, fontes/afirmações, registro de mídia, candidatas e histórico ficam somente em `output/patri-realty-private/prompt09/`, fora do repositório. Não foram publicados no GitHub. Nenhuma migration, teste SQL ou aprovação de backend produtivo foi executado.

## Limites e próximo passo

**Lançamento continua bloqueado.** A integração é local/contratual: não alterou grants/RLS do RPC remoto. Antes de produção, o mesmo gate precisa valer no backend ou a exposição direta de matérias não aprovadas deve ser retirada. Um proxy não revoga a Data API, conforme a [documentação Supabase](https://supabase.com/docs/guides/api/securing-your-api). O changelog e a documentação foram consultados; não houve mudança de SDK ou esquema.

O adaptador não monitora bytes de mídia remota por requisição: publicar arquivos imutáveis/versionados e conferir hashes no ato de liberação. Detalhes revalidam a cada 15 segundos e ao recuperar foco; não é recolhimento instantâneo do conteúdo já recebido.

Código e relatório entregues no GitHub público, sem reescrita de histórico. Sem deploy: permanece o limite AppDeploy registrado no Prompt 04; a prévia anterior não demonstra o Prompt 09.

Próximo passo: **Prompt 10 — interlinking e descoberta**, usando apenas o inventário público elegível. Em paralelo, fechar evidências das três candidatas e colher aprovação real. Nenhum novo lote editorial deve ser gerado automaticamente.
