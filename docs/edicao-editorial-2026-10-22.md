# Edição editorial — 22/10/2026

Entrega solicitada pelo usuário: conteúdo de alta renda para revisão antes da produção. Foram preparados 12 artigos completos: lançamento Almaz/Ibirapuera, gestão condominial, Bosco Verticale como caso sustentável, sustentabilidade condominial, BIM/inovação, curadoria Michelin e seis perfis individuais.

Hotéis: Cheval Blanc Paris, Passalacqua e Hôtel du Cap-Eden-Roc, com três Chaves. Restaurantes: Osteria Francescana, El Celler de Can Roca e Le Louis XV, com três Estrelas. Curadoria internacional assumida após consulta opcional sem resposta; não é top 3 mundial oficial.

Conteúdo, fontes, 36 FAQ, 36 verbetes, SEO, legenda social, fotos e licenças estão em `content/editorial/2026-10-22/`. O README do lote descreve as decisões de apuração e integração futura. O pacote portátil inclui 12 Markdown, 13 HTML, 11 fotografias e registro de licenças. Arquivo externo ao repositório: `/workspace/patri-realty-editorial-2026-10-22.zip`.

Prévia: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/previa-editorial

Snapshot 1792684146084 pronto. Arquivos novos isolados, rotas adicionadas em App, CSS próprio, sem substituir CSS global compilado, credenciais ou lógica demonstrativa. Textos reais separados dos exemplos fictícios. A rota é noindex e não altera o banco/CMS de produção. Download JSON disponível no índice. HTML portátil sempre noindex. JSON-LD tem gerador separado que exige domínio e data reais; integração produtiva ainda não executada.

Verificação: build e TypeScript aprovados; lint aprovado; 33 testes existentes aprovados. Conferência Playwright dos 12 artigos: carregamento das fotos, FAQ, fontes, noindex, filtros/estado vazio, download válido, artigo inexistente com recuperação e ausência de rolagem horizontal em 320/375/1280px. Script `scripts/test-editorial-preview.mjs` aceita `EDITORIAL_PREVIEW_URL` para conferir o endereço publicado com HashRouter.

A plataforma manteve o aviso anterior de logotipo original ausente e recomendou limitar testes a 3–5; o sexto cenário foi adicionado à suíte existente sem apagar a cobertura das fases anteriores. Nenhuma reconstrução do logotipo foi introduzida.
