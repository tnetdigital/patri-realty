# Fase 4 — checklist de implementação e publicação

- [x] Formulário público, validação, aceite, destinatários opcionais e retorno visível.
- [x] Edge Function com CAPTCHA, honeypot, tamanho limitado, IP derivado no servidor e 5 pedidos/hora.
- [x] Transação atômica com idempotência, consentimento, leads e fila de e-mails.
- [x] Painel com status, filtros, contatos, linha do tempo e notas internas.
- [x] Alerta de 48h com lembrete único; worker protegido e receita de agendamento.
- [x] Demonstração identificada, com persistência, simulação de prazo e limpeza confirmada.
- [x] Cobertura distribuída nos cinco testes da prévia, incluindo validação e proteção de acesso.

## Preflight AppDeploy

- [x] app_id existente, React/Vite frontend-only e HashRouter preservados.
- [x] Snapshot atual lido antes das alterações; publicar apenas arquivos novos/alterados.
- [x] Fontes legíveis e formatadas; sem SDK ou APIs do AppDeploy desnecessárias.
- [x] Sem credenciais, .env.local, arquivos Docker, server/Edge code ou dados reais no upload.
- [x] Nenhum arquivo binário novo do usuário; nenhum slot de recurso necessário.
- [x] Testes JSON válidos, cinco testes e exatamente um sanity.
- [x] Build, PostgreSQL/RLS, HTTP, Playwright local e prévia móvel passaram.
- [x] Rotas existentes e painel da fase 2 preservados.

A prévia simula o orçamento somente no navegador. Backend, e-mail real, Turnstile e cron definitivos dependem de configurar o ambiente de produção. O frontend não anuncia um envio real na demonstração.
