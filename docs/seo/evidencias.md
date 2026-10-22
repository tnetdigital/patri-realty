# Evidências — execução dos prompts 00 e 01

Data de referência: 22/10/2026. Commit: `8102f37f4d53b90bc76f9160f0fa13722885570c`.

Os arquivos brutos foram salvos **fora da árvore da aplicação**, em `../../../diagnostico-patri-2026-10-22/`. A documentação desta pasta é local; nada foi enviado ao GitHub.

## Provas e resultados

| Arquivo | Verificação | Resultado/limite |
|---|---|---|
| `http-publico.json` | GET anônimo de sete URLs/representações na prévia | HTML estático, soft 404, robots restritivo, sitemap 403, Markdown ausente |
| `preview-root.html` | HTML inicial realmente obtido | Sem H1/canonical/JSON-LD; raiz vazia |
| `inventario-estatico.json` | Rotas declaradas, configuração local e recurso JS | Base do inventário; não prova inventário de fornecedores reais |
| `preview-bundle.js` | Asset principal referenciado pelo HTML | Contém referência ao chunk editorial e HashRouter |
| `editorial-bundle.json` | Leitura anônima do chunk editorial referenciado | HTTP 200, 89.173 bytes, 12 slugs de rascunhos encontrados |
| `preview-editorial-bundle.js` | Conteúdo do recurso público, preservado localmente | Comprova distribuição dos dados dos rascunhos; não foi re-publicado |
| `ssr-memoria.json` | Render compilado com fetch interceptado | 15 cenários + falha; inclui cidades com 0/1/2/3, UTM, inválidas e schema |
| `ssr-servidor-windows.json` | Servidor real em modo demo, GET local | 404 básico funciona; assets 403 Windows; canonical mantém UTM |
| `ssr-http-fixtures.json` | Servidor real, ramo live, backend sintético interceptado | Cidade vazia indexável, UTM noindex, rota excedente 200, sitemap sem gate, backend 503, Markdown ausente |
| `build-ssr.log` | `npm run build:ssr` | Exit 0, cliente e servidor compilados |
| `typecheck.log` | `npm run typecheck` | Exit 0, frontend e Edge |
| `lint.log` | `npm run lint` | Exit 0 |
| `unitarios.log` | `npm test` | 35/35, dez arquivos |
| `http-regressoes.log` | `npm run test:http` | 54/55; spawn npx falha no Windows, não erro de tipo do produto |
| `npm-audit.json` | `npm audit --json --fetch-retries=0 --fetch-timeout=20000` | Zero vulnerabilidades reportadas |
| `secret-scan.log` | `node scripts/scan-secrets.mjs` | Nenhum padrão reconhecido na árvore versionada; não é busca universal/histórica |
| `launch-readiness.log` | `node scripts/launch-readiness.mjs` | 25 pendências na cópia sem configuração; não prova estado de infraestrutura remota |
| `fontes-localizadas.json` | Arquivos e linhas do commit auditado | Localizadores dos achados de código |
| `fatos.json` | Contagens e dimensões aferidas | 150 especialidades, 11 grupos, 5.571 registros municipais, 12 rascunhos etc. |
| `referencias.json` | Caminhos e hashes das referências | Mestre v5.1/Playbook/manual/PDF identificados |
| `tracked-baseline.json` | Hashes anteriores de 443 arquivos versionados | Usado na prova de preservação |
| `preservacao.json` | Comparação final da árvore versionada | Resultado final após salvar documentação nova |
| `github-ci.json` | Metadados da execução Quality lidos via conector | Sucesso no mesmo commit, em Linux/Node 24; não é homologação produtiva |

## Reproduzir os testes complementares

Os scripts ficam em `../../../diagnostico-patri-2026-10-22/`, não foram incorporados à aplicação. Exigem a mesma estrutura de diretórios e build SSR pronto. São instrumentos desta auditoria; seus dados são sintéticos e não publicáveis.

- `http_audit.py`: somente GETs anônimos ao host de prévia já conhecido; grava respostas/resumos locais.
- `static_audit.py`: leitura de árvore Git e do recurso público referenciado; gera baseline.
- `ssr_audit.mjs`: render em memória com chamadas bloqueadas fora de audit.invalid; inicia servidor local controlado, faz GETs e encerra o processo.
- `preload-backend.mjs` e `server_live_audit.mjs`: interceptam o transporte do backend no processo filho; sem banco real, contas ou escrita.
- `make_inventory.py`: lê arquivos e evidências, gera inventário e contagens locais.

No primeiro teste do preload de auditoria houve erro de URI de arquivo no Windows. O instrumento externo foi corrigido para usar file URL e o teste foi repetido com sucesso. Esse erro do instrumento não foi registrado como defeito da aplicação. A falha de assets 403 e o ENOENT da suíte existente são problemas distintos, reproduzidos no código do projeto.

## CI remoto observado

Conector GitHub retornou a execução `39825510665`, workflow Quality, branch main, commit auditado, status completed e conclusion success. Criada em 22/10/2026 17:45:44 UTC; atualização final 17:46:29 UTC. [Abrir execução](https://github.com/tnetdigital/patri-realty/actions/runs/39825510665).

O workflow declara Ubuntu/Node 24 e roda tipagem, lint, contratos, scanner, testes, build e npm audit. Não contempla a homologação real de SSR hospedado, GSC, banco/serviços externos e mobile completo.

## Não executado

- Integrações SQL/RLS, testes de cadastro/pedidos com escrita, E2E contra banco, migrações/rollbacks, criação de projeto Supabase e alteração de papéis.
- Compras, e-mails, newsletter, leads, formulários ou alteração de conteúdo no ambiente público.
- Acesso às propriedades GSC/Bing, WAF/CDN, logs de crawler verificado, DNS do domínio definitivo, cron, backup ou revisão jurídica.
- Nova medição Lighthouse/CrUX; inspeção visual e hidratação real não concluídas por indisponibilidade da ferramenta de navegação.
- Commit, push, merge, mudança de visibilidade do repositório, reescrita de histórico ou deploy.

Foram instaladas dependências, produzidos builds ignorados e executados testes na cópia isolada. A suíte existente de tipagem cria uma fixture temporária e a remove; nenhum arquivo versionado da aplicação foi alterado. O limite relevante é preservação do código/configuração e ausência de escrita em serviços reais, comprovados no encerramento.
