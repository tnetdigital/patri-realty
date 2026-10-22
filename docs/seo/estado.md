# Estado — prompts 00 e 01

Data: 22/10/2026, referência do usuário America/Sao_Paulo.

- Projeto: Patri Realty, tipo F, diretório de fornecedores com editorial.
- Origem: https://github.com/tnetdigital/patri-realty, branch main.
- Commit auditado: `8102f37f4d53b90bc76f9160f0fa13722885570c`.
- Ambiente desta execução: cópia isolada no Windows, Node 22.19.0, npm 10.9.3; dependências instaladas pelo lockfile com scripts de instalação desativados.
- Prompt 00: concluído — contexto, decisões e continuidade registrados nesta pasta.
- Prompt 01: concluído — leitura de código, inventário, HTTP público, SSR controlado, verificações e backlog.
- Status do produto: pronto para revisão do diagnóstico; lançamento e expansão bloqueados pelos achados descritos no relatório.
- Nenhum arquivo versionado da aplicação foi alterado. Sem commit, push, deploy, mudança de configuração remota, migração ou gravação em banco.
- Os arquivos desta pasta são documentação local nova, não enviada ao GitHub. Builds e dependências são artefatos ignorados na cópia de auditoria.
- Próximo passo proposto: Prompt 02, proteção da prévia e dos rascunhos. Não foi executado.

## Documentos consultados

AGENTS.md deste projeto MPI e do repositório; AGENTE_MESTRE_MPI.md; relatório MPI v3; Documento Mestre v5.1 e Playbook 1.1 encontrados em Downloads; especificação da Patri; README; arquitetura; aceite; decisões; lançamento; documentação editorial, de cadastro e de filtros; código e testes pertinentes.

As referências completas e hashes estão em `../../../diagnostico-patri-2026-10-22/referencias.json`. O arquivo local chamado “Documento Mestre v5” contém efetivamente a versão 5.1 de 22/10/2026.

## Limites

Sem backend produtivo identificado/configurado nesta cópia, sem Docker disponível no PATH, sem credenciais reais, sem acesso ao GSC/Bing/CDN de produção. Nenhuma prova atual de persistência, RLS ou entrega de e-mail foi obtida. A inspeção visual pela ferramenta de navegador falhou ao anexar a prévia; verificações mobile, hidratação e sobreposição ficam não testadas nesta rodada. Os GETs HTTP e os assets públicos foram obtidos normalmente.

## Continuidade

Leia `decisoes.md`, `auditoria-atual.md`, `backlog.md`, `evidencias.md` e `inventario-rotas.csv` antes de qualquer correção. Revalidar o commit remoto e o estado Git antes de iniciar trabalho futuro; este diagnóstico é um retrato do commit e do horário registrados nas evidências.

## Atualização — Prompt 02

Implementação local validada em 22/10/2026. Ver prompt02.md para escopo, testes, limites e estado de publicação. O usuário determinou manter o repositório público, sem reescrever o histórico. Rascunhos retirados da árvore atual após cópia privada verificada. A publicação protegida depende da entrada da senha no formulário seguro do provedor; não presumir que a URL antiga já esteja protegida.
