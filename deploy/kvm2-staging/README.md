# Homologação Patri Realty — pacote preparado, não aplicado

**NO-GO. Não executar Compose, instalar vhost ou emitir certificado por aceite deste pacote.** Não houve alteração remota. [Relatório e gates](../../docs/seo/homologacao-kvm2-preparacao.md).

Arquivos: Dockerfile.runtime recebe artefato Linux em runtime/; compose.staging.yaml referencia imagem imutável aprovada; staging.runtime.env.example é vazio; nginx.staging.conf.template é somente candidato aditivo para sites-available. Sem pipeline, instalador, cron, migration ou configuração produtiva.

Antes de usar: revisar segurança host/proxy, obter autorização concreta de staging, criar projeto externo autorizado e resolver gate editorial/backend, confirmar subdomínio/TLS, imagem Node22 por digest e UID/permissões. O diretório reviews deve existir previamente fora /app; create_host_path:false evita criação automática. Manifests faltantes ficam sem caminho configurado; nenhum placeholder vira aprovação.

Imagem de runtime deve conter dist/,dist-server/,server.mjs,server/,package.json e node_modules compatível com Linux/base escolhida. Build por ambiente fora do VPS com npm ci + npm run build:ssr. Vite é dependência usada pelo servidor: não podar devDependencies sem corrigir/testar o contrato. Não copiar node_modules Windows. Não copiar .env*,sources,Git,dumps ou rascunhos. Não há Docker build context com checkout inteiro neste desenho; fornecer somente o diretório runtime sanitizado e Dockerfile após QA.

PATRI_STAGING_IMAGE deve ser image@sha256 com origem/digest verificados; Compose só exige valor não vazio, não autentica imagem. NODE_BASE_IMAGE também exige revisão/digest antes do build. Não use latest ou segredo como build arg. staging.runtime.env real é privado e não deve ficar no Git. Variáveis VITE_ do build e runtime devem corresponder ao projeto/origem de staging. Não iniciar imagem de produção com bundle de outra origem.

Primeira inicialização, quando autorizada: restart:no para não criar laço de falha; health401 prova apenas guard/processo. Senha vazia dá503 e health falha; senha20+ fica no cofre. Docker unhealthy não reinicia sozinho. Antes de expor vhost, testar acesso válido, noindex/cache, assets protegidos, Host421, 404/503 e consultas backend no ambiente controlado. Não desativar prévia nem abrir15175 externamente.

Nginx: inclui sites-enabled/* no host inspecionado. Candidato não é default_server e não altera nenhum vhost existente; não criar alias estático ou fallback SPA. Certificado/diretório de log propostos ainda não existem/foram validados. Não instalar até emitir/validar certificado por procedimento autorizado. access_log off; erro pode conter URI e deve ter acesso restrito/rotação/inspeção sem PII. Não publicar error log bruto. Não fazer envsubst genérico: variáveis Nginx com $ precisam ser preservadas.

TLS1.2/1.3 no candidato não certifica que o listener compartilhado recusará protocolos antigos: parâmetros podem ser escolhidos pelo default server antes do SNI. Como não alteramos default/listener global, isso permanece gate de segurança a testar e resolver com autorização própria. Nenhuma falsa declaração de hardening completo.

Guard de prévia atual usa endereço da conexão e pode ver todos como proxy único; forwarded headers no template não corrigem esse comportamento. Homologar limitação por IP sem confiar em header arbitrário antes do acesso remoto multiusuário. UFW não é garantia suficiente para portas Docker: conferir exposição efetiva IPv4/IPv6 externamente em teste autorizado.

Limites0,75CPU/768MiB/heap384/pids128 são hipóteses, não benchmark aprovado. Não hospedar banco Supabase neste contêiner/VPS. Não configurar pagamento/email/job como consequência de subir o SSR. Testar regressão das aplicações vizinhas antes/depois de futura mudança; rollback só remove rota/contêiner da Patri e restaura versão homologada, sem restart Docker, prune global ou restore do VPS.

Validação desta preparação é estática. Sem Docker/nginx local executados ou instalação de ferramentas; executar docker compose config e nginx -t apenas em etapa autorizada apropriada, sem credenciais em logs. Teste runtime restrito e TLS do host seguem pendentes.
