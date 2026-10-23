# Retomada PT16 — roteiro de desbloqueio do destino

23/10/2026. **NO-GO preservado.** Preferência recebida: Hostinger; `patrirealty.com.br` ou outro domínio. Isso define candidato e preferência de hospedagem, não domínio definitivo, propriedade comprovada ou plano Node compatível. Projeto Supabase ainda não informado. Base: PT17 commit783497e9c694843e63bc9c78d6aff33048b8f224.

## O que foi adiantado

Revisados servidor SSR, variáveis, callbacks Auth, gateways, configuração local Supabase, cron e worker. Preparado mapa de configuração por ambiente e sequência de ativação. Corrigida orientação de operação antiga que mandava aplicar tudo antes da inspeção do destino. Nenhum segredo acessado, serviço contratado, recurso produtivo criado, migration executada, DNS alterado, job ativado ou piloto publicado. Configuração local não comprova configuração hospedada.

**Achado a resolver no backend:** `supabase/functions/supplier-jobs/index.ts` chama `publicar_agendadas` quando a entrega é ativada, antes de processar outras rotinas. Portanto não ativar esse worker/cron apenas para testar e-mail sem revisar publicação e bloqueios editoriais reais. O manifesto externo do SSR não garante proteção da Data API/RPC, jobs ou Storage. A correção deve ser desenhada e testada contra o esquema do projeto correto; não executar SQL especulativo em outro banco. Isso é trabalho técnico nosso, não informação que o usuário precise inventar.

## Primeiro retorno necessário do titular

Pode responder no chat somente os itens públicos abaixo, inclusive “não existe/não definido”. Não enviar senhas, tokens ou chaves.

| Item | Resposta necessária | Por que destrava |
|---|---|---|
| Domínio | Confirmar se patrirealty.com.br é seu, se será definitivo e quem administra DNS; escolher www ou sem www como primário | Permite verificar DNS/TLS e planejar redirects/canonical. Nenhuma disponibilidade ou propriedade foi presumida |
| Hostinger | Nome/tipo do plano existente e se o hPanel oferece aplicação Node.js ou VPS; liberar conexão da conta quando solicitada | Precisa executar server.mjs continuamente, não apenas publicar dist estático |
| Backend | Nome/ref pública do projeto Supabase destinado à Patri, se existe, e ambiente de homologação separado | Permite inspecionar versão/migrations/permissões antes de qualquer alteração. Não criar/ativar por inferência |
| Operador | Razão social, confirmar CNPJ já informado53.816.326/0001-58, contato de atendimento e privacidade, responsável operacional/suplente | Identidade pública e canal real; validação de dígitos não é confirmação cadastral |
| E-mail | Domínio/remetente pretendido, provedor existente e destinatários de teste autorizados | Define DNS do remetente e testes de entrega, sem campanhas |
| Financeiro | Se Stripe já existe, responsável e disponibilidade de sandbox | Homologação sem cobrança real; se adiado, continua bloqueado o escopo financeiro atual |
| Conteúdo | Onde disponibilizar privadamente o logotipo original, licenças/autorização, fontes/autoria e dados dos fornecedores reais | Habilita revisão editorial e manifesto por versão; não postar textos privados no Git público |

Conectar a Hostinger não exige enviar senha no chat. Na preparação desta sessão não havia servidores MCP Hostinger registrados; o conector precisa ser carregado e autorizado antes de inspecionar conta/plano/domínio. O usuário só precisa reiniciar o aplicativo após o registro e concluir o consentimento oficial quando for aberto. Não existe formulário de segredos aberto nesta retomada.

## Configuração que faremos no destino autorizado

### 1. Hospedagem SSR e domínio

Inspecionar plano, site existente, domínio e DNS antes de escolher qualquer operação. Confirmar suporte ao servidor Node personalizado, comando de início, porta dinâmica PORT, HTTPS/proxy, variáveis de build/runtime, logs, reinício, armazenamento privado persistente para manifestos e artefatos. Compatibilidade do produto contratado ainda desconhecida. Não migrar a WordPress nem converter em site estático para contornar limitação; se não suportar SSR, apresentar opção compatível/custo para decisão antes de contratar.

Build atual: `npm ci` e `npm run build:ssr`; execução `npm start` → node server.mjs. Runtime22 é a versão usada nos testes; conferir suporte e requisitos no provedor. Manter dist, dist-server, server.mjs, módulos server e dependências necessárias ao runtime. Vite é importado pelo servidor: podar indiscriminadamente devDependencies pode quebrar a execução. O pacote de produção não pode conter .env.local, seeds/credenciais locais ou anexos privados dentro do diretório público. Fazer smoke test do artefato realmente empacotado.

Definir VITE_SITE_URL no build e runtime com a mesma origem HTTPS primária, sem caminho/query; SITE_URL nas funções/serviços correspondente. PATRI_ALLOWED_HOSTS apenas hosts necessários do proxy, sem wildcard amplo. Host não autorizado deve continuar421. Não confiar em forwarded-host como canonical. Configurar variantes para redirecionar ao primário depois de verificar DNS/certificados. Staging distinto, PATRI_PREVIEW_MODE=true e senha privada forte, nunca no bundle; desligar modo preview em produção só na liberação autorizada com backend live homologado. Ausência de Supabase faz o servidor operar em demo protegida, não produção.

### 2. Supabase: inspecionar antes de aplicar

Identificar projeto correto, versão Postgres, migrations existentes e dados; criar plano de diferença, backup e compatibilidade, sem reset/db push/seed cegos. `supabase/config.toml` com project_id patri-realty é configuração local, não ID de projeto hospedado. Separar staging/prod e não transportar contas sintéticas. Validar grants, RLS, views, funções SECURITY DEFINER e acesso de visitante/usuárioA/usuárioB/admin. Incluir RPC/Data API/Storage e jobs na equivalência da política editorial/local; proxy sozinho não resolve.

Publicar funções existentes somente depois da revisão e no projeto autorizado: auth-login, account, quotation, newsletter, event, banner-event, criar-checkout, webhook-stripe, supplier-jobs, privacy-jobs, publicar-agendadas. Ajustar autenticação por handler sem trocar verify_jwt cegamente: webhook usa assinatura; workers usam segredo; account verifica usuário/sessão; endpoints públicos validam contrato/antiabuso. Conferir o comportamento real, não apenas o config local.

Auth: origem primária em Site URL e callbacks exatos usados hoje `/area` (cadastro/troca de e-mail) e `/redefinir-senha` (recuperação). Confirmar templates, confirmação, expiração e sessões; sem wildcard amplo produtivo. Configurar SMTP Auth separado da fila Resend da aplicação. Validar proteção nativa `public.verificar_login`, disponibilidade do hook no plano e limitação IP no endpoint Auth direto; gateway/CORS não impedem bypass. Se o plano não suportar o requisito, apresentar solução equivalente e testá-la antes de liberar, sem presumir contratação. [Redirects](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [segurança Data API](https://supabase.com/docs/guides/api/securing-your-api) e [hook](https://supabase.com/docs/guides/auth/auth-hooks/password-verification-hook): documentação consultada em23/10/2026, revalidar suporte no projeto.

### 3. Configuração pública e segredos

[Mapa de variáveis por destino](configuracao-destino-pt16.csv). VITE_ é público e incluído no build; nunca colocar chave privilegiada, senha, salt ou token nesse prefixo. Segredos são inseridos diretamente no cofre/variáveis privadas do provedor correto, por fluxo seguro disponível; basta informar que foram configurados, nunca seus valores. Não copiar toda .env.example para o bundle. Confirmar disponibilidade das chaves e contrato do código, sem converter anon legada em formato diferente sem teste.

URLs de gateways podem usar os defaults das Edge Functions do projeto correto; overrides explícitos ajudam a impedir mistura de ambientes. Não usar localhost, gateway local ou app de prévia como API produtiva. Manifestos PATRI_LOCAL_REVIEW_FILE e PATRI_EDITORIAL_APPROVAL_FILE são arquivos privados absolutos fora do checkout/pasta pública, com persistência e controle de acesso; ausência continua bloqueando publicação. PATRI_EDITORIAL_REVIEW_FILE é outro arquivo, de rascunhos da prévia. Fixtures nunca habilitadas em produção.

### 4. E-mail, CAPTCHA, pagamentos e rotinas

Validar remetente/domínio e DNS indicados pelo provedor: SPF/DKIM e política DMARC apropriada, sem sobrescrever registros existentes por suposição. Auth usa SMTP próprio configurado; fila da aplicação usa Resend. EMAIL_DELIVERY_ENABLED continua desativado até resolver publicação acoplada, provar filas e usar destinatários controlados. Conferir erros/retries/idempotência/entrega/unsubscribe, sem drenar fila antiga indiscriminadamente.

Turnstile: chave pública e segredo separados, hostnames do ambiente exatos; homologar token inválido/expirado, falha de rede e modo de testes no staging; não contornar CAPTCHA em produção. Stripe: somente sandbox autorizado, chaves/assinatura por ambiente, preços reais do catálogo em teste, eventos compatíveis com handler e recibo/ledger reconciliados. STRIPE_ENABLED permanece desativado até revisão e testes. URL de checkout/retorno não confirma pagamento. Cobrança real exige autorização específica.

Inspecionar rotinas já existentes antes de agendar. O arquivo quotation-jobs.sql propõe worker a cada minuto; docs antigas têm outras cadências e o worker também publica. Não executar todas as sugestões juntas nem duplicar cron. Registrar dono, periodicidade, timeout, retry, última execução, alerta e justificativa por rotina; secrets no cofre/Vault. Testar recebimento do alerta e restore isolado, reaplicando exclusões posteriores ao backup; definir RPO/RTO e retenção aprovados, sem inventar metas. Nenhum cron/worker ativado nesta retomada.

## Aprovação do piloto e sequência final

1. Receber domínio/plano/projeto e confirmar escopo de homologação; conferir acesso readonly.
2. Preparar mudanças concretas no ambiente correto, diferenças de banco/backend, proteção editorial e artefato SSR; testar em staging isolado antes de produção.
3. Configurar serviços/segredos no local apropriado; executar Auth, persistência, e-mail, sandbox financeiro, backups e logs autorizados.
4. Receber identidade/documentos revisados e direitos; Tércio avalia fatos, autoria, fontes e cada versão. Pontuação interna≥75 não elimina bloqueio material. Guias nacionais continuam retidos; município exige três identidades econômicas distintas e prova municipal vigente. Não preencher lote com fixtures.
5. Revisar manifesto (hoje seis candidatas/zero prontas), executar SSR/browser/API/sitemap por URL no destino, comparar commit/configuração e atualizar go-no-go com provas e responsáveis nomeados.
6. Obter autorização explícita do destino e lote elegível; só então liberar e iniciar T0 do PT17. Staging permanece protegido. Resolver infraestrutura não aprova conteúdo automaticamente.

## Verificação desta retomada

Contratos e regressões controladas registrados em evidencias-retomada-pt16/qa.json. Não atestam serviço externo. Próxima informação que mais destrava: **confirmação do domínio, acesso à Hostinger/plano e identificação do Supabase**. Demais dados podem ser reunidos em paralelo. Não é necessário enviar todos de uma vez para iniciar inspeção.
