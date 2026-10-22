# Decisões aplicáveis à Patri Realty

## Prompt 06 — execução após aprovação do Prompt 05

Grafo compartilhado SSR/cliente com origem confiável, allowlist de dados públicos e serialização segura. Fornecedor usa Organization até comprovar LocalBusiness/subtipo. Service.provider nunca aponta à Patri por serviços de terceiros. Redação é Organization; autor pessoal tem ID público no contexto da matéria para não unir homônimos. Não inferir dateModified de atualização administrativa. Sem AggregateRating até comprovação de elegibilidade, preservando notas visíveis; nenhum schema de FAQ/HowTo/speakable adicionado. Indexação segue políticas03/04. Sem banco/deploy/publicação de conteúdo; quota AppDeploy anterior preservada. Ver prompt06.md.

## Prompt 05 — proposta para análise, 22/10/2026

Prompt 04 aprovado. Estratégia e 26 oportunidades entregues, com três matérias candidatas ao piloto; nenhuma autorização editorial/publicação criada. Preservar slugs, aliases e IDs; mudanças conceituais são propostas. Não multiplicar segmentos por cidades. Pesquisa exploratória não mede posição Google, volume ou dificuldade. Oferta/capacidade produtivas desconhecidas. Sem alteração na aplicação/banco/prévia; limite AppDeploy preservado. Ver estrategia.md e prompt05.md.

Data: 22/10/2026. Este registro consolida instruções explícitas, sem alterar o código.

## Aprovadas pelo usuário

1. Manter React + Vite + SSR próprio. Não migrar stack.
2. Manter design premium, mobile first e ausência de emojis.
3. Prioridade: `/guia/{segmento}` → `/fornecedor/{slug}` → `/materia/{slug}` → `/guia/{segmento}/{uf}/{cidade}`.
4. Conversões: orçamento para contratante, cadastro/plano para fornecedor, newsletter para leitor.
5. Cidade indexável somente com três fornecedores reais, distintos, publicados e com cobertura comprovada no município, além de utilidade e demais controles de qualidade.
6. Tércio é responsável pela aprovação editorial e dos metadados por versão até nova definição.
7. Prévia restrita por autenticação efetiva; rascunhos privados.
8. Search Console, Bing Webmaster e eventos próprios. GA4 adiado.
9. Busca, agentes e treinamento liberados para conteúdo público aprovado. Não se aplica a rascunhos, contas ou dados privados.
10. Enquanto o Supabase estiver adiado: auditoria/correções no frontend e servidor; sem novas tabelas ou migrations.
11. Na solicitação desta rodada: executar somente os prompts 00 e 01 e apresentar diagnóstico antes de alterar código. Por isso não se aplicou a instrução histórica do AGENTS do repositório de atualizar a prévia em toda entrega.

## Referências e conflitos documentais

- O Mestre v5.1 §4.1 admite SSR próprio, mas §14.1 ainda contém exigência residual de TanStack Start/migração. Aplicada a decisão explícita de manter a stack; não é pendência de migração.
- GA4/Consent Mode do DoD foram adaptados à decisão de adiar GA4; mensuração com eventos próprios continua exigida.
- O Mestre v5.1 substitui a pontuação por portões eliminatórios. As instruções deste projeto MPI e o pacote autorizado mantêm Quality Score mínimo 75 em conjunto com bloqueios absolutos. Isso é controle interno, não nota do Google. A ponderação proposta no pacote de prompts ainda não foi implementada nem formalmente homologada como rubrica do portal.
- Markdown por negociação de conteúdo foi avaliado como requisito interno do Mestre, não como obrigação de ranking Google.
- “Três fornecedores” é regra interna da Patri, não requisito universal de buscadores.
- `docs/arquitetura.md`, `docs/publicacao.json` e trechos iniciais do AGENTS preservam etapas antigas. Quando divergem do código e de instruções posteriores, o diagnóstico registra a divergência; não reescreveu o histórico.

## Propostas que ainda não são implementação/aprovação

- Proteger ambiente e retirar rascunhos dos builds públicos; tratar cópias já públicas com plano específico.
- Unificar as decisões de HTTP, canonical, robots e elegibilidade.
- Usar os achados e critérios de aceite do backlog para executar os sprints seguintes.
- Não há autorização inferida para tornar o repositório privado, reescrever histórico, publicar conteúdo ou promover produção.

## Prompt 02 — decisão explícita do usuário

Manter tnetdigital/patri-realty público e continuar a execução. Não reescrever histórico. Proteger a prévia e remover os rascunhos da distribuição atual, preservando React/Vite/SSR e a URL permanente. Cópias históricas permanecem públicas por essa decisão. Segredo somente em entrada segura do provedor; ausência de configuração bloqueia o acesso.

## Prompt 03 — política HTTP e metadata

Origem canônica explícita e validada; não inferir de Host ou da prévia. Atribuição não gera noindex; filtros e busca mantêm identidade própria com noindex; paginação de conjuntos distintos tem canonical próprio. 404 é ausência; 503 é falha temporária. Normalização e metadata são comuns ao SSR e navegador. Demonstrações/tokens não recebem canonical público. A prévia segue protegida e não comprova o contrato HTTP de um host produtivo. Quality Gate municipal continua reservado ao Prompt 04.

## Prompt 04 — rubrica e evidências

Adotada para o gate municipal a adaptação interna versionada patri-local-2026-10-22.04, pesos20/20/15/10/10/10/10/5, nota mínima75 e bloqueios eliminatórios. Não substitui score de completude de perfil. A soma não avalia qualidade editorial e o hash não autentica aprovador: Tércio continua responsável pelo aceite real da versão. Sem provas/aceite, nenhum fornecedor é presumido real/elegível nem cobertura estadual vira municipal. Documento de revisão externo ao Git, revalidado com a projeção pública, sem novas tabelas ou aprovações fabricadas. Produção permanece bloqueada; preview continua privado/noindex.
