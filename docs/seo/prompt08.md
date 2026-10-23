# Prompt 08 — perfis de fornecedores

Data: 22/10/2026. Autorização: “pode avançar com o PT oito”. React/Vite, SSR e contratos públicos preservados; nenhuma migration, gravação em banco, empresa ou aprovação real criada.

## Alterações

1. Perfis sem identificação, resumo ou especialidade essenciais deixam de ser exibidos no SSR e no cliente: resposta de página 404 e sem grafo. A barreira é de apresentação; não altera a regra de publicação/administração no banco nem o RPC remoto existente. Cadastro, autorização, conta ativa e status publicado continuam sob o contrato público anterior.
2. Checklist de informações disponíveis mostra identidade, descrição de serviços, cobertura e canal público de contato. Pendências ficam explícitas. Não há nota de qualidade inventada; completude não equivale a aprovação, verificação ou destaque pago.
3. Área atendida aparece como declaração da empresa, com distinção entre município informado e cobertura estadual. Não se converte UF em atendimento comprovado em todas as cidades. Endereço físico informado aparece separado da área atendida. A prova municipal do Prompt04 permanece independente.
4. O antigo selo documental não especificava escopo nem data. A interface agora explicita que esses detalhes não estão disponíveis; não infere certificação, data de auditoria, qualidade ou garantia de atendimento do simples booleano `verificado`.
5. Breadcrumb visível e estruturado do perfil: início → guia → empresa. Organization conservadora e Service.provider do Prompt06 permanecem, sem promover a LocalBusiness sem comprovação. Canonical, metadata e redirects anteriores preservados.
6. Barra móvel passa a oferecer a ação de orçamento para o perfil correto. Não inclui contatos fictícios de demonstração. Cede espaço aos cookies, menu aberto e edição de campos; observa redução da área visual para teclado. Respeita safe area e reserva espaço inferior no conteúdo.
7. Tanto a ação lateral quanto a móvel abrem a seção do orçamento com foco em um controle e rolagem apropriada. O formulário continua recebendo o fornecedor corrente; identificação, CAPTCHA, cobrança e proteção dos contatos não foram alterados.
8. A interface explica a moderação das avaliações e que o fornecedor não escolhe apenas relatos positivos. Não se restaurou AggregateRating nem se alterou a fila de moderação. Serviços, imagens, casos e certificações não receberam dados de preenchimento.

## Arquivos

- `src/seo/profile.ts` e `profile.test.ts`: campos essenciais e checklist de completude.
- `src/pages/Directory.tsx`: perfil, breadcrumbs, distinções de cobertura/verificação, checklist e integração de orçamento.
- `src/features/directory/ProfileContact.tsx`: ação móvel e tratamento de foco, consentimento, menu e viewport.
- `src/mobile.css`: dimensão do botão, reserva inferior, safe area e margem para rolagem do formulário.
- `src/entry-server.tsx`: disponibilidade do perfil consistente com o cliente.
- `src/seo/structured-cache.ts`: breadcrumbs ligados ao grafo existente.
- `scripts/test-profile-quality.mjs`: transporte sintético e verificações HTTP/navegador.

Não foram importados campos internos, e-mails de leads ou dados de conta para o perfil. A interface continua usando a projeção pública já existente. Não foi auditado novamente o banco produtivo nem alegada nova prova de RLS. Regras de direitos de imagens/casos e completude cadastral devem continuar na revisão do fornecedor; não há inventário real homologado para confirmar esses itens nesta execução.

## Testes executados

| Verificação | Resultado |
|---|---|
| Unitários | 130 aprovados, incluindo campos ausentes e checklist |
| Perfil/mobile específico | 9 cenários aprovados |
| Guias nacionais | 11 cenários aprovados |
| Grafo SSR/hidratação | 14 cenários aprovados |
| Contrato SEO, incluindo slug antigo/inexistente | 22 verificações aprovadas |
| Gate municipal | 17 cenários aprovados |
| HTTP/regressões, incluindo proteção do orçamento | 60 aprovados |
| Proteção de prévia | 12 verificações e 5 testes HTTP aprovados |
| Builds cliente/SSR, typecheck frontend/Edge, lint, ambiente e scanner editorial | Aprovados |

O teste específico cobre perfil incompleto, ausência na projeção pública, retirada após acesso público sem cache residual de HTML, breadcrumbs, cobertura qualificada, cookies/menu e botão visível/clicável em 320/375/390/768 pixels. O clique leva ao formulário da empresa correta; o foco de edição retira a barra; nenhuma rolagem horizontal ou erro de execução foi observado.

Ausência/suspensão é simulada retirando a empresa da projeção pública, sem alterar conta real. Teclado foi testado por foco de edição em navegador desktop com viewport móvel; não é homologação em hardware iOS/Android. O código também observa visualViewport, mas não se declara teste de todos os teclados virtuais. Não se executou envio real de orçamento, cobrança, e-mail ou teste SQL. As regressões HTTP usam transporte controlado; o fluxo externo produtivo continua pendente.

Reprodução: `npm run build:ssr`, `npm test`, `node scripts/test-profile-quality.mjs`, `node scripts/test-national-guides.mjs`, `npm run test:structured`, `npm run test:seo`, `npm run test:eligibility`, `npm run test:http`, `npm run test:preview-security`, `npm run typecheck`, `npm run lint`, `npm run check:env`, `npm run check:private-editorial`. Chrome necessário para os testes de navegador.

[Evidências do perfil](evidencias-prompt08/qa.json) e [exemplos atualizados do grafo](evidencias-prompt08/exemplos-grafo.json). Todo dado desses arquivos é sintético, sem empresa, matéria ou aprovação real. Evidências históricas do Prompt06 foram preservadas.

## Publicação e limites

Entrega versionada no GitHub público para análise. Sem deploy: o limite AppDeploy registrado no Prompt04 continua pendente. A prévia online anterior não contém este Prompt08; nenhuma senha foi removida e nenhum app alternativo foi criado. Sem liberação de guias nacionais/municipais ou publicação de fornecedores.

Antes de produção, ainda é necessário homologar fornecedores, seus documentos, cobertura, direitos de mídia e operação real de orçamento, além das pendências de infraestrutura anteriores. O escopo desta entrega é a melhoria técnica e informacional do perfil, sem inventar essas evidências.

## Próximo passo

**Prompt 09 — editorial, AEO e direitos de mídia:** auditar os 12 rascunhos privados, classificar cada pauta, revalidar afirmações nas fontes primárias e aprimorar o pipeline de aprovação/mídia. Manter material não aprovado privado e priorizar contratação e gestão condominial. Não iniciar automaticamente antes da próxima autorização.
