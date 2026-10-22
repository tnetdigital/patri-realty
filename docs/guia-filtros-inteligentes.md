# Guia — especialidades e filtros inteligentes

Solicitação do usuário implementada em 20/10/2026, como melhoria do guia entregue na fase 4.

## Fontes e conciliação

Consultados os diretórios públicos:

- https://www.carraracondominios.com.br/fornecedores/ — 119 categorias de condomínios e moradia (os 27 estados do filtro não são categorias).
- https://direcionalcondominios.com.br/fornecedores/ — 85 categorias.

O catálogo canônico possui 150 especialidades, incluindo os segmentos anteriores preservados, em 11 grupos. Equivalentes foram unificados, mantendo os termos das fontes como aliases pesquisáveis: administradoras/administração condominial; advocacia/assessoria jurídica; AVCB; dedetização/controle de pragas; CFTV/câmeras/alarmes; carregamento veicular; jardinagem/paisagismo, entre outros. Serviços complementares permanecem separados como subespecialidades.

O mapeamento completo de cada termo, fonte, URL e destino está em `docs/fontes/especialidades-mapeamento.json`. A configuração pública está em `src/features/directory/taxonomy.json`. Categorias são dados de classificação; nenhum fornecedor, contato, selo ou avaliação desses portais foi importado.

## Comportamento

- Especialidades opcionais, agrupadas e expansíveis. No guia, os grupos aparecem abertos no seletor desde o início; na home, o painel é recolhido para preservar a composição da página.
- Busca de especialidade pelo nome ou sinônimo, checkboxes individuais e seleção do grupo. Várias especialidades usam OU: encontrar empresas de qualquer uma das selecionadas, sem repetir uma empresa no resultado.
- Chips para revisar/remover as escolhas, limpar todas e concluir seleção. Sem seleção, buscar em todas.
- Estados com combobox acessível, sugestões a partir de duas letras, por nome, sigla ou texto sem acento. A sigla exata tem prioridade.
- Cidades vinculadas à UF, com o mesmo padrão de sugestões. A base do projeto contém 5.571 cidades e 27 UFs. Na demonstração, arquivos por estado são carregados sob demanda; não depende de uma API externa de localidades durante o uso.
- Trocar ou limpar o estado limpa a cidade anterior. Texto digitado sem escolher uma opção válida impede o envio do formulário.
- Teclado: setas para percorrer sugestões, Enter para selecionar, Escape para fechar. Estado selecionado habilita cidade. Indicação de carregamento, nenhuma sugestão e falha com opção de tentar novamente.
- Filtros persistem na URL e na recarga. Uma especialidade preserva a rota anterior; múltiplas usam `?segmentos=slug-a,slug-b`. Cidade é sempre validada junto à UF pelo banco.
- Mais procurados compactos na home substituem uma lista de 150 cartões. Nenhuma especialidade é obrigatória.

## Banco e manutenção

Migration `20261020040527_directory_taxonomy_smart_filters.sql`: adiciona grupo/apelidos a segmentos, faz upsert preservando IDs anteriores e atualiza as projeções e a busca. Mantém as regras de publicação, conta ativa, privacidade e RLS. A busca passa a aceitar múltiplos segmentos e nomes alternativos. A migration foi aplicada apenas à stack local; o backend definitivo continua desconectado da prévia.

Para evoluir o catálogo, manter taxonomy.json e a migration de dados em sincronia, sem editar migrations já aplicadas em produção. As cidades são o snapshot IBGE já presente no seed do projeto; sua atualização futura deve ser versionada junto ao seed.

## Validação

- Build cliente e SSR aprovados.
- 22 testes unitários e 148 verificações SQL: catálogo sem slugs duplicados, aliases, OR sem duplicar fornecedor, filtro inválido, 27 UFs e 645 municípios de SP restritos à UF.
- 11 Playwright aprovados, preservando cadastro, painel, equipe, uploads e orçamento. Novo fluxo móvel verifica teclado, seleção múltipla, recarga e troca de UF. Teste adicional confirma que cidade não selecionada impede o envio.
- Teste da prévia HashRouter com Sorocaba/SP e Niterói/RJ, aliases, seleção múltipla, recarga e ausência de overflow/erros JS aprovado.
- Teste SSR existente e advisors de segurança aprovados.
- Lighthouse móvel do guia SSR local: acessibilidade 100 e SEO 100; não é uma medição do domínio definitivo.

## Checklist de publicação

- [x] Mesmo app_id e endereço, snapshot remoto lido antes das alterações.
- [x] Somente fontes novas/alteradas; JSON de localidades como dados, sem arquivos binários do usuário.
- [x] Sem credenciais, variáveis locais ou arquivos do servidor no upload.
- [x] HashRouter preservado na prévia, sem alterar a autenticação.
- [x] Cinco testes da prévia reconciliados, exatamente um sanity e cobertura do novo fluxo.
- [x] Fonte legível, JSON válido, testes e formatação aprovados.

Link de análise: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/guia
