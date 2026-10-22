# Estado — prompts 00 e 01

## Estado mais recente — Prompt 06

Prompt05 aprovado; grafo semântico implementado em22/10/2026, mantendo stack e banco. Relatório prompt06.md; builders comuns SSR/cliente e exemplos isolados. Testes121unitários,60HTTP,14grafo/navegador,22SEO,17gate e12proteção aprovados, builds/typecheck/lint e scanners aprovados. AggregateRating suprimido conservadoramente; notas públicas preservadas. Nenhum fornecedor, conteúdo, aprovação ou localidade real criado. Sem deploy por quota AppDeploy anterior pendente; documentação/código no GitHub para análise. Registros abaixo são históricos.

## Estado mais recente — Prompt 05

Prompt 04 aprovado; Prompt 05 executado em 22/10/2026. Estratégia em estrategia.md, matriz-mpi.csv com 26 oportunidades, auditoria de 150 especialidades, dez consultas exploratórias e relatório prompt05.md. Piloto proposto: MPI-002/004/006. Aplicação, banco e indexação preservados; zero liberações municipais. Oferta e capacidade editorial produtivas não comprovadas. Sem deploy; limite e diferença da prévia do Prompt 04 preservados. Registros abaixo são históricos.

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

Publicação do Prompt 02 confirmada: snapshot 1792708424157 pronto; entrada pública restrita, tentativa inválida recusada online e bundle antigo de rascunhos bloqueado (403). Formulário mobile e recarga aprovados. Estado final e limites em prompt02.md. GitHub público, com histórico preservado e árvore atual sem o pacote editorial.

## Prompt 03 — execução aprovada

Prompt 02 aprovado pelo usuário; Prompt 03 implementado, testado e publicado na demonstração protegida em 22/10/2026. Política compartilhada src/seo/policy.ts versão 2026-10-22.03; relatório docs/seo/prompt03.md. 67 unitários, 60 HTTP/regressões, 22 verificações SSR e 12 de proteção aprovados; cinco comparações de hidratação em navegador. Snapshot 1792709705332. Stack e banco preservados. SSR público de produção e Quality Gate do Prompt 04 continuam pendentes; não liberar indexação produtiva por este aceite técnico.

## Prompt 04 — Quality Gate municipal

Prompt 03 aprovado; Prompt 04 implementado e testado em22/10/2026. Rubrica interna patri-local-2026-10-22.04, mínimo75 mais bloqueios absolutos. Contagem por identidade econômica distinta e cobertura municipal exata, perfis públicos frescos; ausência de provas mantém noindex. Gate comum a SSR/cliente/sitemap/links. 103unitários,60HTTP/regressões,17cenários do gate,22SSR e12proteção aprovados. Relatório prompt04.md. Nenhuma aprovação real ou liberação municipal foi criada; Supabase e homologação produtiva continuam adiados. Prévia protegida atualizada, snapshot1792711230117.


- Limite de publicação do Prompt04: AppDeploy recusou a última sincronização com CREDITS_USAGE_LIMIT_REACHED. Snapshot publicado1792711230117 contém o gate; código final testado103unitários permite aceite pendente com campos nulos, mas esse último ajuste não está na prévia. Não repetir deploy enquanto limite estiver ativo. Relatório prompt04.md registra a diferença; não remover senha nem criar outro app para contornar.
