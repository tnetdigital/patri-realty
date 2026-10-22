# Dependências e riscos — 22/10/2026

Auditoria inicial: 37 vulnerabilidades (2 críticas, 13 altas, 22 moderadas), em ferramentas de desenvolvimento. Vitest, Lighthouse e Tailwind atualizados com suas dependências. Auditoria após atualização: zero vulnerabilidades. Repetir `npm audit` no CI; novas publicações de advisories podem alterar o resultado.

A homologação externa, DNS, e-mail, pagamento, proteção de login na borda e backups dependem de credenciais e configuração do destino. Não foram ativados em produção.
