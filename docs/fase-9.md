# Fase 9 — avaliações, métricas e crescimento

Autorizada após a aprovação da fase comercial. Mantém mobile first, sem emojis e o mesmo endereço AppDeploy. O frontend publicado é demonstrativo e usa dados fictícios no navegador; backend real desenvolvido e validado na stack local Supabase. Não foram realizadas cobranças ou mensagens externas.

## Avaliações

Conta ativa, e-mail confirmado, uma avaliação por autor e fornecedor, nota inteira de 1 a 5, título de 3 a 100 e relato de 30 a 1.000 caracteres. A primeira submissão e cada edição entram pendentes. Só admin publica, mantém uma denúncia ou remove com motivo. Fornecedor não pode apagar, apenas denunciar ou responder conforme a permissão atual do plano (Premium, Destaque e teste Premium). Dono/membro e usuário com o domínio corporativo da empresa não avaliam; domínios genéricos de webmail não são tratados como domínio empresarial, mas e-mail exatamente igual é bloqueado. A edição do relato limpa a resposta anterior para evitar resposta fora de contexto.

O público recebe somente avaliações publicadas e dados redigidos, sem identificador do autor, denúncia ou notas de moderação. Média e total usam somente publicadas. AggregateRating é emitido no SSR apenas com avaliações publicadas no banco real; demonstrações nunca recebem esses dados estruturados. Listas têm paginação e a administração tem filtros de pendentes e denunciadas.

## Métricas

Eventos: visualização de perfil e matéria, busca sem texto pesquisado, cliques WhatsApp/telefone/site/Instagram, orçamento enviado, impressão e clique de banner. Consentimento é verificado antes de criar o cookie de sessão aleatória de 30 minutos e antes de transmitir um evento. Revisar preferências ou recusar remove a sessão. A coleta não registra nome, contato, URL de origem livre, texto de busca ou IP em eventos. O gateway deriva HMAC do IP exclusivamente para limite de abuso: 300 eventos/hora, com retenção de até dois dias para esses identificadores. Eventos brutos duram até 90 dias; somente serviço privilegiado grava ou agrega. IDs de eventos evitam recontagem de requisições repetidas.

`agregar_metricas` preenche a tabela diária por entidade/tipo/especialidade/UF. Reexecução substitui o agregado do mesmo grupo sem duplicar e preserva o histórico anterior à janela de eventos. Banners continuam usando os relatórios da fase 8, com espelhamento para os agregados gerais; a sessão técnica desses eventos usa seu UUID de evento, sem estimar visitantes únicos.

Painel exibe totais, período anterior da mesma duração, variação de visitas, gráfico/tabela diária, CSV e impressão. Máximo de 365 dias por consulta. Grátis recebe bloqueio no servidor com números nulos; o efeito visual não esconde números reais carregados no cliente. Admin/comercial podem consultar o portal. Quando a variação de visitas é de -30% ou menos, aparece apoio especializado dentro do painel.

## Diagnóstico e marketing

Pontuação usa os itens atuais do perfil e soma 10 pontos a partir de três avaliações publicadas. Remover fotos abaixo de cinco reduz o diagnóstico. Abaixo de 60 pontos, o cartão oferece apoio especializado.

Cresça com a gente é exclusivo do painel: Perfil otimizado, Gestão de redes sociais, Campanha de geração de orçamentos e Pacote completo de posicionamento. Solicitação registra WhatsApp e mensagem e gera aviso operacional ao comercial. Uma solicitação aberta por serviço/fornecedor evita duplicações. Comercial/admin movem novo → em_contato → proposta → fechado e registram notas internas, que não são retornadas ao fornecedor. Não há promessa de resultado, contratação ou cobrança automática.

Instagram aceita até seis URLs de posts/reels validadas no cadastro. Perfil público oferece Seguir, carregamento voluntário de iframe oficial e link permanente de fallback; não há chamada à API Meta. O iframe só conecta ao provedor depois da ação do visitante. A verificação de falha usa uma requisição bloqueada nos testes e confirma que o link continua disponível, sem afirmar homologação da conta Meta ou disponibilidade de posts reais.

## Rotinas e implantação

Migration `20261021212354_reviews_metrics_growth.sql`. Rotas reais: /painel/avaliacoes, /painel/metricas, /painel/diagnostico, /painel/cresca; /admin/avaliacoes (admin), /admin/metricas e /admin/marketing (admin/comercial). Prévia: #/demonstracao-crescimento, #/demonstracao-avaliacoes, #/demonstracao-moderacao, #/demonstracao-marketing.

Publicar Edge `event` com `EVENT_IP_SALT`, `SITE_URL`, Supabase URL e chave do serviço exclusivamente no backend. `VITE_EVENT_URL` é opcional; o gateway local usa /event na porta 8788. Atualizar supplier-jobs: `rotinas_crescimento` agrega dados, recalcula completude, prepara convite de avaliação após 15 dias de um pedido válido e resumo mensal no dia 1 para fornecedores com métricas. Fila idempotente, com logs, lotes de 20 e prioridade para confirmações/convites/orçamentos sobre resumos comerciais. O worker local drena até dez lotes por execução, somente ao Mailpit. Produção ainda depende de cron, segredos e provedor de e-mail; resumo mensal e convite estão preparados, sem envio externo nesta entrega. As pendências de Stripe da fase 6 permanecem.

## Validação

382 assertivas SQL, 30 unitários e 19 HTTP. Navegação real inclui avaliação entre contas diferentes, moderação, resposta Premium, clique WhatsApp → evento → agregado e interesse → comercial com proteção de notas. Demonstrações cobrem consentimento, diagnóstico, planos, denúncias, respostas e CRM. 31 cenários de navegador verificados, com os três fluxos de e-mail repetidos e aprovados após o ajuste da fila. Builds cliente/SSR, SSR do guia/editorial e inclusão/remoção de AggregateRating aprovados. Advisors sem alertas. Prévia pronta no snapshot 1792619949706, sem erros de execução reportados pela plataforma. Quatro fluxos também aprovados no endereço público, incluindo métricas/CRM em 320 px e diagnóstico após remoção de foto.
