# Patri Realty — estratégia SEO, AEO, GEO e MPI

Data: 22/10/2026. Prompt 05. Base de código: `221c27c1618228e97bc57cb278a9fa345565aaaa`. Documento de planejamento para análise; não aprova conteúdo nem libera indexação.

## 1. Direção e objetivo comercial

Posicionar a Patri Realty como apoio à decisão de contratação de fornecedores para condomínios. Público principal: síndicos profissionais e moradores com responsabilidade de gestão; secundário: conselhos e administradoras; fornecedores constituem o lado da oferta. Lifestyle atende uma hipótese complementar de afinidade e relacionamento, ainda sem prova de conversão.

Priorizar decisões concretas: definir escopo, verificar referências e documentos, comparar propostas e contatar empresas reais. Diferenciação pretendida: checklists originais, explicação de exclusões contratuais, evidências técnicas contextualizadas e perfis verificados. Esses ativos ainda precisam ser produzidos; não são atributos já comprovados do catálogo.

Conversão principal futura: pedido de orçamento válido a fornecedor elegível. Conversões auxiliares: visita ao perfil, clique em contato e leitura de checklist. Cadastro de fornecedor deve ser medido em funil separado. Publicidade não compra aprovação editorial, qualidade ou posição orgânica.

## 2. Inventário e limites verificáveis

O JSON atual tem 150 especialidades e 11 grupos. A auditoria integral está em `auditoria-taxonomia-prompt05.csv`. Não há slugs, nomes normalizados ou aliases multidestino duplicados na verificação automática. Há sobreposições conceituais e termos ambíguos que exigem decisão humana.

O inventário histórico de rotas do Prompt 01 mistura padrões e observações; não representa 241 páginas editoriais aprovadas. As famílias implementadas são `/guia`, `/guia/{segmento}`, `/fornecedor/{slug}`, `/materia/{slug}` e `/guia/{segmento}/{uf}/{cidade}`. Rotas possíveis não comprovam páginas úteis ou publicadas.

Não foi obtido inventário produtivo atual de fornecedores reais, cobertura, contatos ou matérias aprovadas. Exemplos da demonstração não contam. Zero conjuntos municipais foram aprovados nesta execução; isso não significa que o mercado tenha zero fornecedores. Os 12 rascunhos privados anteriores precisam ser comparados por Tércio antes de encomendar novas matérias, sem republicar seus textos na documentação pública.

Stack preservada: React/Vite, SSR existente e contratos de dados atuais. Sem migração, escrita em banco, conteúdo publicado ou nova plataforma. Produção e homologação externa continuam pendentes.

## 3. Pesquisa de busca e inferências

Dez consultas brasileiras cobrem gestão, segurança, manutenção, água, energia e melhoria de áreas comuns, além de lifestyle. As consultas, data e até quatro resultados observados por consulta estão em `pesquisa-prompt05.json` (S01–S10). Trata-se de amostra exploratória por ferramenta de pesquisa web, sem posição Google, localização controlada, dispositivo, anúncios, mapa, PAA ou AI Overview verificados. Não se atribuem posições ou frequência populacional aos resultados. São Paulo é um recorte exploratório de consulta, não uma decisão de cobertura comercial.

| Fonte | Intenção inferida / páginas observadas | Concorrência observada | Critério e lacuna a investigar |
|---|---|---|---|
| S01 | Escolha de administradora; guias de empresas e portal | Trindade, oHub, Auditor, BBZ | Comparar acesso a documentos, escopo e transição; produzir instrumento original com revisão |
| S02 | Contratar portaria remota; páginas de solução e publicação setorial | Porter, Oktaforce, SIESESP | Contingência, acessibilidade e responsabilidade; não repetir percentuais comerciais de economia |
| S03 | Empresa local de elevadores; prestadores e diretório | Base, Eco Lift, CREL, SíndicoNet | Exclusões, peças e atendimento; comprovar disponibilidade, sem prometer SLA |
| S04 | Regularização de incêndio local; prestadores e documento oficial | Daotec, Engcor, DRD2 | Separar documentação de obra/equipamento; normas exigem validação jurisdicional atual |
| S05 | Resolver infiltração/orçar; serviços, blog e marketplace | Pintura SP, Loqal, ACR-TEC | Diagnóstico antes de preço; não reproduzir estimativas sem escopo |
| S06 | Higienização de reservatórios; guias e serviços | Manu Help, oHub, Detecta | Distinguir limpeza, manutenção e impermeabilização; prazo legal não pode ser generalizado |
| S07 | Viabilidade de recarga; entidades, jurídico e prestadores | ABVE/Secovi/Sinduscon, PHC, Fontes | Capacidade, medição e segurança; revisão técnica atual antes de orientar instalação |
| S08 | Projeto e manutenção paisagística; arquitetos e paisagistas | Cintia Rua, Juliana Saraiva | Distinguir jardim privado e área comum; operação, irrigação e manutenção |
| S09 | Planejar reforma/retrofit; orientação e serviços | SíndicoAI, Secovi, CREA-RJ, CAU/RS | Separar aprovação, projeto e execução; consulta a fonte primária e especialista |
| S10 | Inspiração/viagem; seleções e imprensa | Melhores Destinos, BlackCard, Seu Dinheiro | Intenção distante de contratação; testar ponte editorial antes de ampliar |

Esses domínios competem pela atenção em consultas da amostra; não foram classificados como líderes de mercado. A lacuna é hipótese de produto editorial, não alegação de que todos os concorrentes deixam de atendê-la. Nenhum texto foi copiado. Perguntas propostas abaixo são editoriais; não foram extraídas de PAA.

Volume mensal, dificuldade, CPC, tráfego esperado e retorno financeiro: desconhecidos. Antes de investimento em escala, cruzar consultas de GSC/Bing após lançamento, entrevistas com síndicos, oferta validada e ferramenta de palavras-chave se disponível. Não substituir essa coleta por contagem de resultados.

## 4. Taxonomia, sinônimos e URLs

Grupo organiza navegação; segmento representa o serviço; subsegmento detalha escopo sem exigir URL própria. Exemplo: segurança → segurança eletrônica → CFTV/controle de acesso. A estrutura atual é plana por segmento; a hierarquia é proposta editorial, sem mudança no runtime.

- Preservar todos os 150 slugs e aliases. IDs de banco não constam do JSON e não foram consultados; preservar IDs reais quando houver futura intervenção.
- Segurança eletrônica e sistemas de segurança: candidato a uma intenção principal, sujeito a inventário de empresas, consultas e backlinks. CFTV, controle de acesso e portaria remota têm escopos próprios; não fundir automaticamente.
- Jardinagem/paisagismo: projeto e manutenção cabem sob o mesmo hub, com blocos próprios. Administração e síndico profissional têm funções distintas. Inspeção, perícia, manutenção e retrofit também não são sinônimos.
- Controle de pragas: propor mover navegação de água para limpeza; sem mudar slug. Totem carregador, sensores de presença, acessórios, consultoria e assistência especializada precisam de definição de objeto antes de produzir conteúdo.
- AVCB é regularização; não confundir com extintores ou treinamento. Caixa d’água é objeto; limpeza, venda e impermeabilização são intenções diferentes.

Mapa de sinônimos: administradora/administração condominial → `administracao-condominial`; câmeras/CFTV/videomonitoramento → bloco CFTV; dedetização/controle de pragas → `controle-de-pragas-e-dedetizacao`; carregador veicular/ponto de recarga → `carregadores-para-veiculos-eletricos`. Perguntas e variações gramaticais permanecem na página de intenção correspondente.

Se uma consolidação for aprovada depois, primeiro mapear IDs, perfis associados, links internos, sitemap, cliques e backlinks. Somente equivalência real permite 301 de slug antigo para destino relevante, sem cadeia e com atualização de links/canonical/sitemap. Não redirecionar especialidade específica para hub genérico por conveniência. Nenhum redirect foi executado neste Prompt.

## 5. Arquitetura, conteúdo e anticanibalização

Home → guia → segmento → perfis elegíveis. Matéria de decisão liga ao segmento e a outra matéria complementar; perfil liga somente aos seus serviços e localidades comprovadas. Hub nacional seleciona empresas; matéria explica contratação; perfil comprova a empresa; municipal resolve contratação com oferta e contexto locais. Não criar páginas de UF isoladas, bairros, filtros ou sinônimos nesta fase.

Antes de cada pauta, procurar intenção e título no inventário público e nos rascunhos privados. Havendo resposta equivalente, atualizar a peça existente e registrar o destino definitivo na matriz. URLs de matérias na matriz são propostas, não conteúdo existente. Padrões de perfis não são empresas inventadas e nunca devem virar links públicos literais.

Modelo de briefing: público e decisão; escopo/exclusões; resposta direta; critérios comparáveis; perguntas ao fornecedor; documentos e referências com data; limites por jurisdição; tabela/checklist original; autor/revisor; CTA funcional; links relacionados. Não adotar meta de palavras ou percentual arbitrário de texto único como prova de qualidade.

Três candidatas ao piloto: MPI-002 (administradora), MPI-004 (portaria remota), MPI-006 (elevadores). Entregáveis pretendidos: checklist de escopos e transição; roteiro de contingência e acessibilidade; comparação de inclusões e exclusões de manutenção. Perguntas propostas: “O que está fora do contrato?”, “Como funciona a contingência?” e “Quais peças e atendimentos estão incluídos?”. Revisão técnica onde aplicável, nenhuma promessa jurídica, de economia ou prazo.

No piloto inicial, matérias podem ser revisadas sem oferta local, mas CTA de orçamento fica condicionado a destino real homologado. Não publicar hub vazio para completar o funil. Até homologar domínio e operação, continuar na área protegida.

## 6. AEO, GEO e confiança

Aplicar respostas claras, tabelas de critérios, entidades consistentes, fontes primárias contextualizadas e autoria/revisão visíveis. Evidência original e limites explícitos tornam cada página mais útil para pessoas e extração de informação. Separar experiência comprovada de síntese editorial e patrocínio.

O Google confirma que fundamentos de SEO continuam relevantes para sua busca generativa; recomenda conteúdo próprio e valioso. Não há garantia de citação. Referência atual: [guia oficial de otimização para busca generativa](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide). Não usar marcação, arquivos especiais ou repetição de termos como substitutos de evidência.

Dados estruturados devem corresponder ao conteúdo visível e às entidades reais; nenhuma avaliação, preço, endereço ou credencial inventada. Manter o contrato técnico aprovado nos Prompts 03/04. Não prometer destaque de FAQ. Estender pesquisa de políticas dos demais mecanismos somente quando houver configuração específica a executar; esta rodada não auditou robôs ou elegibilidade de cada plataforma de IA.

Evitar páginas quase iguais para cidades e geração sem valor adicional, conforme [políticas de spam do Google](https://developers.google.com/search/docs/essentials/spam-policies). O gate municipal continua exigindo três empresas econômicas distintas com cobertura exata, evidência vigente, QS≥75 e aprovação humana da versão; não flexibilizar por oportunidade de palavra-chave.

## 7. Alto padrão e lifestyle: hipótese e decisão

Hipótese: leitores interessados em arquitetura, hospitalidade e qualidade de vida podem avançar a projetos e serviços de áreas comuns. Público afluente não é automaticamente síndico nem comprador desses serviços. Separar intenção de viagem da de decisão condominial.

Teste proposto após lançamento: uma matéria ponte sobre hospitalidade em áreas comuns, ligada a arquitetura/retrofit; comparar com as três peças utilitárias por origem, cliques para guia/perfil e pedidos válidos. Janela inicial operacional: 30 dias após primeiras impressões, estender até 90 dias se amostra insuficiente. Registrar denominadores, sem atribuição causal ou significância fictícia. Datas são checkpoints de gestão, não previsão de indexação.

Medir taxa de passagem matéria→guia (cliques/sessões consentidas da matéria), guia→perfil, início→envio de orçamento e qualidade dos pedidos. Se não houver amostra, resultado inconclusivo. Se atrair apenas consumo de viagem, manter seção limitada ou adiar; se gerar avanço qualificado e houver capacidade, produzir uma segunda ponte. Não encomendar séries extensas de hotéis/restaurantes antes desse sinal.

## 8. Medição e escala

GSC/Bing: impressões, consultas, URLs indexadas e cliques por família/segmento. Eventos próprios previstos no produto: passagem para perfis, contato e orçamento; verificar esquema e consentimento na homologação antes de instrumentar dimensões. Não enviar nome, e-mail, telefone ou texto de pedido para analytics. GA4 continua adiado.

Relatório quinzenal no piloto: páginas aprovadas versus indexáveis versus indexadas; cobertura de oferta; pedidos válidos; intenção/consulta atendida; rejeições do gate; custo e tempo editorial reais. Referências/citações de IA devem ter registro de consulta, plataforma, data e sessão; ausência em amostra não prova ausência universal. Nenhuma coleta de métricas conectadas foi realizada aqui.

Potencial sustentável = conjunto de intenções úteis com evidência de busca ∩ oferta/cobertura verificadas quando exigidas ∩ conteúdo distinto ∩ aprovação ∩ capacidade de manutenção. Quantidade publicável no ciclo é limitada pela capacidade medida de produção e revisão, descontando revalidações. Não calcular `150 × cidades`. Oferta produtiva e capacidade editorial são desconhecidas; potencial total não é quantificável agora. A matriz contém 26 oportunidades, não 26 páginas autorizadas. Não há página municipal liberada.

## 9. Sprints executáveis

| Sprint | Objetivo / escopo / áreas | Implementação | Aceite e QA | Dependência / resultado |
|---|---|---|---|---|
| A — validar oferta | Inventário real de perfis, especialidades, municípios; dados e matriz | Exportação autorizada de leitura, deduplicação econômica, evidências e responsáveis | Sem demos; prova por empresa/município; segredos fora do arquivo público | Acesso produtivo; lista confiável e CTA possível |
| B — piloto editorial | Três pautas MPI-002/004/006; editorial privado | Comparar rascunhos, produzir instrumentos originais, revisão por especialista e Tércio | Sem canibalização, fontes e licenças, score/revisão registrados; nenhum aceite fictício | A para CTAs comerciais; três peças revisáveis |
| C — homologar/publicar pequeno lote | SSR, conteúdo e perfis escolhidos; stack atual | Aplicar contratos 03/04, produção quando pronta, links reais | Status/canonical/robots/sitemap, mobile, contato ponta a ponta, ausência de rascunhos | B + pendências de lançamento; pequeno lote útil |
| D — avaliar e decidir | Busca, conversão, manutenção e hipótese lifestyle | Revisões em 30/60/90 dias; atualizar ou consolidar peças | Dados com denominadores; sem escalar se falta oferta/qualidade/medição | C; decisão documentada sobre próxima rodada |

Tércio aprova taxonomia, pautas e versões. Especialistas validam aspectos técnicos/jurisdicionais. Comercial confirma oferta, sem aprovar alegações técnicas. Implementação posterior deve registrar arquivos, rollback e testes por mudança. Este documento não inicia automaticamente o Prompt 06.

## 10. Evidências e arquivos

`matriz-mpi.csv`: backlog e status individual. `auditoria-taxonomia-prompt05.csv`: 150 conceitos preservados. `pesquisa-prompt05.json`: consultas e fontes. `qa-prompt05.json`: verificações estruturais. `prompt05.md`: relatório e limites. Bases internas: especificação, documentação de filtros, inventário Prompt 01, decisões e gate Prompt 04; metodologia AGENTE_MESTRE_MPI e relatório MPI v3, com prevalência das decisões aprovadas e fontes atuais.
