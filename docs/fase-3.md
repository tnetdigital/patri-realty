# Fase 3 — Guia público

Aprovação recebida: “Fase dois aprovada, pode executar a próxima”. Entrega em 20/10/2026.

## Implementação

- Guia `/guia`, especialidade `/guia/:segmento`, especialidade/localidade `/guia/:segmento/:uf/:cidade`, busca `/busca?q=` e perfil `/fornecedor/:slug`.
- Busca por nome, descrição e especialidade, normalização de acentos, aproximação por trigramas no banco, cobertura por cidade ou estado inteiro; ordenação por relevância/nome, 24 registros por página. Filtros persistem na URL.
- Busca e especialidades na home, navegação no cabeçalho, resultados vazios, falhas recuperáveis e páginas não encontradas.
- Perfil com serviços, fotos, FAQ, certificações informadas, cases, vídeo YouTube, localização, contatos públicos e empresas semelhantes. Seções sem conteúdo são omitidas; contatos móveis só aparecem quando existentes. Orçamento pelo portal será implementado na fase 4.
- Sem selos, notas, avaliações ou patrocínios fictícios. Planos, destaques pagos e avaliações dependem das fases seguintes.
- APIs públicas allowlist: `catalogo_guia`, `buscar_fornecedores`, `fornecedor_publico`, `sitemap_publico`. Exigem status publicado e dono ativo. Sem CNPJ, razão social, e-mail interno, proprietário, equipe, consentimentos ou histórico no DTO. RLS e permissões das tabelas privadas preservadas.
- Migration `20261020012603_public_directory.sql`, incluindo histórico de slugs administrável apenas por admin. Redirecionamento só resolve se o destino estiver público.

## SSR e implantação

`npm run build:ssr && npm start` inicia o servidor Node na porta 5175 (configurável por PORT). Configurar VITE_SITE_URL com a origem HTTPS final e as variáveis públicas do Supabase antes do build. O servidor entrega conteúdo e metadados no HTML, hidrata o cache público, produz sitemap/robots, devolve 301 para slugs antigos e 404 para perfis indisponíveis. HTML e sitemap não ficam em cache, para refletir suspensão e inativação. JSON-LD LocalBusiness é gerado apenas para perfis reais públicos, sem avaliações inventadas.

O sitemap atual é único; antes de superar 50 mil URLs/50 MB, particionar com um índice de sitemaps. O catálogo inclui segmentos ativos e localidades cobertas por empresas públicas. Não inclui dados de demonstração.

A prévia AppDeploy é estática, usa HashRouter e dados fictícios identificados. A renderização Node, banco local e autenticação real não são hospedados nesse endereço. O guia/perfis da demonstração usam noindex. A indexação do domínio definitivo depende de hospedar o servidor e conectar o Supabase de produção. Nenhuma credencial local foi enviada à prévia.

## Validação

- Build cliente + SSR aprovados.
- 16 testes unitários, 111 assertivas SQL e 9 testes Playwright aprovados.
- `node scripts/test-public-ssr.mjs`: HTML sem depender de JavaScript, campos privados ausentes, JSON-LD, sitemap, 301, remoção após despublicação e hidratação móvel sem erros/overflow; fixture temporária removida no final.
- Lighthouse 12.8.2 em modo móvel, `/guia` SSR local: acessibilidade 100 e SEO 100. Resultado referente ao servidor local, não à prévia estática nem ao desempenho do domínio definitivo.
- AppDeploy snapshot `1792460103947`, status ready; sem erros de frontend, rede ou backend na checagem do provedor.

## Análise

https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/guia
