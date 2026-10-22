# Backlog priorizado — diagnóstico de 22/10/2026

Referência: commit `8102f37`. **Propostas de correção; nenhuma foi implementada nesta rodada.**

P0: corrigir antes de liberar aquisição orgânica/rascunhos. P1: qualidade/prontidão do núcleo e homologação. P2: complementos e evolução. Impacto e esforço são estimativas relativas, não orçamento ou prazo prometido. Confiança alta indica reprodução/leitura direta; média indica lacuna ou inspeção ainda incompleta.

| Ordem | ID | Ação proposta | Impacto | Confiança | Esforço | Dependência | Aceite que comprova a correção |
|---:|---|---|---|---|---|---|---|
| 1 | F01 | Proteger prévia e retirar rascunhos da distribuição pública | Muito alto | Alta | Médio/alto | Recurso de autenticação no host; fonte privada | Nenhum acesso anônimo por HTML, asset, API, arquivo, Markdown ou cache; revisão autenticada funciona |
| 2 | F03 | Unificar canonical, robots e regras de parâmetros | Muito alto | Alta | Médio | Inventário por classe | UTM equivalente mantém indexação e canonical limpo; SSR/cliente concordam; paginação tem política própria |
| 3 | F04 | Aplicar mínimo e prova de cobertura municipal | Muito alto | Alta | Médio | Contratos públicos existentes | 0/1/2 distintos não indexam; três ainda dependem dos demais gates; sem prova permanece bloqueado |
| 4 | F06 | Reconhecer rotas completas no SSR | Alto | Alta | Baixo/médio | F03 | Rota com segmento extra retorna 404 real e não entra no sitemap |
| 5 | F17 | Integrar gate de publicação/qualidade | Alto | Alta | Médio | Rubrica/decisão interna; F04 | Política versionada com motivos e bloqueios, usada por SSR/cliente/sitemap; sem nota fictícia |
| 6 | F14 | Corrigir caminhos de assets no Windows preservando segurança | Alto para homologação local | Alta | Baixo/médio | Nenhuma migration | Asset legítimo 200 e caminho fora de dist rejeitado em plataformas suportadas |
| 7 | F05 | Completar sitemap com fonte comum de elegibilidade | Alto | Alta | Médio | F03/F04/F17 | XML válido; somente canônicas elegíveis; lastmod verdadeiro quando disponível |
| 8 | F07 | Qualificar template e piloto de guias nacionais | Alto | Alta | Médio/alto | Pesquisa, dados e revisão | Escopo, comparação e oferta úteis por segmento; sem trocas cosméticas |
| 9 | F08 | Completar entidades e corrigir autoria institucional | Alto | Alta | Médio | Mapeamento dos dados existentes | IDs estáveis, provider do terceiro, CollectionPage/ItemList e autoria verdadeira |
| 10 | F09 | Vincular revisão real a versão e metadados | Alto | Alta na lacuna | Médio | Tércio e fonte editorial privada | Registro real da versão aprovada e invalidação após mudança; sem tabelas novas neste escopo |
| 11 | F18 | Explicar influência comercial na ordenação | Médio/alto | Alta | Baixo | Regra comercial existente | Explicação junto à listagem e rótulos corretos; pagamento não equivale a certificação |
| 12 | F10 | Ajustar OG por família e alt social | Médio | Alta | Baixo/médio | Mídia autorizada | Matéria com tipo/imagem/alt apropriados e HTML verificável |
| 13 | F11 | Revalidar CTA mobile e corrigir sobreposição se confirmada | Alto | Média; visual não testado | Baixo/médio | Browser de teste; fluxo controlado | Cliques reais, banner e teclado em 320–390px; conversão sem analytics |
| 14 | F12 | Finalizar identidade, jurídico, direitos e logotipo original | Bloqueador de lançamento conforme item | Alta na ausência local | Médio + responsável | Dados do operador e revisões humanas | Identidade/contatos reais, aprovações e mídia original autorizada |
| 15 | F02 | Implantar e homologar o SSR no destino autorizado | Bloqueador de aquisição real | Alta na diferença da prévia | Médio/alto | Domínio/host e sprints estruturais | HTML inicial completo, status, redirects, assets e hidratação no host real |
| 16 | F16 | Homologar integrações e operação de produção | Bloqueador de operação real | Alta na falta de evidência | Alto | Supabase/serviços disponíveis; autorização própria | Auth, persistência, e-mail, pagamentos sandbox, jobs e recuperação comprovados |
| 17 | F15 | Tornar teste do compilador portável | Médio para engenharia | Alta | Baixo | Ajuste futuro de testes | Erro detectado por tipagem, não por ENOENT; testes passam nas plataformas suportadas |
| 18 | F13 | Implementar Markdown se mantido o requisito interno | Médio/baixo | Alta | Médio | Projeção pública segura e templates estáveis | MIME/equivalência/caches e privacidade corretos; sem promessa de ranking |

## Sprints executados nesta rodada

### Prompt 00 — contrato e continuidade

- **Objetivo:** estabelecer contexto factual e decisões aplicáveis.
- **Escopo:** repositório, branch/commit, documentos, limites e restrições.
- **Arquivos/áreas:** leitura do AGENTS, referências locais e documentação; arquivos novos em docs/seo.
- **Implementação:** somente documentação de estado/decisões e identificação de fontes; sem mudança funcional.
- **Critérios de aceite:** fontes efetivamente identificadas; stack e decisões preservadas; nenhuma criação de backend ou publicação.
- **QA:** estado Git inicial/final e hashes dos arquivos versionados.
- **Dependências:** acesso ao GitHub e arquivos de referência.
- **Resultado:** concluído; continuidade registrada.

### Prompt 01 — diagnóstico atualizado

- **Objetivo:** reproduzir os bloqueios e mapear o inventário atual.
- **Escopo:** código, prévia pública, SSR controlado e engenharia; sem persistência/serviços reais.
- **Arquivos/áreas:** templates/rotas/servidor/SQL/eventos/testes/estilos/CI; relatório e CSV novos.
- **Implementação:** leitura, GETs, execução de testes e scripts de auditoria separados da aplicação.
- **Critérios de aceite:** achados com origem/reprodução/impacto/aceite; histórico separado de observação atual; não testado explicitado.
- **QA:** 35 unitários, 55 regressões com uma falha ambiental, build/tipagem/lint, npm audit, scanner, HTTP e render controlado; preservação da árvore versionada.
- **Dependências:** dependências instaladas na cópia isolada; documentos encontrados. Backend/contas ausentes limitaram escopo.
- **Resultado:** concluído; 241 registros de inventário e relatório atual entregues.

## Primeiro sprint de correção proposto — Prompt 02

- **Objetivo:** proteger a revisão editorial antes de outras melhorias.
- **Escopo:** F01, fonte de rascunhos, grafo de imports, servidor e hospedagem da prévia.
- **Arquivos/áreas:** App.tsx, EditorialPreview.tsx, editorial-drafts.json, pipeline de build e configuração de acesso no destino; caminhos exatos serão definidos na implementação.
- **Implementação proposta:** projeção pública apenas aprovada e autenticação efetiva; preparar remediação de cópias já expostas.
- **Critérios de aceite:** sem rascunho em leitura anônima por qualquer representação; responsável consegue revisar autenticado; ausência de regressões nos conteúdos públicos aprovados.
- **QA:** acesso anônimo/autenticado/expirado, asset conhecido, bundle e caches, URL direta e builds; prova separada no host real.
- **Dependências:** mecanismo de acesso do host e origem editorial privada. Mudanças de visibilidade do GitHub/histórico exigem escopo específico; não são inferidas deste backlog.
- **Resultado esperado:** prévia e conteúdo de revisão protegidos, com evidência verificável.

## Condições para os sprints seguintes

Prompts 03/04 podem preparar correções de servidor/frontend mesmo com Supabase adiado, conservando noindex quando não houver evidência. Nenhuma cidade deve ser liberada apenas porque a base municipal existe. A rubrica de score precisa ser definida/registrada antes de declarar o gate concluído.

Prompts de templates exigem matriz e fatos; aprovação editorial continua humana. O lançamento exige prova no destino; a prévia estática e a aprovação de CI não substituem esse aceite. O restante do pacote de 18 prompts continua válido como sequência, sujeito aos achados atuais.
