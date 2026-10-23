# KVM 2 — plano de segurança e TLS para homologação

23/10/2026. **Plano preparado, nenhuma correção executada. NO-GO mantido.** Base5c605d2896541c11e8126bb61379661f57a461ff. Análise dos achados privados anteriores; não houve nova consulta ou intervenção no VPS, instalação, mudança de acesso/firewall/TLS, reload, certificado ou publicação.

## Objetivo e resultado

Tornar a futura homologação da Patri recuperável, isolada e verificável, preservando os serviços atuais e a stack. O plano detalhado está no anexo privado local `output/patri-realty-private/plano-seguranca-tls-kvm2-20261023.md`, fora do Git público. Ele contém evidências, áreas/arquivos, implementação proposta, impacto, QA, dependências, reversão e critérios de interrupção por etapa. Não distribuímos neste relatório o mapa administrativo ou as configurações dos outros projetos.

A análise não comprova exploração, credencial comprometida ou vulnerabilidade por uma versão curta. Configuração lida, serviço escutando, tráfego externo aceito e ataque bem-sucedido são evidências distintas. Avisos de atualização precisam ser revalidados; não foi feita análise completa de CVEs ou pentest.

## Caminhos de homologação

| Caminho | Finalidade | Condição |
|---|---|---|
| QA offline | Validar artefato/configuração com dados controlados | Pode ser preparado sem tocar no VPS; não comprova runtime do host |
| Staging interno | Testar SSR por loopback e acesso administrativo autorizado | Exige recuperação, host revisado, isolamento e autorização de implantação; não publica domínio ou porta |
| Staging HTTPS público protegido | Validar destino real, TLS, navegador e fluxos autorizados | Exige política TLS efetiva, certificado/renovação, rede, logs e gates pertinentes aprovados; senha permanece |
| Produção/piloto | Operação com conteúdo/dados reais | Todos os gatesPT16 e autorização explícita de destino/lote; nenhuma etapa acima aprova automaticamente |

A preferência é homologação interna primeiro. Se a política TLS compartilhada não puder ser alterada sem impacto não aprovado, a prévia pública continua bloqueada; avaliar uma alternativa isolada como projeto separado, sem criar ou contratar agora.

## Ordem de correção

P0: resolver antes de dados reais ou exposição pública, conforme o escopo. P1: resolver durante homologação e antes da aceitação pública/produção. São prioridades internas propostas, não severidades CVSS ou SLAs contratados.

| ID / prioridade | Objetivo e escopo | Implementação proposta / aceite | Dependências / resultado |
|---|---|---|---|
| S00 / P0 | Recuperação e donos; console, backup e baseline | Operador/suplente, dois caminhos de acesso, versões anteriores privadas e recuperação isolada comprovada; baseline dos vizinhos | Titular; intervenção recuperável |
| S01 / P0 | Acesso administrativo | Novo acesso nominal/chave e sudo testados antes de restringir método antigo; revisar precedência/includes e automações; rollback por sessão preservada | S00; acesso validado sem lockout |
| S02 / P0 | Superfície de rede e containers | Mapa por serviço/porta/origem/famíliaIP; mudança uma a uma; testes controlados externos e vizinhos; nenhuma abertura pública da porta interna | S00/S01; exposição necessária verificada |
| S03 / P0 público | Política TLS efetiva | Mapear listener/default/includes e clientes; propor diff mínimo; provar1.2/1.3 aceitos e1.0/1.1 recusados pelo servidor; regressão dos vhosts | S00/S02 e donos; TLS comprovado ou NO-GO público |
| S04 / P0 público | Certificado, DNS e renovação | Confirmar domínio/subdomínio e A/AAAA; método de emissão sem parar serviços; SAN/cadeia/permissões, renovação e alerta testados | S00/S03 para aceite; HTTPS e ciclo de vida comprovados |
| S05 / P0 avaliação, P1 correção | Manutenção aplicável | Revalidar pacotes completos/backports/avisos e necessidade de restart; plano por pacote/janela, sem upgrade global cego | S00; patch/mitigação vigente comprovado |
| S06 / P0 staging | Isolamento e antiabuso | Imagem/digest, UID/permissões, loopback/RO/limites; proxy confiável e tentativas controladas; QA401/503,assets,Host e vizinhos | S00/S01/S02/S05; staging isolado, não GO produtivo |
| S07 / P1 | Logs, alertas e restauração | Sanitização/acesso/rotação; alerta recebido; recuperação isolada e exclusões reaplicadas; RPO/RTO definidos pelo titular | S00; operação demonstrável |

Responsáveis funcionais propostos: titular autoriza impacto e designa pessoas; operação implementa e prova; donos dos serviços validam compatibilidade; privacidade revisa dados/logs/retensão; Tércio mantém aprovação de conteúdo. Não são pessoas ou plantões já confirmados.

## Três cuidados que mudam o plano

**SSH:** não retirar o método atual antes de testar acesso alternativo, sudo e recuperação. Arquivo novo de configuração não garante prevalência; validar includes, condições e versão instalada. Não trocar porta apenas para aparentar segurança. [Referência OpenSSH](https://man.openbsd.org/sshd_config).

**Rede:** regras Docker e UFW não são camadas automaticamente equivalentes. Não desabilitar o gerenciamento de firewall do Docker para contornar uma regra; validar o caminho realIPv4/IPv6 e preservar as aplicações existentes. [Documentação Docker](https://docs.docker.com/engine/network/packet-filtering-firewalls/).

**TLS:** o Nginx pode usar parâmetros do servidor padrão antes da seleção por SNI. Assim, TLS1.2/1.3 só no template da Patri não certifica o listener compartilhado. Mudança global pode afetar clientes de outros sites e exige autorização própria; não alterar default_server por inferência. [Documentação Nginx](https://nginx.org/en/docs/http/ngx_http_ssl_module.html#ssl_protocols).

Certbot existente deve ser inspecionado antes de emissão/renovação. Installer, hooks e dry-run podem ter efeitos; não reinstalar cliente ou usar modo que pare Nginx para facilitar o teste. Método de DNS/webroot e eventual aceiteACME dependem de autorização. [Referência Certbot](https://certbot.eff.org/instructions?ws=nginx&os=pip). Fontes consultadas em23/10/2026; revalidar antes de implementar.

## Provas para cada correção futura

Registro privado por ID: alvo, executor/aprovador, janela, estado anterior, diff mínimo, teste de sintaxe/configuração efetiva quando pertinente, teste funcional/negação, regressão dos vizinhos, resultado, rollback disponível e próxima revisão. Campos desconhecidos continuam pendentes. “Rollback preparado” no JSON significa procedimento descrito, não recuperação já testada.

Manter sessão/console em alterações administrativas; não reiniciar Docker/Nginx/VPS por padrão. Reverter só o diff afetado. Se rollback reintroduzir risco, reter a Patri pública em vez de declarar gate aprovado. Restore integral de VPS ou banco afeta outros serviços e não é consequência automática de rollback da aplicação.

Interromper se faltar recuperação/dono, houver conflito não inventariado, acesso legítimo falhar, aparecer erro/OOM novo dos vizinhos, segredo for exposto ou a prova não sustentar a aceitação. Não apagar logs nem remover barreiras para concluir QA.

## Dados que faltam para transformar o plano em mudanças revisáveis

- Operador e suplente, métodos administrativos usados e dependências de automação, sem fornecer credenciais.
- Origens administrativas estáveis ou decisão sobre acesso intermediado; clientes legados e donos dos serviços compartilhados.
- Janela de manutenção possível, custódia de backups e meio de recuperação autorizado.
- Responsável pelo DNS e pelo ciclo de certificado; confirmar subdomínio de prévia antes de emitir.
- Organização/região/plano Supabase e responsáveis por privacidade/conteúdo.

Essas informações permitem preparar diffs concretos; não é necessário contratar nada agora. Detalhamento readonly pode continuar independentemente, mas alterações de acesso/rede/TLS dependem dos responsáveis e do escopo exato.

## Verificação e continuidade

[Estado e dependências sanitizados](plano-seguranca-kvm2.json) e [QA desta preparação](evidencias-plano-seguranca-kvm2/qa.json). Validados os oito IDs, referências, dependências sem ciclos, bloqueios e limites de escopo; configuração candidata anterior preservada. Não repetimos testes de runtime sem mudança de aplicação, nem executamos sintaxe/handshake no servidor nesta entrega.

O [pacote de homologação](../../deploy/kvm2-staging/README.md) continua candidato e não aplicado. Próximo passo: completar S00 e detalhar os diffs específicos de acesso/rede/TLS, com responsáveis e recuperação. Supabase/Auth direto/RLS/RPC/jobs, conteúdo/direitos/conversões e demais [gatesPT16](go-no-go.md) permanecem pendentes. Nenhuma autorização de lançamento inferida deste plano.
