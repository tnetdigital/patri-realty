# S00 — recuperação e acesso alternativo: verificação readonly

23/10/2026. **Parcial, pendente. NO-GO preservado.** Sem correção ou mudança de serviço. Detalhes de backups/acessos e etiquetas de chaves em anexo privado externo ao repositório: `output/patri-realty-private/s00-recuperacao-kvm2-20261023.md`.

## O que foi comprovado

Painel autenticado mostra backups automáticos semanais existentes. Nova sessão do console respondeu à consulta de identidade administrativa. A página de recuperação informa modo de emergência inativo; não ativado. A conta lista chaves SSH, sem abrir seus conteúdos. Foram consultados somente metadados restritos de usuários/grupo e contagem de entradas autorizadas, sem revelar material de chave ou segredos.

Isso comprova acesso atual e presença de cópias, não login nominal alternativo, independência do console, integridade de backup, recuperação de boot ou restauração funcional. Não foram simuladas falhas de acesso nem testado restore. Nenhuma chave/usuário/senha/sudo, firewall, TLS, snapshot, cron ou serviço criado/alterado.

## O que permanece pendente

| Requisito | Prova disponível | Falta para concluir |
|---|---|---|
| Acesso atual | Sessão de console válida | Dono, suplente, recuperação da conta e alternativa legitimamente autorizada |
| Acesso alternativo | Metadados consultados; titularidade das chaves não confirmada | Identidade nominal, chave sob custódia do operador, login independente e privilégio testados |
| Backup | Cópias e frequência exibidas pelo provedor | Consistência por aplicação/banco, retenção/custódia e cópia independente quando definida |
| Recuperação | Mecanismo disponível no painel, sem ativação | Destino isolado e procedimento autorizado, prova de restauração e validação dos serviços |
| Continuidade | Roteiro preparado | Responsáveis, disponibilidade, RPO/RTO, ordem de recuperação e critérios de interrupção |

## Confirmações necessárias do titular

1. Operador principal, suplente e autorizador de interrupções/restauração; donos dos serviços compartilhados.
2. Quem controla a conta Hostinger e sua recuperação/MFA, sem compartilhar senha ou códigos; como o suplente acessará legitimamente.
3. Quais identidades/chaves são reconhecidas e quem as utiliza; automações dependentes e eventual usuário nominal existente. Etiquetas detalhadas estão no anexo privado; nenhuma revogação proposta sem conciliação.
4. Se há cópias fora deste VPS e quem as mantém: destino privado, frequência, retenção, criptografia, último sucesso e dados abrangidos. Pode informar “não existe” ou “não sei”.
5. RPO (perda máxima de dados tolerável) e RTO (tempo máximo de indisponibilidade tolerável), por serviço, além de prioridade e janela.
6. Ambiente isolado disponível para prova de recuperação e data/evidência do último restore. Não presumir suporte a clone/importação em outro VPS sem conferir.

Não enviar chaves privadas, senhas, tokens, códigos MFA ou dumps ao chat/Git. Contatos e evidências operacionais devem ficar em local privado autorizado. Nomes de operadores não serão publicados por inferência.

## Antes de qualquer correção

Concluir atribuição/custódia → conciliar acesso sem revogar → validar alternativa em sessão independente autorizada → documentar backups/RPO/RTO → preparar teste isolado com destino identificado → autorizar e comprovar recuperação → avaliar diff de acesso/rede. Nenhuma ação dessa sequência foi inferida como autorização para criar recursos ou acessos.

Restore completo sobrescreve o conteúdo atual do VPS; não é um teste seguro no host compartilhado. [Documentação oficial](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/). O tempo indicado no painel é estimativa, não RTO validado. Backups separados do disco não comprovam custódia independente da conta/provedor. Frequência semanal não define automaticamente uma perda aceitável.

Modo de emergência disponível não equivale a recuperação testada e pode afetar o funcionamento normal. [Referência oficial](https://www.hostinger.com/support/5726577-how-to-use-emergency-mode-on-your-vps-at-hostinger/). Não foi ativado. Fontes consultadas em 23/10/2026.

## Aceite desta rodada

Leitura concluída no escopo; S00 **não aprovado**. Estado atualizado no [plano de segurança](plano-seguranca-kvm2.json) e [evidências sanitizadas](evidencias-s00-kvm2/qa.json). Não há teste funcional de aplicação novo porque não houve alteração. Próximo passo: receber as confirmações e preparar o procedimento concreto de prova de acesso/restore, sem alterar serviços para descobrir se funciona. [NO-GO vigente](go-no-go.md).
