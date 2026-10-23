# PT16 — inspeção readonly e configuração candidata de homologação

23/10/2026. **PREPARADO, NÃO APLICADO; NO-GO preservado.** Base4f32af66b30661b6ad89da5c2db37b2026f05d60. Mantidos React/Vite/TypeScript, SSR Node, Supabase externo e serviços atuais.

## Inspeção executada

Console hPanel autenticado do KVM2, exclusivamente leitura: versões Docker/Compose/Nginx, recursos cgroup/security, diretivas selecionadas de Nginx (listeners,nomes,includes,certificados/logs), estado/regras UFW, parâmetros SSH efetivos e conflitos de portas/diretórios. Não coletados ambientes de aplicações, chaves, senhas, arquivos integrais de configuração, dados de usuários ou conteúdo de logs.

Docker29.1.3 e Compose2.40.3; cgroupsv2/systemd, AppArmor/seccomp builtin disponíveis. Nginx1.24.0Ubuntu, includes de conf.d e sites-enabled, múltiplos vhosts/certificados Certbot já existentes. Versão curta não demonstra vulnerabilidade ou ausência de backports. Não havia referência ao domínio Patri nos sites-enabled lidos. Portas15175/15176 sem listener no instante; diretórios propostos da Patri não existiam. Nada foi reservado/criado.

Há pendências de segurança em autenticação administrativa, superfície de rede, TLS compartilhado e manutenção do SO. Detalhes técnicos do host e de outros sites foram preservados em anexo privado externo ao Git, sem publicar mapa de acesso/vulnerabilidades no repositório público. Não houve teste externo de exploração, varredura de portas ou tentativa de login. Configurações presentes não provam exposição real; caminhos específicos precisam homologação.

A leitura foi seletiva e não expandiu recursivamente todos os includes. nginx -t/-T não foram executados; não houve reload/restart ou cópia de configuração para o servidor. Não alterado SSH, firewall, Docker, Nginx, DNS ou certificado. Nenhum apt update/upgrade, instalação, upload, criação Supabase, job ou cobrança. Não é auditoria completa de segurança.

## Pacote candidato

[Diretório para revisão](../../deploy/kvm2-staging/README.md):

- Dockerfile.runtime: imagem runtime Node22 por digest ainda a selecionar; recebe somente artefato Linux sanitizado produzido fora do VPS; usuário10001 sem root.
- compose.staging.yaml: um SSR, publicação127.0.0.1:15175→5175, preview obrigatório, filesystem readonly, capabilities removidas, no-new-privileges, tmpfs e manifestos RO, limites propostos e restart:no para primeira homologação. Arquivo JSON compatível com sintaxe YAML; sem instalação de parser/dependência.
- staging.runtime.env.example: campos vazios; segredo real somente em arquivo/cofre privado. Sem service_role, salts ou segredos financeiros no SSR.
- nginx.staging.conf.template: candidato aditivo para previa.patrirealty.com.br, proxy para porta loopback, sem default_server, alias estático, cache, fallbackSPA ou interceptação de erros. Authorization preservada. Não habilitado.
- .gitignore/.dockerignore: excluem ambiente real, runtime/contexto privado e artefatos indevidos; lista de exclusão não substitui revisão do pacote.

Certificado, domínio/subdomínio, paths, imagem/UID, logs e backend ainda precisam configuração autorizada. TLS do vhost não é prova de negociação segura do listener compartilhado: revisar contexto/default server e testar antes de expor. Não incluir vhost com certificado ausente, nem usar um certificado de outro projeto. Guard atual pode enxergar proxy como IP único; configuração de forwarded headers não altera essa limitação por si só.

Sem Dockerfile que instale dependências no VPS; nenhum build ou execução da imagem foi realizado. Limits0,75CPU/768MiB/heap384/pids128 seguem hipóteses a medir. Supabase não é instalado no VPS. SMTP, e-mail, pagamentos e cron não são ativados pelo pacote.

## Validação local

[QA estático e cinco cenários simulados do probe](evidencias-homologacao-kvm2/config-qa.json): JSON/estrutura, loopback, usuário/restrições, montagem privada sem auto-create, preview forçado, limites, segredo vazio, proxy sem bypass e preservação de autenticação/status. Probe só aceita401 com noindex e challenge; rejeita200,503 e401 sem headers necessários. Isso comprova lógica do probe, não runtime real.

Regressão existente de prévia:5testes de acesso+15cenáriosHTTP aprovados nesta execução. Tipagem/build da aplicação não repetidos porque não houve alteração funcional. Não executado Docker Compose config, build de imagem, contêiner Linux ou nginx -t: Docker/Nginx de validação não disponíveis localmente; não instalados para contornar. Validar essas camadas no estágio autorizado apropriado permanece obrigatório. Health Docker não comprova backend nem reinicia contêiner automaticamente.

## Pendências antes de aplicar

| Gate | Trabalho necessário | Responsável proposto |
|---|---|---|
| Segurança host | Rever achados privados com acesso de recuperação, backups e donos; aprovar diff de ajustes sem risco de bloqueio/queda | Titular + operação |
| Proxy/TLS | Completar includes relevantes, listener/default, certificado/subdomínio e logs privados; validar sintaxe e handshake | Operação |
| Artefato | Escolher digest Node22 atualizado, construir Linux fora do VPS, verificar origem/segredos, executar sob limites e UID/RO | Operação |
| Backend | Criar projeto autorizado; gate RLS/RPC/Storage/cron/editorial e Auth direto equivalentes antes de expor | Operação + Tércio |
| Homologação | Autorizar escopo staging; validar portas/exposição, senha, cache, SSR/SPA/APIs e regressão dos vizinhos | Titular + operação |
| Lançamento | Oferta, direitos, aprovação por versão, conversões, observabilidade/restore e todos os gatesPT16 | Titular + Tércio + operação |

Não pedir senha no chat; não desativar proteção para realizar QA. Aprovar o desenho não autoriza instalar, recarregar proxy ou publicar piloto. A primeira intervenção futura deve ser um diff concreto e limitado ao staging, com plano de recuperação e autorização. Segurança do host pode exigir uma etapa própria antes dessa intervenção.

## Reversão prevista

Preservar releases/configuração e estado anterior, retirar apenas vhost/contêiner da Patri caso uma futura mudança falhe e revalidar serviços atuais. Sem docker prune global, restart do daemon, restore integral do VPS ou rollback destrutivo de banco. Não restaurar aprovações expiradas. [Desenho e sequência completos](implantacao-kvm2.md); [go/no-go](go-no-go.md).
