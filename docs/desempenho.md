# Desempenho do guia — 22/10/2026

Mesma ferramenta e script: `node scripts/lighthouse-mobile.mjs before|after`, Lighthouse 13.5.0, Chrome do Playwright, emulação mobile padrão, guia SSR em http://127.0.0.1:5180/guia. Resultados completos resumidos em docs/evidence/lighthouse-before.json e lighthouse-after.json.

| Medição | Performance | LCP | Acessibilidade | SEO |
|---|---:|---:|---:|---:|
| Antes das otimizações | 60 | 6,96 s | 100 | 100 |
| Depois | 96 | 2,21 s | 100 | 100 |

A auditoria anterior, com Lighthouse 12, havia registrado 61 e 6,8 s. A comparação acima usa a mesma versão 13 e o mesmo script nos dois momentos.

Foram removidas importações bloqueantes de fontes externas, adotando fallback local de tipografia; adicionadas compressão gzip de HTML/CSS/JS, cache imutável de assets com hash, dimensões explícitas de imagens editoriais e cache limitado de 3 segundos para consultas anônimas do guia. Perfis, contas e relatórios não usam esse cache; a remoção de perfil continua imediata. Scripts de módulos já são adiados pelo navegador. Não foi adicionada espera artificial para manipular a medição.

Este resultado é do ambiente local, não da prévia estática nem de produção. Volume de dados, hardware e rede de destino exigem nova medição na homologação externa.
