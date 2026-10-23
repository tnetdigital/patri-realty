# Liberação, observabilidade e reversão do piloto

Plano preparado no PT15, **não executado**. Não autoriza publicação externa. Stack, origem e backend produtivos continuam sujeitos ao PT16 e ao destino explicitamente autorizado pelo usuário.

## Pré-condições e responsáveis

| Portão | Evidência necessária | Responsável funcional |
|---|---|---|
| Negócio e oferta | Perfis reais publicados/elegíveis e serviços/cobertura comprovados. Município: pelo menos três identidades econômicas distintas com prova municipal vigente e conteúdo útil. | Responsável comercial/dados, com revisão editorial |
| Conteúdo | Intenção individual, valor próprio, fatos verificáveis, entidades e diferenciação; comparação com irmãs e acervo privado. | Tércio/editor; especialista no tema quando necessário |
| Autoria e mídia | Autor real e escopo definido; uso autorizado, origem, licença, limites e hashes dos arquivos. | Tércio e responsável pelos direitos |
| Quality Score e aprovação | Pontuação evidenciada por critério, baseline ≥75 para indexação e nenhum bloqueio absoluto. Aprovação real e vigente da versão completa no contrato correspondente. | Tércio |
| Runtime e backend | SSR/cliente/sitemap coerentes; banco/RPC/Data API com exposição equivalente à política editorial, sem acesso direto indevido. | Operação técnica autorizada |
| Domínio e ambiente | Destino HTTPS primário, hosts e canonical homologados; prévia isolada/autenticada. Sem aceitar a prévia estática como prova de SSR produtivo. | Operação técnica e titular do domínio |
| Conversão | Recibo, persistência, idempotência, CAPTCHA/antiabuso e entrega conforme o fluxo; consentimento analítico opcional. Checkout não comprova pagamento. | Operação técnica/comercial |
| Mensuração | Inventário real, fonte/recorte/fuso/frescor, erros e recibos acompanháveis; GSC/Bing corretos quando disponíveis. Sem atribuição de receita inventada. | Responsável por métricas |
| Observabilidade e reversão | Evidências atuais, responsável pela intervenção, backup/revisões privadas e retirada testada com proteção e dados atuais. | Operação técnica autorizada |
| Autorização | Usuário identifica o destino e autoriza a publicação do lote que efetivamente passou nos portões. | Usuário |

Os papéis funcionais acima são responsabilidades propostas, não pessoas designadas ou serviços já contratados. Tércio é o aprovador anteriormente definido. Uma aprovação do PT15 não aprova automaticamente cada conteúdo nem resolve esses portões.

## Verificação por URL antes da liberação

1. Registrar versão e fonte do inventário, aprovação, direitos, QA e estado anterior. Guardar anexos privados no meio seguro já autorizado; não colocar textos, segredos, dados de clientes ou evidências privadas no Git público.
2. Testar a URL no destino: status/redirect, HTML inicial, H1, canonical e robots corretos; dados estruturados e entidades correspondentes ao conteúdo visível; hidratação sem perder conteúdo ou deixar metadata anterior.
3. Conferir sitemap contra SSR e inventário independente. Testar links de entrada e saída relevantes, filtros/noindex, erros e aliases. Cobertura de sitemap não comprova indexação.
4. Verificar mídia real no host permitido, layout, crédito, alt text, permissão de uso e arquivo correto. Testar mobile, foco, cookies, teclado, menu e CTA sem cobertura ou rolagem lateral.
5. Testar conversão em homologação controlada de ponta a ponta. Separar estado do pedido, envio de e-mail, inscrição, duplo aceite e pagamento. Registrar somente a evidência mínima autorizada; não fazer cobrança, envio ou criação de contas reais por inferência.
6. Atualizar a revisão por URL. Não remover a retenção nacional, noindex ou as barreiras de aprovação somente para fazer o teste passar. Se o catálogo/fluxo não estiver disponível, manter bloqueado e reduzir o lote.

## Observabilidade preparada

Antes de publicar, confirmar logs do host e do backend efetivamente usados. Correlacionar rota, status, versão do build/conteúdo, decisão de elegibilidade e código do bloqueio. Evitar query/referer crus, dados do formulário, cookies, headers de autenticação, tokens e contatos nos logs e artefatos públicos. O plano não atesta que os logs atuais da hospedagem já atendem a esses requisitos.

Observar separadamente erros HTTP/SSR, falhas de API, perda de aprovação, link quebrado, mídia indisponível, falhas de formulário e divergência de sitemap. Alertas e responsável de resposta precisam ser homologados; nenhum monitor/agendamento foi criado.

Roteiro após publicação autorizada, como cadência operacional a confirmar:

- Imediatamente e nas primeiras 24 horas: host/HTTPS, proteção da prévia, HTML inicial, versões, assets, cache, rascunhos ausentes e funcionamento do lote.
- Em sete dias: rastreamento real, processamento de sitemap, erros por família e conversões operacionais; confrontar fontes e recortes do PT14.
- Em 28 dias ou quando houver dados suficientes: comportamento do lote e hipóteses de conteúdo/conversão. Indexação, impressões, cliques, pedidos e receita permanecem denominadores distintos. Ausência de tráfego inicial não aprova escala nem prova falha.

As janelas são sugestões de acompanhamento, não prazos prometidos de indexação ou metas inventadas. Só ampliar após evidências reais de utilidade, elegibilidade, rastreamento e resultado, com decisão editorial/comercial.

## Quando o fornecedor suspender ou mudar

Esperado, a homologar no backend/destino: retirar sua projeção pública e os alvos derivados, retornar 404 para perfil indisponível ou 301 apenas para sucessor realmente equivalente e aprovado; remover de sitemap, relacionados, listas e ItemList. Não redirecionar automaticamente para um concorrente ou hub para esconder erro.

Recalcular os guias afetados e a contagem por identidade econômica. Município que perder o mínimo ou a prova vigente deixa de ser indexável, sai do sitemap e dos links aprovados; não repor com cobertura estadual ou fixtures. Conferir também SPA, clientes abertos e caches. Os testes locais do gate não garantem invalidação instantânea em todo o ambiente real.

## Quando a matéria for alterada

Mudança na projeção assinada ou nas evidências relevantes exige revalidação do contrato editorial PT09. Não reaproveitar aprovação de outro hash; rascunho/versão sem aprovação deve ficar fora de SSR público, API pública, Markdown, listas, grafo e sitemap. Não preencher `dateModified` com data do build ou alteração administrativa. Verificar a exposição direta na Data API/RPC, além do proxy.

Manter a versão anterior privada para revisão; só mantê-la pública se houver justificativa e aprovação vigente, sem enganar sobre a atualidade. Esta preparação não escolheu nem executou uma política de manutenção de versões públicas.

## Reversão

1. Antes de liberar, registrar commit, configuração, inventário, conteúdo, aprovações e backups no ambiente autorizado. A base desta preparação está registrada no manifesto; ela não é automaticamente um snapshot válido de produção.
2. Em falha crítica, interromper a liberação do lote e revogar a autorização de exposição pertinente pelos controles existentes; preservar a autenticação da prévia e as barreiras de dados.
3. Restaurar somente configuração/código conhecidos e homologados, com intervenção autorizada. Conferir a árvore resultante para não restaurar rascunhos, conteúdo retirado, credenciais ou permissões antigas. Uma reversão de código sozinha não reverte corretamente dados, direitos ou aprovações.
4. Reexecutar o QA das URLs e APIs afetadas, incluindo retirada de conteúdo, sitemap, cache e clientes abertos. Preservar evidência privada do incidente e dados operacionais necessários.
5. Retomar somente após correção, nova avaliação por versão e autorização do destino/lote. Não reativar conteúdo apenas para recuperar métricas.

Nenhum restore, revogação real, publicação, alteração de DNS, configuração de monitoramento ou operação em banco foi executado pelo PT15.
