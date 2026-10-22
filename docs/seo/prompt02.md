# Prompt 02 — proteção da prévia e dos rascunhos

Data: 22/10/2026. Diagnóstico 00/01 aprovado pelo usuário.

## Escopo e implementação

Stack React, Vite e SSR próprio preservada. A prévia estática recebe uma entrada React de acesso; o documento completo do portal é entregue pelo backend somente após validar a senha. Os textos editoriais deixam de integrar os arquivos públicos do frontend. O SSR também protege páginas, arquivos, feeds e endpoints em modo de prévia. Configuração ausente ou fraca bloqueia o acesso.

A senha é configurada exclusivamente pelo formulário seguro do provedor, com pelo menos 20 caracteres, e validada no servidor por comparação de hashes em tempo constante. Não integra Git, URLs, armazenamento do navegador ou respostas. As respostas privadas usam no-store e noindex. O documento autorizado permanece em memória no navegador; encerrar a revisão ou recarregar remove o acesso. O prazo de 30 minutos é uma regra de interface: não revoga cópias já recebidas por um revisor autorizado.

O limite de cinco falhas por 15 minutos é por instância ativa do servidor e não substitui um controle distribuído na borda. A senha compartilhada é adequada à revisão; não oferece identidade individual ou auditoria por revisor.

## Preservação dos rascunhos

Os 12 textos e seus materiais auxiliares foram copiados para uma pasta privada fora do repositório, com conferência de hashes antes da remoção da árvore atual. O documento gerado para o backend também fica ignorado pelo Git. A preparação da prévia recebe o caminho do JSON privado como argumento; não recolocar esse arquivo no frontend.

O usuário determinou manter tnetdigital/patri-realty público e continuar. Não há reescrita do histórico. Cópias dos rascunhos em commits anteriores permanecem públicas; esta entrega restringe a distribuição atual e não promete recolher cópias anteriores, caches ou clones.

## Validação local

- Build cliente e SSR: aprovados.
- Tipagem frontend/Edge, lint e verificação de ambiente: aprovados.
- Testes unitários: 35/35.
- Testes HTTP e regressões: 60/60, incluindo cinco casos de proteção.
- Servidor SSR real: 12 verificações aprovadas, incluindo bloqueio anônimo de páginas, API, assets, robots, sitemap e feed, acesso autorizado e cabeçalhos privados.
- Busca por títulos e respostas dos rascunhos no build público: zero ocorrências.
- Navegador real, com credencial sintética exclusivamente local: senha incorreta recusada; senha correta abre o portal e os 12 textos; encerrar remove o documento e limpa a senha.
- Guarda de versionamento: nenhum pacote editorial, JSON privado ou backend gerado na árvore atual.

O teste do compilador foi ajustado para executar o Node diretamente, corrigindo uma falha de portabilidade do runner no Windows.

## Publicação e análise

Estado deste registro: implementação local validada; publicação protegida pendente da configuração segura da senha e da verificação remota. Não considerar a URL antiga protegida até a confirmação explícita da publicação e do teste anônimo.

URL permanente de revisão: https://patri-realty-previa-05je1j.v2.appdeploy.ai/

A publicação deve atualizar o mesmo app, retirar os antigos módulos públicos do snapshot e testar também os endereços antigos dos bundles. Se o provedor conservar assets antigos, a remoção desses objetos exige confirmação adicional; resposta HTTP 200 com a tela de acesso não equivale à entrega de um rascunho.

## Fora deste escopo

Nenhuma migração de banco, ativação de produção, cobrança, envio externo ou expansão de páginas. Pendências do diagnóstico, incluindo logotipo original e configuração produtiva, continuam registradas nos relatórios anteriores.
