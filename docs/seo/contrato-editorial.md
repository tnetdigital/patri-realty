# Contrato editorial privado — versão 09

O contrato está em `src/seo/editorial.ts`. É um adaptador de curadoria para o SSR existente; não é novo CMS nem comprovação automática de apuração ou de identidade do aprovador.

## Dados e aprovação

Um candidato privado contém `article`, na forma da projeção pública final, e `review`. O registro de revisão contém:

| Campo | Finalidade |
|---|---|
| version / origin / slug | Versão do contrato, origem real ou fixture e identificador da pauta |
| articleHash | SHA-256 da projeção pública canônica, incluindo texto, autoria, datas e metadados efetivamente usados |
| sources | Afirmação, índice do bloco, URL, data de conferência, validade e limites da evidência |
| media | URL, origem, autor, licença, evidência de permissão, condições, crédito, alt, SHA-256 do arquivo e permissão de uso |
| metadata | Imagem social e alt vinculados à mídia revisada |
| checks | Confirmações humanas de apuração, autoria, direitos e diferenciação |
| approval | Estado pending/approved/revoked, Tércio, datas e hash do conjunto revisado |

O hash da revisão inclui `articleHash`, fontes, mídia, metadados, versão e checks; exclui o próprio objeto approval para evitar circularidade. Mudanças nesses dados exigem nova aprovação. Datas futuras de publicação, fontes vencidas, autor ausente, mídia sem permissão ou assinatura de hash divergente bloqueiam a versão. Só há uma revisão corrente por slug no manifesto; o histórico fica em arquivos privados separados.

Hash é controle de integridade, não assinatura criptográfica de identidade. A identidade de Tércio e o registro de sua decisão precisam ser comprovados pelo processo humano e pelo controle de escrita da área privada. O agente não concede aprovação real nem transforma um status de CMS em aprovação editorial.

## Fluxo operacional

1. Abrir a auditoria privada e corrigir a candidata, preservando a fonte original.
2. Conferir cada afirmação material, registrar a fonte no bloco correspondente e seus limites. Não marcar conferência com base apenas no acesso à URL.
3. Fechar direitos de cada mídia e conferir os bytes do arquivo que será hospedado. Usar recursos imutáveis/versionados: o adaptador não baixa arquivos remotos para detectar mudanças atrás da mesma URL.
4. Preparar hashes com `node scripts/review-editorial-document.mjs <CAMINHO_ABSOLUTO_PRIVADO> --prepare`. O comando só aceita candidato fora do checkout e estado pending, guarda histórico e **não aprova**. Campos de publicação/autoria e IDs precisam corresponder à versão final real; alterar esses dados depois invalida o hash.
5. Submeter texto, fontes, mídia e metadados finais a Tércio. Registrar a decisão real com os hashes exatos. Data de publicação deve refletir a liberação efetiva; não fabricar essa data para fazer o teste passar.
6. Integrar a decisão ao backend antes de produção. O manifesto corrente é uma lista de objetos `review`, sem textos completos ou histórico. Configurar `PATRI_EDITORIAL_APPROVAL_FILE` com caminho absoluto fora do checkout, apenas no servidor.

O manifesto ausente ou vazio libera zero matérias reais. Não há opção CLI de aprovar. As três candidatas preparadas nesta execução são rascunhos, têm checks falsos e fontes ainda a fechar no contrato; seus hashes não são prova de aprovação.

## Integração e limites

- `PATRI_EDITORIAL_REVIEW_FILE` continua reservado à leitura dos rascunhos na prévia protegida do Prompt02. Não reutilizá-lo para o manifesto de aprovação.
- O navegador consulta `/api/editorial-public`; o servidor usa o RPC público existente e só devolve a projeção aprovada. Texto e evidências privadas não entram no runtime serializado.
- Detalhes de matérias revalidam a cada 15 segundos e ao recuperar foco. Não há promessa de recolhimento instantâneo de conteúdo já recebido pelo visitante.
- Listagens e sitemap validam os detalhes aprovados; contagem/paginação considera o conjunto liberado, não os rascunhos do RPC. O adaptador é limitado a 25 candidatas aprovadas; escala maior exige consulta paginada homologada no backend.
- Não houve migration, alteração de grants/RLS ou implantação produtiva. O RPC remoto ainda precisa receber proteção equivalente ou deixar de expor diretamente matérias não aprovadas antes do lançamento. O proxy Node não revoga acesso direto à Data API.
- Magazines/revistas mantêm o contrato anterior; este gate governa matérias Article. Não extrapolar o aceite para todos os produtos editoriais.
- `PATRI_EDITORIAL_FIXTURES=1` só é aceito com origem configurada em localhost/127.0.0.1. Serve apenas para QA; não habilitar em produção.

## HTML e Markdown

Negociação em `/materia/{slug}` com `Accept: text/markdown`, a partir da mesma projeção aprovada do HTML. Preserva título, resposta, autoria, data, blocos, fontes e créditos. Sem nova URL ou conteúdo exclusivo para robôs. `Content-Type: text/markdown; charset=utf-8`, `Vary: Accept, Accept-Encoding` e cache privado/no-store; q=0 não recebe Markdown. Versão bloqueada retorna a mesma indisponibilidade de página do HTML.

É requisito interno da v5.1 consultada, não obrigação ou garantia de ranking Google. Foi preservado no-store porque aprovações e provas podem ser retiradas entre requisições; não se aplicou cache compartilhado longo a conteúdo governado por evidência externa.
