# Decisões aplicáveis à Patri Realty

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
