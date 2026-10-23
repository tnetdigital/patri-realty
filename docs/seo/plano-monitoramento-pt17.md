# PT17 — plano de monitoramento

Versão1, 23/10/2026. Estado: **preparado, não ativado; lançamento NO-GO**. T0 será a data real de lançamento autorizado do lote elegível, não a data desta sprint. Sem T0, nenhum prazo abaixo está correndo. Stack e bloqueios PT16 preservados; não criados monitores, automações, cookies, integrações ou recursos.

## Baseline e responsabilidades

Base: PT16, commit02ed7fb24712c5a0eec8f585a88b879b259bc45d. Manifesto PT15: seis candidatas, zero prontas; não é inventário de páginas publicadas. Origem produtiva, dados de desempenho e oferta real permanecem desconhecidos. A última inspeção externa é a do PT16, não repetida nem apresentada como observação nova nesta sprint.

O titular designa pessoas e suplentes antes de T0. Papéis propostos: operação técnica (disponibilidade, SSR, dados, segurança, cache, jobs e alertas); Tércio/editor (conteúdo e aprovação por versão); comercial (qualificação de pedidos e oferta); financeiro (conciliação); privacidade/jurídico (direitos, consentimento, retenção); analista (fontes, recortes e relatório). Nenhum papel equivale a contratação ou aceite pessoal confirmado.

## Cadência manual proposta

| Janela | Escopo e evidência | Quem decide / saída |
|---|---|---|
| Antes de T0 | Resolver matriz PT16; inventário aprovado, build/configuração, direitos, rollback, fontes e responsáveis. Testar recebimento de alerta controlado | Titular + operação + Tércio: GO documentado ou NO-GO |
| T0 e primeiras24h | Conferir todas as URLs do lote, HTTPS, redirects, HTML SSR, hidratação, metadata, sitemap, links, mídia e privacidade. Conciliar recibos dos fluxos autorizados; comparar dados publicados ao manifesto | Operação: relatório de liberação; contenção se incidente |
| Diário na primeira semana | HTTP/SSR/API, proteção staging, filas/rotinas e erros de conversão, frescor dos dados e exposição indevida | Operação: registro de exceções; sem métricas substituídas por zero |
| D7 e D14 | Descoberta, rastreamento, sitemap recebido, inspeção por URL quando disponível, impressões/cliques, eventos consentidos e pedidos reais separados; auditoria de conteúdo e acessibilidade por família | Analista + editor: diagnóstico, sem promessa de indexação |
| D30 | Comparar períodos completos equivalentes por cluster/coorte e fonte; revisar intenção, oferta, links, perdas de elegibilidade e conversão | Comitê titular/editor/operação/comercial: manter ou corrigir |
| D60 | Repetir com cobertura/frescor, sazonalidade e mudanças registradas; avaliar hipóteses de autoridade e primeira expansão limitada | Mesmo comitê: expandir somente com gates aprovados |
| D90 e trimestral | Auditoria de direitos/fatos/aprovações, conteúdo sobreposto, URLs retiradas e qualidade; revisão de manutenção/consolidação/retirada | Tércio + operação: decisão por URL, sem pruning automático |

Após estabilização, propor cadência operacional compatível com risco e orçamento; confirmar com titular antes de configurar serviço/agendamento. Estas janelas são sugestões, não automações criadas ou SLAs contratados.

## Matriz de observação e resposta

Os limiares abaixo são propostas internas de triagem, não fatores de ranking nem alertas ativos. Ajustar após baseline real. Quando não houver monitor contínuo, declarar a lacuna; revisão diária não garante detecção imediata.

| Sinal | Fonte / recorte | Gatilho proposto | Ação e responsável |
|---|---|---|---|
| Conteúdo privado, segredo ou permissão indevida | SSR, API direta, testes de papéis e amostra mínima de logs privados | Uma ocorrência comprovada | Crítico: operação contém acesso afetado, preserva prova mínima privada e aciona privacidade; suspende liberação |
| Indisponibilidade, 5xx, canonical de outro host, noindex acidental | GET + HTML/browser do lote e logs autorizados | Falha em duas verificações espaçadas até5min; incidente de segurança dispensa segunda confirmação | Operação investiga host/backend/cache, verifica abrangência; reverte aplicação conforme PT16 se necessário |
| Rascunho ou URL inelegível em sitemap/listas | Inventário independente + gate + sitemap/SSR/API | Uma divergência confirmada | Editor/operação retêm a URL e revalidam dependentes, sem derrubar barreiras |
| Recibo sem persistência, webhook divergente, duplicidade financeira | IDs operacionais privados, fila e ledger, nunca analytics opcional | Uma divergência confirmada | Operação/financeiro investigam e conciliam; interrompem fluxo afetado se risco; sem cobranças de diagnóstico |
| Fila/job/backup/alerta sem prova de execução | Horário de última execução e recibo real | Supera periodicidade e tolerância documentadas para o serviço | Operação aciona suplente; tolerância ainda não definida = pendência de T0 |
| Métrica ausente/atrasada ou fonte parcial | extractedAt, dataThrough, timezone, coverage e incidente da fonte | Ausência ou atraso além da janela documentada da fonte | Analista marca indisponível/parcial; suspende comparação e decisão de expansão |
| Queda de cliques/impressões | Mesma fonte, tipo de busca, país/dispositivo e coorte; duas janelas completas de28dias | Proposta: queda≥30% e diferença≥20cliques ou≥100impressões | Abrir investigação; números pequenos exigem leitura individual. Verificar tracking, status, indexação, demanda, mudanças e anomalias antes de conteúdo |
| Conteúdo/fonte/direito expirado | Manifestos por versão e evidências vigentes | Expiração ou mudança material | Tércio reavalia imediatamente elegibilidade e projeções; não renova data automaticamente |

Recebimento, triagem e resolução devem ter horários e responsáveis reais no registro privado. Prazos de resposta serão acordados antes da ativação; não presumir plantão. Incidente crítico aberto impede expansão mesmo se tráfego crescer.

## Contrato de dados e execução

Reutilizar [contrato PT14](contrato-mensuracao.md), dicionário e ferramentas existentes; não criar outro painel com denominadores incompatíveis. Separar procura de fornecedores, aquisição de fornecedores, leitores e publicidade. Campos mínimos: fonte/propriedade, origem, coorte e versão, início/fim, fuso, filtros, extração, último dia observado, cobertura, contagem observada, evidência privada e responsável. Histórico de URL retirada tem coorte própria, não desaparece silenciosamente do relatório histórico.

Inventário elegível, listado, submetido, inspecionado/indexado, com impressões, cliques e pedidos são conjuntos distintos. Inspeção parcial informa indexadas/inspecionadas e cobertura da amostra; não extrapolar ao inventário. CTR exige mesma fonte e denominador positivo. Zero exige prova; ausência é null, nunca zero inferido. Não agregar posição por média simples. Clique/contato/recibo não prova qualificação, venda ou receita atribuída. Registrar também falhas e evidência indisponível.

Fluxo manual: exportar apenas propriedade autorizada → guardar bruto privado → validar fuso/cobertura/linhas → normalizar no contrato PT14 → reconciliar → analisar por família/segmento/UF/cidade comprovada/cluster → registrar hipótese e decisão. Não reconstruir municípios pela UF nem join de receita sem relação comprovada.

```text
npm run export:gsc -- INPUT_PRIVADO.json PLANO_PRIVADO_NOVO.json
npm run report:measurement -- INPUT_PRIVADO.json RELATORIO_PRIVADO_NOVO.json
```

O primeiro gera plano sem rede por padrão. Para leitura autorizada real, seguir contrato PT14 e ambiente privado, com saída fora do checkout; não fornecer credencial no chat. Não executar exportação real enquanto origem/propriedade estiverem indefinidas. Nenhuma submissão de sitemap, inspeção em massa ou alteração de controle é inferida desse plano.

Modelos vazios: [registro de revisões](registro-monitoramento-pt17.csv), [experimentos](registro-experimentos-pt17.csv). Copiar para armazenamento privado antes de preencher; não publicar URLs privadas, consultas pessoais, recibos, tokens, e-mails ou logs crus. Retenção e acessos dependem da política aprovada pelo titular; não inventar prazo jurídico. Registros públicos devem ser agregados/sanitizados.

## AEO/GEO e acompanhamento reproduzível

Reutilizar as12perguntas do [painel PT14](painel-perguntas-ia-prompt14.csv), hoje não executadas. Depois de T0 e autorização da coleta, registrar plataforma, produto, modelo/versão quando informado (senão desconhecido), data/fuso, idioma/região, pergunta exata, sessão sem personalização quando possível, resposta/evidência privada, fonte citada, URL correta, menção sem link, ausência e erro factual. Separar teste manual de dado da plataforma. Fazer três repetições por pergunta em sessões separadas na mesma janela, com intervalo e contexto registrados; não criar “ranking de IA” universal. Frequência observada usa execuções válidas como denominador; falhas técnicas não são ausência de citação. Sem baseline ainda, não há tendência nem ganho atribuível.

Google: acompanhar relatório generativo separado quando disponível na propriedade, mantendo agregação e fuso próprios; não somar suas impressões ao total Web como tráfego adicional. Conferir também anomalias da fonte. **Exportação pode converter indisponível em zero**: conferir UI/legenda e proveniência antes de normalizar; quando não for possível distinguir, não importar a célula como zero conhecido. Disponibilidade na Patri não foi verificada. [Documentação oficial](https://support.google.com/webmasters/answer/16984139?hl=en).

Bing: citações, tópicos/intenção e Citation Share, se disponíveis, se referem às experiências cobertas pelo relatório. Não representam todos os assistentes, tráfego ou Quality Score; não converter em CTR. [Fonte oficial Microsoft](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/).

Na queda de busca, investigar fonte, contexto e mudanças antes de agir; não concluir causalidade por coincidência temporal. [Roteiro oficial Google](https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops). Fontes verificadas em23/10/2026; revalidar antes da ativação.
