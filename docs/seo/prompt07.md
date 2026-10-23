# Prompt 07 — guias nacionais por segmento

Data: 22/10/2026. Execução autorizada após entrega do Prompt 06. Stack preservada: React/Vite, SSR existente e contratos públicos atuais. Nenhuma gravação em banco ou liberação produtiva.

## Resultado entregue

Modelo reutilizável de orientação à contratação, integrado ao componente de diretório por briefing opcional. Inclui escopo, aplicações condominiais, critérios de seleção, perguntas para orçamento, documentos/qualificações, limites e CTA para a seleção exibida. Sem briefing, não produz texto artificial para preencher a página. Nenhum briefing editorial foi conectado às rotas de produção.

O piloto tem três segmentos: administração condominial, portaria remota e elevadores. Não há inventário produtivo homologado nem aprovação editorial dessas páginas. Portanto, o lote permanece bloqueado: noindex compartilhado entre SSR/cliente, sem JSON-LD e fora do sitemap. A existência de empresas no retorno da API, sozinha, não libera o piloto. Testes usam empresas e briefings explicitamente sintéticos, sem importar os rascunhos privados.

O visitante recebe aviso de guia em preparação e de que deve confirmar escopo e cobertura. A listagem existente permanece disponível, sem inventar fornecedores. A interface informa junto aos resultados que destaque comercial pode influenciar a ordem de relevância, mas não equivale a avaliação editorial, qualidade ou garantia de atendimento.

## Piloto proposto e trabalho restante de curadoria

| Segmento / URL preservada | Decisão que o guia apoiará | Evidências exigidas antes de conteúdo público |
|---|---|---|
| `/guia/administracao-condominial` | Comparar escopo, prestação de contas e transição | Empresas reais, referências autorizadas, inclusões/exclusões, revisão de responsabilidades; pesquisa S01 do Prompt05 |
| `/guia/portaria-remota` | Comparar operação e contingência, com acessibilidade | Escopo operacional comprovado, contingência e responsabilidades documentadas; revisão técnica; pesquisa S02 |
| `/guia/elevadores` | Comparar manutenção, peças e atendimento | Empresas e escopos reais, documentação técnica aplicável, inclusões/exclusões e condições de atendimento; pesquisa S03 |

Essas decisões são briefings de produção, não alegações sobre empresas nem recomendações técnicas já aprovadas. Comparar com as matérias e rascunhos anteriores antes de redigir para evitar canibalização. Guias selecionam fornecedores; matérias explicam decisões; perfis comprovam cada empresa. Não foram criados links para matérias ou perfis inexistentes. Nenhum prazo, preço, economia, certificado ou cobertura foi inventado.

## Arquivos alterados

- `src/features/directory/GuideDecision.tsx`: template de decisão, campos opcionais apenas no nível do diretório; o briefing completo é exigido quando fornecido.
- `src/pages/Directory.tsx`: integração do template para uma especialidade nacional; aviso do piloto, explicação de ordenação comercial e destino do CTA de seleção.
- `src/features/directory/directory.css`: quebra de texto e listas do modelo, preservando mobile first.
- `src/seo/national-pilot.ts` e `src/seo/policy.ts`: bloqueio explícito dos três segmentos enquanto oferta/curadoria estão pendentes. Política municipal anterior continua independente.
- `src/entry-server.tsx` e `server.mjs`: exclusão do piloto do sitemap. O grafo do Prompt06 já respeita noindex; não houve duplicação de builder.
- `vitest.config.ts`: inclui testes TSX, além dos TS existentes.
- `src/seo/national-pilot.test.tsx` e `scripts/test-national-guides.mjs`: fixtures isoladas, renderização, bloqueio e testes de navegador.
- `scripts/test-local-eligibility.mjs`: permite controlar os segmentos sintéticos do sitemap para testar exclusão de forma efetiva.

Sem mudança na taxonomia, slugs, aliases, seleção múltipla, sugestão de cidades por UF, parâmetros ou contratos de acesso. Sem migration ou alteração da base. Quando o piloto tiver evidências e aprovação, habilitar conteúdo e revisar o bloqueio deve ser uma mudança deliberada, com testes e registro editorial; não basta remover a chamada noindex de um componente.

## Testes desta execução

| Verificação | Resultado |
|---|---|
| Unitários | 128 aprovados, incluindo 7 novos cenários do piloto/template |
| Guias nacionais HTTP/navegador | 11 cenários aprovados |
| Grafo SSR/hidratação | 14 cenários aprovados |
| Contrato SEO | 22 verificações aprovadas |
| Gate municipal | 17 cenários aprovados |
| HTTP/regressões | 60 aprovados |
| Proteção da prévia | 12 verificações e 5 testes HTTP aprovados |
| Builds cliente/SSR, typecheck frontend/Edge e lint | Aprovados |
| Scanner de rascunhos privados | Aprovado |

O teste específico verifica os três pilotos, noindex, ausência de JSON-LD, retirada do sitemap mesmo quando a origem sintética os fornece, aviso comercial, estado vazio sem empresas de preenchimento, ordenação e UF por teclado. Em 320/375/390/768 pixels não houve rolagem horizontal e o aviso pago permaneceu visível. Não equivale a auditoria completa com leitor de tela. Seleção múltipla/sinônimos e vínculo cidade/UF conservam a implementação anterior e as regressões unitárias; não se alteraram esses controles.

Comandos: `npm run build:ssr`, `npm test`, `node scripts/test-national-guides.mjs`, `npm run test:structured`, `npm run test:seo`, `npm run test:eligibility`, `npm run test:http`, `npm run test:preview-security`, `npm run typecheck`, `npm run lint`, `npm run check:private-editorial`. Testes de navegador requerem Chrome. [Evidências do piloto](evidencias-prompt07/qa.json).

Não foram executados testes SQL, envio real de orçamento, indexação GSC/Bing ou homologação produtiva. O teste municipal sintético não aprova localidade real. Não houve teste de envio a terceiros.

## Análise e publicação

Link de análise: relatório e alterações no GitHub público. Sem reescrita de histórico. A prévia AppDeploy continua na versão anterior por `CREDITS_USAGE_LIMIT_REACHED`, já registrado no Prompt04; não foi tentado novo deploy, remoção de senha ou app alternativo. Não apresentar a prévia anterior como evidência online do Prompt07.

Aceite técnico do modelo e bloqueios: validado pelos testes. Aceite editorial e publicação do lote: pendentes de oferta real, documentos, conteúdo próprio, revisão e autorização correspondentes. Não há três guias finalizados com empresas homologadas nesta entrega, e essa limitação é intencional conforme a alternativa prevista no Prompt07.

## Próximo passo

**Prompt 08 — perfis de fornecedores.** Melhorar identidade pública, serviços, cobertura comprovada, mídia, avaliações, completude e CTA de orçamento; conferir o botão mobile em 320/375/390/768 pixels, incluindo cookies/menus/teclado. Manter envio de teste em transporte controlado. O Prompt08 ainda não foi iniciado.

Em paralelo operacional, validar fornecedores reais dos três segmentos e resolver a quota da prévia. Essas pendências não autorizam publicar conteúdo ou liberar indexação automaticamente.
