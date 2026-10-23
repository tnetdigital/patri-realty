# Prompt 11 — conversão e eventos sem depender de analytics

Data: 22/10/2026. Execução autorizada pelo usuário. Stack React/Vite/TypeScript, SSR e contratos Supabase mantidos. Nenhuma migração, cobrança, conta real, envio de e-mail externo ou publicação de conteúdo executados.

## Objetivo e resultado

Auditar e corrigir os percursos guia/perfil → orçamento, página para fornecedores → cadastro/plano e matéria → newsletter. Os formulários continuam independentes de analytics e distinguem confirmação de solicitação, confirmação de e-mail e pagamento.

**Resultado: implementação testada em ambiente controlado, pronta para homologação externa dos serviços. Persistência real no Supabase e entrega externa não foram testadas nesta etapa.** As respostas de sucesso dos testes de navegador são recibos simulados, não leads reais.

## Diagnóstico e correções

| Achado | Correção |
|---|---|
| Orçamento considerava qualquer HTTP 2xx como sucesso | Exige `recebido: true` no contrato de resposta |
| Fronteiras HTTP de orçamento/newsletter confirmavam apenas pelo status da RPC | Agora conferem também o recibo explícito devolvido pela RPC existente |
| Atualização de estado React não é um bloqueio síncrono contra dois submits | Adicionado bloqueio imediato por referência em orçamento, newsletter, autenticação e operações de plano |
| Chave de tentativa desaparecia ao atualizar a página | Identificador opaco de retentativa em sessionStorage, separado por fornecedor e produto quando aplicável |
| Analytics podia falhar ao consultar armazenamento/cookies ou serializar a chamada | Falhas absorvidas; armazenamento opcional indisponível equivale a análise não autorizada |
| Campos livres podiam alcançar o destino do evento de busca | Destino livre removido no cliente e no gateway; somente identificadores públicos previstos são encaminhados |
| Painel podia sugerir total operacional a partir de eventos opcionais | Rótulo “Confirmações de pedido” e explicação de contagens parciais; total de pedidos deve ser consultado na caixa de orçamentos |
| Destino de pagamento podia conter credenciais na URL | Checkout rejeita username/password, além da validação HTTPS e dos hosts Stripe existentes |
| CTA de cadastro podia sugerir empresa já cadastrada | Texto passa a “Criar conta de fornecedor” |

## Percursos e associação

### Guia/perfil → orçamento

A navegação rastreável do PT10 leva ao perfil, cujo CTA abre o formulário da empresa correta. O formulário conserva `fornecedor_id`, a especialidade selecionada, destinatários adicionais escolhidos e a cidade/UF informadas para o condomínio. Cidade declarada no pedido não se transforma em prova de cobertura municipal.

O componente de orçamento é reiniciado quando muda a identidade do fornecedor, evitando transportar especialidade, confirmação ou estado de envio de outra empresa durante a navegação. Os campos mantêm foco no primeiro erro, tipos adequados para e-mail/telefone e indicação de carregamento. O aceite operacional de compartilhamento fica separado de marketing; não foi adicionado opt-in de marketing ao orçamento.

Após um recibo válido, a interface mostra “Pedido registrado”. A mensagem distingue registro de entrega da notificação e resposta do fornecedor. Uma falha mantém os campos para recuperação e exige nova verificação de segurança quando aplicável. O evento `orcamento_enviado` só é solicitado depois do recibo e somente com autorização de análises; inclui fornecedor, especialidade e UF, sem nome, e-mail, telefone ou mensagem. Simulação de orçamento não dispara esse evento de confirmação operacional.

### Página comercial → cadastro/plano

A página `/para-fornecedores` diferencia experimentar uma demonstração de criar uma conta. O cadastro chama o fluxo Auth existente, conserva o opt-in de novidades desmarcado e só navega para a etapa de confirmação após resposta sem erro. A confirmação exibida não é tratada como prova de e-mail validado ou empresa publicada. Uma resposta genérica do Auth pode proteger a existência de contas, portanto não há evento de “novo cliente” baseado nela.

Depois da confirmação e do acesso, o fornecedor segue o painel e seleciona sua empresa/plano. A compra continua exigindo sessão, propriedade e preparação no backend; preço e privilégios não vêm de valores enviados pelo navegador. A interface bloqueia operações concorrentes e reaproveita a chave da tentativa por empresa/produto. A URL de retorno do checkout continua sem confirmar compra ou liberar recursos; a confirmação segura do pagamento permanece no webhook e no resumo do backend.

Os testes desta etapa cobrem cadastro no navegador, contrato do cliente de checkout e contratos HTTP de preço/proprietário/idempotência/webhook existentes. Não houve criação e confirmação de conta real seguida de checkout Stripe na conta externa. Essa homologação integrada continua pendente.

### Matéria → newsletter

O formulário preserva o aceite explícito e separado. A solicitação só exibe o estado de recebimento após recibo válido; esse estado continua pendente do link por e-mail. O botão evita reenvio imediato após confirmação da solicitação e o token de segurança é renovado após a tentativa.

Duplo aceite, expiração e descadastro continuam pelos contratos existentes. Não há evento que transforme uma solicitação pendente em assinante confirmado ou lead qualificado. O artigo que contém o formulário mantém seus eventos de leitura separados. O contrato de inscrição existente não persiste uma atribuição individual ao artigo de origem; não foi inventado um campo ou um relatório de atribuição que o banco não fornece.

## O que cada número significa

| Etapa | Evidência necessária | Interpretação |
|---|---|---|
| Clique em CTA, WhatsApp ou telefone | Interação observada, quando autorizada | Intenção; não comprova conversa, recebimento ou venda |
| Solicitação de orçamento aceita | Recibo do backend após RPC confirmada | Pedido registrado segundo o contrato; no teste atual, recibo controlado |
| Lead operacional real | Registro consultável no ambiente integrado | Contagem na caixa de orçamentos; não depende do consentimento de analytics |
| Lead qualificado | Avaliação comercial documentada | Não inferido por clique ou envio de formulário |
| Negócio fechado | Registro comercial confirmado pela operação | Não inferido por analytics, cadastro ou retorno do checkout |
| Pagamento confirmado | Webhook validado e estado do backend | Liberação de plano conforme contrato de cobrança |
| Solicitação de newsletter | Recebimento da solicitação | Ainda não é inscrição confirmada |
| Newsletter confirmada | Token válido processado no duplo aceite | Consentimento confirmado conforme fluxo existente |

Um pedido pode ter destinatários adicionais e produzir mais de um registro operacional; uma confirmação medida do pedido não é a soma dos leads de todas as empresas.

A mensuração no navegador é auxiliar, parcial e não substitui o registro operacional. O endpoint de eventos não é um livro financeiro ou uma fonte autoritativa de leads: chamadas de cliente não fornecem, por si, prova independente de persistência. Não foram criados eventos de lead qualificado ou venda fechada sem evidência operacional.

## Privacidade, repetição e limites

- Eventos do cliente usam lista de tipos permitidos e apenas campos previstos: identificador do evento, tipo, alvo público, sessão de análise, consentimento, especialidade e UF. Não incluem URL da página, pesquisa livre, tokens de Auth/CAPTCHA, contatos ou campos do formulário.
- O gateway de eventos também elimina o alvo livre de buscas. Hash de IP e demais controles existentes permanecem no servidor; nenhuma credencial privilegiada foi levada ao cliente.
- Analytics recusado ou indisponível não impede o envio operacional. Cookies e armazenamento de análise continuam condicionados ao mecanismo de privacidade existente.
- O novo armazenamento operacional contém apenas `{id, expires}` por tentativa, associado à empresa/produto público, na sessão da aba, com validade de uma hora. Não guarda preenchimento, e-mail, telefone, mensagem ou histórico de navegação, nem é enviado ao endpoint de eventos.
- Após recibo conhecido de orçamento, a chave é removida. Para checkout, é reaproveitada enquanto a sessão puder ser retomada; resposta de sessão encerrada remove a chave para uma nova compra. Refresh não dispara envio automático.
- O backend de orçamento continua validando chave, hash do payload e IP. Na dúvida sobre um envio, a retentativa deve usar os mesmos dados; mudança de conteúdo de uma tentativa já aceita pode ser recusada. O armazenamento não substitui idempotência do servidor e não garante deduplicação entre abas independentes, armazenamento negado, mudança de IP ou após o prazo.
- Newsletter mantém unicidade e limitação/reenvio previstos no banco. Sem acesso ao banco nesta rodada, essas regras foram inspecionadas e testadas por contrato, sem alegar verificação de linhas persistidas.
- Finalidades operacionais e de marketing não foram fundidas, nem textos legais ou bases legais reescritos. Registrar a nova chave temporária no inventário de armazenamento e validar transparência/retenção com o responsável por privacidade antes da abertura produtiva. Mudança futura de finalidade ou atribuição individual exige validação jurídica específica.

## QA e critérios de aceite

[Evidência do navegador](evidencias-prompt11/qa.json): Chrome headless, viewport 375 × 812, endpoints estritamente interceptados com dados sintéticos. Saídas externas não previstas são bloqueadas. A geração do ambiente de teste fica em `.preview/`, ignorado pelo Git; não cria uma rota de teste produtiva.

Oito cenários de navegador aprovados:

1. Validação sem envio inválido, foco no erro e tabulação entre campos no mobile.
2. Dois submits no mesmo instante produzem uma tentativa; HTTP 200 vazio não gera sucesso ou evento.
3. Refresh não reenvia e a retentativa conserva chave, fornecedor, especialidade e localidade, com analytics recusado.
4. Rede lenta só mostra sucesso após o recibo; falha do endpoint de análise não impede o formulário; evento não contém campos pessoais.
5. Newsletter exige aceite separado; resposta incompleta não simula confirmação.
6. Newsletter aceita fica pendente de duplo aceite, sem evento de lead.
7. Cadastro mantém dados após falha, evita repetição concorrente, conserva marketing desmarcado e só avança após resposta aceita.
8. Nenhuma exceção JavaScript propagada por mensuração nos percursos testados.

Teclado virtual físico, autofill de aparelhos reais, entrega de e-mail, confirmação externa de conta e pagamento real continuam para homologação em dispositivos/serviços reais. O teste headless de foco/tabulação não equivale a ensaio de todos os teclados móveis.

| Verificação | Resultado |
|---|---:|
| Unitários, incluindo recibos, retentativa, privacidade de eventos e checkout | 158 aprovados |
| HTTP/contratos, incluindo confirmação de RPC e busca sem texto pessoal | 65 aprovados |
| Conversão no navegador | 8 aprovados |
| Descoberta PT10 | 11 aprovados |
| Dados estruturados SSR/navegador | 14 aprovados |
| Perfil e mobile | 9 aprovados |
| Governança editorial | 12 aprovados |
| Contrato SEO | 22 aprovados |
| Gate municipal | 17 aprovados |
| Proteção de prévia | 12 verificações HTTP e 5 testes de acesso aprovados |
| Build cliente/SSR, tipos, lint, ambiente e isolamento dos rascunhos | Aprovados |

Repetir com `npm run test:conversions`, `npm test` e `npm run test:http`. As alterações de componentes também foram revisadas conforme a orientação React: hooks incondicionais, guardas síncronas, separação de operações opcionais e estado/foco de recuperação.

## Arquivos, dependências e publicação

Áreas alteradas: contratos em `src/features/conversion/`; orçamento; newsletter; mensuração e painel; cadastro; plano; texto do CTA comercial; fronteiras HTTP de orçamento/newsletter/eventos; testes unitários, HTTP e navegador. Nenhuma biblioteca, tabela, migration ou nova plataforma adicionada.

Dependências PT08–09 e bloqueios PT02–10 preservados. Guias em preparação, artigos sem aprovação, direitos pendentes e localidades inelegíveis não foram liberados. A proteção da prévia permanece. A pendência de proteção equivalente na Data API/RPC editorial do PT09 continua antes da abertura pública.

**A prévia online não foi atualizada:** o limite `CREDITS_USAGE_LIMIT_REACHED` do AppDeploy continua sem resolução informada. O snapshot 1792711230117 permanece anterior às entregas recentes. Não houve nova tentativa de deploy, cobrança ou aplicativo alternativo. O código e este relatório no GitHub são os materiais atualizados para análise. As alterações das funções de servidor também precisam ser publicadas e homologadas no ambiente externo; não foram aplicadas a um Supabase remoto.

## Referências e próximo passo

Consultados AGENTE_MESTRE_MPI e relatório MPI v3, com foco em conversão, mensuração e separação de consentimentos. A documentação atual de [cadastro do Supabase Auth](https://supabase.com/docs/reference/javascript/auth-signup) e o changelog público foram conferidos; não houve migração de SDK ou mudança de contrato de autenticação.

Próxima etapa: **PT12 — desempenho, mobile e acessibilidade**, começando por medições comparáveis de guia, perfil e matéria no mesmo ambiente controlado. Não iniciado nesta entrega.
