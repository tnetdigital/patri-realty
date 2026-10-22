# Lote 3 — ferramentas e operação

- Auditoria de dependências: zero vulnerabilidades após Vitest 5, Lighthouse 13 e Tailwind 4.
- Checagem TypeScript inclui todas as entradas Edge; teste negativo injeta um tipo inválido e exige falha.
- ESLint ativo; contratos de ambiente e arquitetura verificados.
- Templates de e-mail extraídos, payload tipado, logs de rotina sem dados pessoais e contagem administrativa.
- Cron condicional, um arquivo por tarefa, sem instalar extensões. Destino ainda não configurado. Os horários SQL executam como serviço; a função executar_rotina permite execução com captura de falhas e whitelist. Workers externos dependem de Vault/pg_net.
- Reversão completa em patri_rollback_test passou. Reversões de tabelas são destrutivas e exigem backup fora de testes; não foram executadas no banco de operação.
- 438 verificações SQL, 30 unitários, 37 verificações HTTP/arquitetura, SSR e checagens locais. Fluxos de navegador repetidos para acomodar a nova Área do síndico e isolar o limite sintético de IP local; rodada integral final registrada no relatório.
