# Evidências de regressão — PT de 22/10/2026

O ciclo vermelho/verde foi executado nos testes de dinheiro, acesso, ferramentas, produto, indexação, integrações e identidade. Logs detalhados da sessão ficam em /tmp/patri-*.log e não contêm credenciais reais. Os testes e os scripts reproduzíveis estão versionados.

- Dinheiro: estorno parcial de renovação falhou antes da correção por Pagamento desconhecido; valor acumulado, conciliação por charge/invoice, concessão auditada e alteração comercial de preço falharam; passaram após a migration. Reversão e reaplicação testadas no banco descartável.
- Acesso: conta inativa retornava avaliações próprias; domínio externo contendo o caminho de Storage era aceito. Os quatro casos foram reproduzidos e corrigidos. Histórico, rotas e camada API também falharam antes das alterações.
- Ferramentas: comandos ausentes, templates inexistentes, exemplos incompletos, cron e rollbacks ausentes foram detectados pelos testes antes da implementação. Uma quebra proposital de tipo na Edge é detectada pelo typecheck e removida em finally.
- Produto: testes exigiam relatório editorial, calendário, marcador jurídico e fallback de marca; falharam antes das mudanças. As verificações funcionais medem leituras, média em segundos, cliques atribuídos, período e faturamento.
- Indexação: relatório ausente da whitelist, OG ausente e fontes externas bloqueantes foram detectados antes da correção; o teste HTTP de SSR confirma noindex e OG no HTML.
- Integrações: pagamento com chave sem habilitação era permitido e módulo de simulação de e-mail inexistia; os testes falharam antes das alterações. Agora nenhum provedor é chamado por padrão.
- Identidade: contrato sem rota, fallback não presente no HTML inicial e atendimento sem marcador falharam; as verificações passaram após o lote 7. A interface comercial e a validade da concessão também têm regressões próprias.

Os testes adicionais de robustez (negação já existente de escrita direta e consistência de plano) já passavam antes do reforço do trigger; não são apresentados como reprodução de defeito novo. Os bloqueios externos F03/F04/F05/F06 não são declarados homologados por testes simulados.
