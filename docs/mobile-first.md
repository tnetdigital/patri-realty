# Interface mobile first — 20/10/2026

Solicitação: remover emojis e priorizar integralmente o uso no celular.

## Entrega

- Removidas setas Unicode decorativas dos textos, botões e links. A interface não usa emojis; ícones vetoriais funcionais e a marca permanecem.
- Folha mobile.css com estilos base para celular e expansão por min-width de 700 e 1024 pixels. Preserva a identidade visual aprovada.
- Cabeçalho compacto fixo, menu com área de toque de 44 pixels, acesso a Entrar/Faça parte dentro do menu, fechamento por Escape e rolagem própria em telas baixas.
- Campos em 16 pixels no celular para evitar zoom automático no iOS; ações principais com pelo menos 48 pixels de altura e botões com mínimo de 44 pixels.
- Guia, categorias, sugestões de cidades, cartões, perfis, orçamento, cadastro e painel partem de uma coluna; grades maiores entram progressivamente.
- Especialidades com linhas de seleção mais confortáveis e filtros removíveis legíveis. Sugestões e listas longas possuem rolagem própria.
- Cookies reorganizados para celular, rodapé com links acessíveis ao toque, ações de contato com safe-area e sem cobrir o conteúdo final.
- Nada foi alterado nas regras de dados, publicação, orçamento ou autenticação.

## Checklist de implementação e publicação

- [x] Inventário dos fluxos: home, menu, guia, autocomplete, cadastro, painel, orçamento, cookies e navegação protegida.
- [x] Testes da prévia reconciliados com layout móvel, ausência de emojis e acesso pelo menu; cinco testes e um sanity preservados.
- [x] Snapshot remoto atual lido, app_id e HashRouter preservados, somente fontes novas/alteradas.
- [x] Sem recursos binários novos ou credenciais no upload.
- [x] Build cliente/SSR e formatação aprovados.
- [x] Testes em 320, 390, 768 e 1280 pixels: home, guia, cadastro e painel sem overflow horizontal; campos móveis de pelo menos 16 pixels; menu e Escape operantes.
- [x] Fluxos existentes de orçamento, filtros, uploads, equipe e autenticação passaram na verificação de regressão.

Prévia de análise: https://patri-realty-previa-05je1j.v2.appdeploy.ai/#/guia
