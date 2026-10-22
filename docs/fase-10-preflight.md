# Fase 10 — implementação e publicação

Autorizada pelo usuário após o aceite da fase 9.

## Implementação
- Conta: editar nome, confirmar novo e-mail, trocar senha; exportação própria e anonimização com reautenticação.
- Institucional: sobre, fornecedores, termos e privacidade versionados; identificação jurídica pendente dos dados do operador.
- Consentimento: nenhuma análise antes de aceite, revogação imediata e escolhas equivalentes.
- Segurança: RLS, sessões revogadas, último admin protegido, endpoints autenticados, validação e limites.
- Verificar os cinco fluxos existentes, privacidade, SSR e mobile; preparar roteiro de produção.

## Preflight AppDeploy
- Ler snapshot e publicar somente arquivos novos/alterados no mesmo app_id.
- HashRouter; sem .env, service role, tokens, backend ou credenciais locais no bundle.
- TypeScript/React legível, strings simples; sem emojis, mobile first.
- Cinco testes JSON, exatamente um sanity; conciliar os fluxos novos com cobertura existente.
- Build e testes pertinentes aprovados; validar JSON exato e ausência de arquivos repetidos.
- Aguardar status terminal, revisar erros e conferir a URL pública.
- Prévia demonstrativa não equivale a backend produtivo, homologação Stripe ou revisão jurídica.

Preflight aprovado para a prévia: build cliente/SSR,35 cenários,411 SQL,30 unitários,24 HTTP; suíteJSON validada com5 testes/1sanity; nove arquivos novos/alterados enviados, sem credenciais/backend. Snapshot1792622928007 ready, logs sem erros e dois fluxos públicos aprovados. O lançamento produtivo permanece bloqueado, conforme launch:check e docs/lancamento.md.
