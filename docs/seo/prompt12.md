# Prompt 12 — desempenho, mobile e acessibilidade

Data: 23/10/2026. Execução autorizada. Stack React 18/Vite/TypeScript e SSR Node preservada, com os contratos Supabase existentes. Sem migração, conteúdo real novo, aprovação editorial, envio externo ou implantação.

## Objetivo e resultado

Medir guia, perfil e matéria no mesmo ambiente e corrigir problemas observados de carregamento, estabilidade e navegação. O resultado é uma implementação preparada para o piloto hospedado, com evidências locais e pendências de campo explicitadas.

Resultados principais:

- Aproximadamente **7,3%–7,5% menos JavaScript comprimido transferido** nas três famílias.
- CLS da matéria: **mediana de 0,522 para 0**, nas três amostras finais locais.
- Zero erros de hidratação nas nove amostras finais com CPU desacelerada.
- Violação automática de contraste do perfil corrigida; zero violações detectadas pelo conjunto axe executado nas três famílias após a mudança.
- 24 cenários funcionais de experiência aprovados, além da regressão anterior.

**Não há certificação de Core Web Vitals de produção, acessibilidade integral ou promessa de ranking.** O perfil não ficou uniformemente mais rápido em todas as medidas; os números abaixo registram também essa variação.

## Baseline, ambiente e método

O baseline foi registrado antes das alterações de código, sobre o commit `451a551e68db203af8267b5615e629ffb6099716`. O arquivo final registra também o hash do build medido e os arquivos modificados, pois a medição precedeu o commit desta entrega.

[Evidência anterior](evidencias-prompt12/before.json), [evidência posterior](evidencias-prompt12/after.json) e [comparação validada](evidencias-prompt12/comparacao.json).

Método igual nas duas fases:

- Servidor SSR e transporte de dados locais controlados; três fornecedores sintéticos, uma especialidade de teste e uma matéria sintética com oito blocos e capa.
- Mesmo Chrome headless, Node, sistema e máquina, registrados no JSON. Viewport 375 × 812, DPR 1, contexto móvel/toque.
- CPU desacelerada em 4× e configuração CDP de 150 ms, download 1,6 Mbps e upload 750 kbps. São parâmetros de emulação, não uma rede móvel física; interceptação de requisições e loopback limitam a interpretação de latência/TTFB.
- Três contextos novos por família, cache de rede desativado e consentimento “essenciais”. A ordem guia → perfil → matéria é igual.
- Imagem SVG sintética 1600 × 900, atendida por interceptação local; demais saídas não previstas bloqueadas. Isso não simula custo, peso ou latência de um CDN de fotos reais.
- Captura após carregamento e janela adicional de 1,5 segundo. Axe é injetado depois da coleta de performance, para não somar o auditor aos bytes e tarefas medidos.
- Medianas de três amostras, sem inferência estatística de p75 ou de público real. Tarefas longas são o somatório observado de excedentes acima de 50 ms na janela; **não são o TBT do Lighthouse nem o INP**.

### Medianas observadas

| Família | JS gzip antes → depois | Redução | LCP antes → depois | CLS antes → depois | TTFB antes → depois |
|---|---:|---:|---:|---:|---:|
| Guia | 227.451 → 210.458 bytes | 7,47% | 1.332 → 1.280 ms | 0 → 0 | 68,7 → 57,0 ms |
| Perfil | 227.451 → 210.458 bytes | 7,47% | 1.356 → 1.376 ms | 0 → 0 | 38,8 → 40,2 ms |
| Matéria | 234.070 → 217.073 bytes | 7,26% | 1.636 → 1.416 ms | 0,522 → 0 | 31,8 → 31,5 ms |

No perfil, LCP variou +20 ms e o somatório de excedentes de tarefas longas foi de 171 para 213 ms. Esse diagnóstico não mostra melhora uniforme de execução; manter o perfil como prioridade de acompanhamento no piloto real. No guia, esse somatório foi de 188 para 160 ms; na matéria, de 273 para 186 ms. Três execuções não permitem atribuir toda variação temporal a uma única alteração.

O CSS comprimido inicial passou de 15.371 para 15.547 bytes, um aumento de 176 bytes associado às reservas/foco e ajustes. Não foi alegada redução de CSS. As requisições JavaScript permaneceram em quatro no guia/perfil e seis na matéria; o ganho está nos bytes e no conteúdo carregado, não em uma contagem menor de arquivos.

As chamadas RPC observadas no navegador passaram de 3→2, 8→7 e 1→0, respectivamente. Isso não comprova redução do total de consultas ao banco: parte da carga pública de anúncios foi antecipada para o SSR e a instrumentação mede requisições do navegador, não o custo total do backend. A confirmação exige observabilidade no ambiente real.

## Diagnóstico e implementação

### Hidratação e divisão de código

A matéria apresentava deslocamentos do rodapé durante a hidratação. O [diagnóstico anterior](evidencias-prompt12/before-diagnostic-article.json) registra as posições antes/depois dos elementos. Em uma etapa intermediária, a CPU desacelerada também revelou o aviso React 421, documentado em [diagnóstico intermediário](evidencias-prompt12/diagnostico-intermediario-hidratacao.json).

O módulo público de matéria/listagem/revista agora é carregado antes de iniciar a hidratação do seu HTML SSR. O conteúdo permanece legível enquanto o módulo chega; se o chunk falhar, a página SSR permanece e o navegador registra uma orientação de recarga para ativar interações. A atualização de sessão em segundo plano usa `startTransition`, evitando substituir um limite SSR ainda em hidratação. A consulta de sessão, permissões e validações de backend permanecem iguais; nenhuma autorização foi relaxada.

Home, área e páginas de conta passam a ser carregadas por rota. O chunk de validação Zod foi separado do chunk de React Hook Form/resolvers, evitando trazer a biblioteca de formulários apenas porque uma validação pública é necessária. Os templates públicos continuam no HTML inicial; o SSR aguarda o conteúdo, não entrega somente um esqueleto.

### Imagens, fontes, mídia e anúncios

- Capas e cards usam dimensões de quadro, proporção e decodificação explícitas. A capa editorial mantém altura responsiva, evitando tratar o atributo de altura como um tamanho visual fixo no celular.
- Capa principal de perfil/matéria permanece sem lazy loading. Cards e publicidade no meio podem continuar tardios; posições de publicidade no topo usam eager. O LCP observado foi texto, portanto não foi atribuída prioridade alta indiscriminada a toda imagem.
- Os dois arquivos de publicidade mobile/desktop já existentes continuam em `picture`. Quadros estáveis, com proporções de layout distintas por breakpoint e `object-fit: contain`, evitam cortar a peça dentro do espaço reservado. As proporções são de apresentação, não uma afirmação sobre as dimensões do arquivo original. Validar as peças reais antes de campanha.
- Inventário público de banners é antecipado em paralelo no SSR, com orçamento de até 750 ms por consulta opcional e reaproveitamento do cache hidratado de 30 segundos. Falha de publicidade não transforma o conteúdo principal em erro. Sem anúncio elegível, não se cria um grande espaço vazio. Uma recuperação tardia após falha inicial ainda pode alterar o layout e precisa de verificação no ambiente hospedado.
- Não foram criadas variantes de URL que o armazenamento não fornece. Fotos reais, pesos de WebP/AVIF, srcset editorial e dimensões intrínsecas de imagens livres do corpo dependem dos arquivos/dataset reais. Os quadros conhecidos foram tratados; não se inventaram dimensões de mídia editorial desconhecida.
- Não há download de fontes externas nesta carga medida; os fallbacks de sistema existentes foram mantidos. Sem nova fonte, licença ou serviço externo.

### Mobile, foco e privacidade

Adicionado atalho de teclado “Pular para o conteúdo”. Escape fecha o menu e devolve o foco ao seu botão. Inputs/selects/textareas têm foco explícito; movimento reduzido é respeitado. O texto pequeno do aceite operacional tinha contraste automático de aproximadamente 4,24:1 e recebeu cor mais escura, mantendo a direção visual.

As preferências de privacidade reabrem sem reload e preservam o preenchimento. O foco entra nos controles e retorna ao acionador após a escolha. A negação de localStorage não derruba a página. A barra fixa de orçamento cede a cookies, menu, edição e controles de rodapé; o perfil reserva espaço no fim do documento para que a barra não cubra preferências e links.

Formulários de orçamento/newsletter declaram POST, evitando um fallback nativo que levaria campos ao query string durante falha/atraso de JavaScript. Isso não cria um endpoint de envio sem JavaScript: os fluxos reais continuam exigindo suas validações, CAPTCHA e confirmação do backend, conforme PT11.

### SSR, cache e compressão

Gzip e assets versionados com cache imutável foram conferidos. HTML e projeções cuja aprovação pode mudar continuam no-store; não foi criado cache público de documentos que pudesse preservar aprovação retirada. Não há cache compartilhado novo entre usuários ou requests. Metadados, canonicals, fontes e grafos continuam coerentes com o conteúdo elegível, conforme regressões de SEO/editorial.

## QA, critérios de aceite e limites

[24 cenários de experiência](evidencias-prompt12/qa.json): três famílias × cinco larguras (320/375/390/768/1280), conteúdo/metadata sem overflow, autocomplete UF/cidade por teclado, busca de especialidade, atalho ao conteúdo, retorno de foco do menu, privacidade sem perda do formulário, armazenamento negado, movimento reduzido, anúncio ativo no HTML e retirada, gzip/cache e chunk público atrasado sem perda do H1 SSR.

Reflow foi testado em 320 CSS pixels, equivalente a 1280 pixels com zoom de navegador a 400%, conforme a referência W3C. Não se usou CSS `zoom` como substituto indevido do comportamento de media queries do zoom do navegador. Zoom de interface em aparelho real, teclado físico/virtual e leitor de tela continuam para homologação manual; automação não certifica toda a WCAG.

O conjunto axe executou tags WCAG 2 A/AA, 2.1 AA e 2.2 AA. O perfil tinha uma violação de contraste; as três famílias terminaram sem violações ou verificações incompletas nessa execução. Isso é evidência do conjunto aplicado às fixtures, não uma declaração de conformidade integral do portal ou dos futuros conteúdos.

| Verificação | Resultado |
|---|---:|
| Unitários | 158 aprovados |
| HTTP/contratos | 65 aprovados |
| Experiência PT12 | 24 aprovados |
| Medição final | 9 amostras, zero erros de hidratação |
| Conversão PT11 | 8 aprovados |
| Dados estruturados | 14 aprovados |
| Descoberta PT10 | 11 aprovados |
| Guias nacionais | 11 aprovados |
| Perfil/mobile | 9 aprovados |
| Governança editorial | 12 aprovados |
| Contrato SEO | 22 aprovados |
| Gate municipal | 17 aprovados |
| Proteção de prévia | 12 verificações HTTP e 5 testes de acesso aprovados |
| Build cliente/SSR, typecheck, lint, ambiente e isolamento dos rascunhos | Aprovados |

A revisão React considerou divisão por necessidade, consultas paralelas, preservação de SSR, atualização de contexto não urgente, hooks e listeners, chaves estáveis e controles acessíveis. Nenhuma dependência ou stack foi substituída.

### Como repetir

```text
npm run build:ssr
npm run measure:public -- after
npm run test:experience
npm run test:conversions
```

Executar as medições de uma fase sem outros testes/builds concorrentes. O harness usa portas locais fixas; não iniciar múltiplos harnesses ao mesmo tempo. Para reconstruir o baseline, usar o commit anterior indicado com o mesmo harness/dataset de medição em uma cópia isolada, mantendo versões, máquina e parâmetros. Não sobrescrever os arquivos de baseline de uma entrega aceita por acidente.

### Capturas conferidas visualmente

São fixtures de QA, sem fornecedores ou publicação editorial reais:

[Guia, 375px](evidencias-prompt12/after-guide-375.png) · [Perfil, 375px](evidencias-prompt12/after-profile-375.png) · [Matéria, 375px](evidencias-prompt12/after-article-375.png).

## Dados de campo, publicação e próximo passo

A referência oficial vigente é LCP ≤2,5 s, INP ≤200 ms e CLS ≤0,1, avaliados no p75 de dados de campo suficientes e separados por dispositivo. **CrUX/RUM, INP de campo e CWV de produção não foram testados.** Os tempos do laboratório não certificam essas metas nem garantem ranqueamento.

Persistem as dependências anteriores: fechamento de provas/aprovações reais, direitos de mídia, proteção equivalente do RPC/Data API editorial, homologação de persistência/e-mail/pagamento e infraestrutura final. Nenhum bloqueio de indexação, senha, Quality Gate ou origem de fixture foi removido.

**Prévia online não atualizada:** o limite `CREDITS_USAGE_LIMIT_REACHED` do AppDeploy continua sem resolução informada. O snapshot 1792711230117 é anterior aos PT05–12 e ao último ajuste do PT04. Não houve nova tentativa de implantação, cobrança, migração ou aplicativo para contornar a quota. O relatório e o código no GitHub são a entrega atual para análise.

Próxima etapa: **PT13 — sitemap, rastreamento e acesso por IA**, alinhando descoberta e política de robôs às mesmas regras de elegibilidade, sem abrir ambientes privados. Não iniciado nesta entrega.

Referências: AGENTE_MESTRE_MPI e relatório MPI v3; [Core Web Vitals](https://web.dev/articles/vitals), [otimização de LCP](https://web.dev/articles/optimize-lcp), [reflow WCAG](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) e [transições React](https://react.dev/reference/react/startTransition). O aviso de hidratação também foi conferido no código da versão React instalada; não houve atualização de framework ou SDK.
