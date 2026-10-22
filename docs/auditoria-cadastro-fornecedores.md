# Auditoria do cadastro de fornecedores — 22/10/2026

O fluxo real foi exercitado no ambiente local integrado com Auth, PostgreSQL/RLS, Storage e Mailpit. A demonstração pública foi testada separadamente, no celular. A prévia continua sem criação de contas reais: falta configurar e homologar autenticação pública, CAPTCHA e entrega de e-mail no ambiente de produção.

## Cobertura do fluxo

| Etapa | Verificação |
| --- | --- |
| Entrada | URL com tipo=fornecedor seleciona o cadastro empresarial; CTA de Para fornecedores leva ao mesmo formulário. |
| Dados obrigatórios | Nome, e-mail, senha, empresa, CNPJ e WhatsApp; consentimento obrigatório; newsletter opcional. |
| Validações | CNPJ e senha inválidos; CNPJ duplicado no servidor; contato indevido em Sobre; envio incompleto. |
| Conta | Cadastro real local, e-mail de confirmação no Mailpit, confirmação, login, logout e retorno ao painel. |
| Perfil | Cinco etapas, salvamento, retomada, especialidades, atendimento por região, conteúdo e prévia. |
| Arquivos | Upload real de logo e capa no Storage local; recorte e persistência no celular. |
| Revisão | Envio para análise, bloqueio de edição durante análise, aprovação administrativa e página pública. |
| Equipe | Convite por e-mail de teste, conta do editor e confirmação; editor não gerencia equipe; limite/revogação na demonstração. |
| Permissões | Visitante sem acesso ao painel/admin; fornecedor sem acesso administrativo; RLS e alterações por RPC. |
| Resiliência | E-mails locais executados sem bloquear a fila HTTP de login; regressão de parâmetros do roteador. |

## Correções

1. AuthPage usava `location.search`, que não lê a query de uma rota HashRouter. Passou a usar `useSearchParams`, incluindo o parâmetro de convite. Duas regressões verificam os campos apresentados para fornecedor e síndico.
2. O CTA de Para fornecedores enviava ao cadastro genérico. Agora inclui `tipo=fornecedor`.
3. O gateway local disparava o worker de e-mail com `spawnSync`, bloqueando o event loop e atrasando um login concorrente. Agora usa processo assíncrono, com execução única e agrupamento de chamadas pendentes. O código de produção das Edge Functions não foi substituído por esse harness.
4. A suíte comercial passou a conferir o contrato salvo, um resultado persistente, em vez de depender de uma mensagem intermediária. A suíte de newsletter aguarda o recebimento efetivo do e-mail, pois ele é assíncrono.
5. Foram adicionados templates sem credenciais e `local:init`: um clone novo gera credenciais aleatórias; configuração existente é preservada e configuração parcial é recusada. `.env` e arquivos locais gerados ficam fora do Git.
6. Atualizados o estado do projeto no README e o contrato de ambiente do teste editorial.

## Evidências

- 454 assertivas SQL/RLS aprovadas, em banco de testes isolado.
- 55 testes HTTP/regressões aprovados.
- 35 testes unitários, incluindo duas regressões de roteamento, aprovados.
- Quatro cenários reais focados de autenticação, perfil e orçamento aprovados; o fluxo completo de fornecedor também é executado em largura de 375 px.
- Três cenários da demonstração executados no endereço público: persistência e envio; validações e equipe; imagem e responsividade.
- Duas conferências adicionais na publicação: cadastro empresarial pela URL e CTA institucional. Criar conta permanece desabilitado sem os serviços configurados.
- Build cliente/SSR, TypeScript, lint e contrato de ambiente conferidos.
- Configuração de clone novo validada sem reutilizar credenciais: geração, Docker Compose válido, repetição idempotente e recusa de configuração incompleta.

A rodada completa final de navegador e a referência do commit publicado são registradas no fechamento abaixo.

## Prévia e GitHub

Prévia corrigida: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/cadastrar?tipo=fornecedor

Demonstração interativa: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/demonstracao

Snapshot AppDeploy 1792685415144 pronto. O logotipo original continua pendente como antes; não foi recriado.

Repositório criado pelo usuário: https://github.com/tnetdigital/patri-realty — visibilidade pública. A integração inicialmente não tinha permissão para criar o repositório; a criação foi feita pelo usuário e o acesso ficou disponível depois.

O histórico local antigo continha valores de credenciais do harness em versões anteriores de arquivos. Para não publicá-los, o envio inicial ao GitHub usa uma raiz limpa com a árvore atual revisada. O histórico anterior fica preservado somente na branch local `local-history`; não enviar essa branch nem as tags antigas. As credenciais reais desta sessão e os arquivos gerados não integram o snapshot enviado. Não houve publicação de produção.

## Para habilitar cadastros reais na internet

Configurar o Supabase de destino e suas migrations/RLS/Storage, as URLs de retorno do domínio definitivo, confirmação de e-mail e SMTP verificado, Turnstile e o endpoint de login com os limites aplicáveis. Depois repetir o fluxo de ponta a ponta nesse destino, incluindo entrega de e-mail fora do Mailpit. As demais pendências de lançamento estão em `docs/lancamento.md` e no comando `npm run launch:check`; pagamentos não são pré-requisito para testar um cadastro gratuito, mas seguem pendentes para o lançamento comercial correspondente.

## Fechamento da verificação

A rodada final completa passou nos 35 cenários Playwright, em 2 minutos, sem falhas ou cenários pulados. O cenário completo de fornecedor executou em viewport de 375×812. As falhas observadas nas rodadas iniciais foram investigadas e corrigidas antes desse fechamento: bloqueio síncrono do gateway local, dependência de mensagem intermediária e consulta ao e-mail antes da entrega assíncrona. Não foram removidos cenários nem relaxadas regras de negócio para obter o resultado.

Resultado consolidado: 35 unitários, 454 SQL, 55 HTTP e 35 E2E aprovados. Build cliente/SSR, TypeScript, lint e contrato de ambiente aprovados. Prévia pública conferida em três fluxos de demonstração e duas entradas de cadastro. O código foi preparado para importação inicial no GitHub com histórico limpo; o estado final do envio é verificável em `origin/main`.
