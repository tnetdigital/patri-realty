# PT16 — Hostinger e preparação do backend

23/10/2026. **NO-GO mantido.** Base:24f483123f0c5834076db409fc6d444fda1f64ae. Supabase da Patri ainda não criado, conforme titular. Sem compra, mudança de plano, DNS, recurso, migration, publicação de função ou ativação de cron.

## Consulta autenticada

hPanel consultado somente para leitura, com sessão iniciada pelo usuário. Sites mostrou **Premium**, vencimento23/05/2027, e aviso de upgrade/plano compatível para Web Apps. O domínio patrirealty.com.br mostrou **Registrando**, pedido aceito/processando. Compra e domínio escolhido confirmados pelo usuário; não confundir registro em andamento com ativação ou propagação DNS.

O Premium exibido não disponibiliza a implantação gerenciada Node necessária. Não foi iniciada contratação. Antes de escolher upgrade ou outra hospedagem compatível, conferir oferta/custo e requisitos do servidor personalizado. Não inferir existência de VPS não consultado. [Documentação Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).

Requisitos a homologar: Node22 compatível, npm ci, npm run build:ssr, npm start/server.mjs, PORT do provedor, artefatos dist/dist-server/server, dependências runtime e manifestos privados persistentes. Vite detectado como frontend estático não atende ao SSR; verificar configuração Other/entrada personalizada. Nenhuma migração de stack proposta.

## Correção executada no código

- supplier-jobs deixa de chamar publicar_agendadas. Ativar e-mail não publica editorial por esse caminho.
- publicar-agendadas conserva autenticação e método, mas retorna503/no-store mesmo com segredo válido. Reabertura futura exige política backend homologada e autorização; não há flag que substitua esse aceite.
- Cinco testes executam entrypoints reais transpilados com adaptadores controlados: worker habilitado sem publicação, simulação sem reserva, autenticação, bloqueio editorial e método. Sem entrega externa.

**Limite:** a RPC publicar_agendadas e crons SQL continuam no histórico, inclusive cron_publish e cron_observed_publish. Esta correção Edge não revoga Data API/RPC nem altera jobs do banco. Não aplicar o histórico inteiro em projeto com cron ativo sem plano explícito. A preparação futura deve impedir agendamento editorial e implementar aprovação por versão também no banco, Storage, RPC e demais caminhos públicos. Nenhuma proteção SQL nova declarada.

O worker ainda prepara crescimento, alertas comerciais e ciclo de planos antes da fila. Portanto não ativá-lo como simples teste de e-mail: homologar esses efeitos com dados controlados, sem drenar fila produtiva por inferência.

## Próximas etapas para o Supabase

| Etapa | Entrada e responsável | Aceite |
|---|---|---|
| Definição | Titular: organização proprietária, região e orçamento/plano | Staging isolado e produção distinta; conferir requisitos Auth/backups antes de contratar |
| Criação autorizada | Titular autoriza recurso/plano concretos; credenciais diretamente no provedor | Ref pública do projeto e ambiente registrados; sem segredos no chat |
| Schema | Operação inspeciona versão, extensões e histórico | Plano compatível sem seeds/contas de demonstração; publicação e agendamentos impedidos até revisão |
| Segurança editorial | Operação e Tércio | Grants/RLS/RPC/Storage/jobs equivalentes aos contratos PT04/PT09; revisão vigente por versão; negações visitante/usuárioA/B/admin |
| Auth e conversões | Operação e titular dos serviços | SMTP/redirects/Turnstile/hook ou equivalente/limite Auth direto; recibos, persistência, entrega e sandbox financeiro |
| Operação | Operação e privacidade | Jobs inventariados, alertas recebidos, logs mínimos, backup/restore isolado e exclusões reaplicadas |
| Piloto | Tércio e titular | Oferta/direitos/fatos/QS/aprovação; QA por URL no destino; go-no-go atualizado e autorização do lote |

Para avançar, decidir hospedagem Node compatível e confirmar organização Supabase, região pretendida e orçamento. Não é necessário fornecer chaves agora. Criação de projeto não foi inferida da autorização de preparação. Identidade jurídica, contatos, mídia e conteúdo seguem pendentes; seis candidatas e zero prontas. T0 do PT17 não iniciado.

## Verificação

70testes HTTP/correções (65anteriores+5novos), tipagem cliente/Edge, lint, contrato de ambiente e árvore sem rascunhos aprovados. [Evidências](evidencias-backend-pt16/qa.json). Sem testes SQL ou serviços reais, pois o projeto não existe. Build SSR não repetido: alterações nas funções Edge e documentos, com compilação coberta pelo typecheck e testes dos entrypoints. Proteções externas só mudam após publicação autorizada/homologada.
