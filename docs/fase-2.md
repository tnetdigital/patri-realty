# Fase 2 — cadastro do fornecedor

O usuário aprovou a fase anterior e autorizou o avanço nesta conversa. A aprovação libera o desenvolvimento da fase 2; não elimina as pendências de infraestrutura hospedada já registradas.

## Entregue

O painel autenticado em `/painel` agora contém o assistente de cinco passos: empresa, marca, sobre, cobertura e conteúdo. Cada avanço valida e salva a etapa. Há indicação de alteração não salva, retomada do último passo salvo, proteção contra sobrescrita de outra sessão e bloqueio de edição enquanto o cadastro está em análise.

Empresa: nome, razão social, CNPJ com dígitos verificadores, telefone/WhatsApp, e-mail, site HTTPS, Instagram, CEP com consulta ao ViaCEP, endereço e cidade-sede do catálogo IBGE. A consulta de CEP pode falhar sem impedir preenchimento manual. CNPJ duplicado é barrado no banco; a tela oferece uma solicitação de reivindicação com comprovante HTTPS e justificativa, sem transferir propriedade automaticamente.

Marca: escolha, recorte com zoom/posição e conversão para WebP de logo e capa. Validação de tipo, 5 MB e resolução mínima no navegador; reprocessamento por canvas remove EXIF e gera miniatura. Storage limita tamanho/MIME e autoriza somente a pasta da empresa. Novos arquivos têm nomes UUID, sem sobrescrever mídias anteriores. A checagem de dimensões é feita no cliente; uma inspeção independente de dimensões no servidor ainda não foi adicionada.

Conteúdo: até três segmentos, regiões por cidade ou estado inteiro, serviços com foto, galeria com legenda, vídeo YouTube, cases, FAQ, certificações e links do Instagram. Os limites de preparação são lidos de `configuracoes.limites_cadastro`; não são uma assinatura comercial. O teste Premium e os planos reais pertencem à fase 6. Os quatro limites iniciais de conteúdo são editáveis no banco e serão incorporados ao admin futuramente.

A pré-visualização privada usa os dados preenchidos, mostra apenas blocos com conteúdo e não inventa notas, avaliações ou selos. O envio exige logo, descrição, segmento, região e WhatsApp, muda para `em_analise`, grava auditoria e notificação. Aprovação e publicação pertencem à fase 5. Os endpoints desta fase não concedem acesso público ao catálogo.

Mudanças de nome, CNPJ ou logo de uma empresa já publicada viram propostas separadas. O conteúdo anterior e o slug continuam intactos. As decisões sobre essas propostas serão implementadas no admin da fase 5.

Equipe: dono cria convites, membros editam a página e não gerenciam equipe, plano ou pagamento. Tokens são aleatórios, armazenados como hash, vinculados ao e-mail, válidos por 14 dias e de uso único. O limite de três membros considera vagas reservadas por convites ativos, com bloqueio transacional por empresa. O aceite funciona tanto para contas existentes quanto para novos editores, sem criar empresa extra. Revogação remove o acesso imediatamente e preserva o registro.

## Verificação

- 100 assertivas pgTAP: fundação, isolamento dos conteúdos, marca/pasta, CNPJ, texto, segmentos, versão, completude, envio, auditoria, propostas sensíveis, convites, limite, revogação, expiração, cadastro de membro e lembretes idempotentes.
- 12 testes unitários: Auth, prontidão, pontos de completude, segurança de textos/URLs, limites e geometria do recorte.
- Testes Playwright da demonstração: persistência, revisão de campos inválidos, pré-visualização, envio, equipe e recorte em celular.
- Teste Playwright autenticado completo com GoTrue, PostgreSQL, Supabase Storage e SMTP Mailpit: cadastro, confirmação, cinco passos, uploads de logo/capa, envio, convite, cadastro/confirmação do editor e bloqueio da gestão de equipe para o membro.

O ambiente local agora inclui o Storage API real, além do schema mínimo de Storage usado apenas na suíte SQL isolada. O teste autenticado usa o serviço HTTP real; não se confunde com o contrato mínimo de políticas da suíte pgTAP.

## E-mails e tarefas

Mudanças de status e convites geram `email_outbox`. `supplier-jobs` é uma Edge Function com segredo próprio de servidor (`SUPPLIER_JOBS_SECRET`), entrega via Resend, registra `email_log`, usa lease e chave de idempotência, e remove o token do payload após entrega. A função rejeita chamadas sem o segredo. Esse segredo nunca vai para o navegador.

Os lembretes dos dias 2, 5 e 7 são preparados uma única vez por empresa/dia. A migration agenda a preparação quando `pg_cron` existe. O disparo HTTP da Edge Function depende de agendamento externo ou configuração do ambiente hospedado, com segredo armazenado no servidor. SMTP Resend/domínio e execução dessa função no ambiente hospedado continuam pendentes. O fluxo local foi exercitado com `python scripts/local-emails.py`, que entrega exclusivamente no Mailpit local.

## Demonstração publicada

`/demonstracao` funciona sem login e é explicitamente identificada como simulação. Os dados e imagens ficam em IndexedDB no navegador, sem serem enviados ao Supabase ou à equipe Patri. A ação de exemplo cria uma empresa e imagens fictícias; nenhum pedido real, mensagem real ou publicação é produzido.

No modo de demonstração, cidades podem ser digitadas com sugestões; no modo autenticado, são selecionadas da base IBGE. O botão de reinicialização exige confirmação e apaga apenas a demonstração local. O painel real continua atrás de `RequireRole` e das políticas do banco.

## Reproduzir

```bash
npm ci
npm run local:up
npm run dev
npm run local:test:db
npm test
npm run local:test:e2e
```

Novas instalações aplicam as migrations com registro em `patri_local.migrations`. Ambientes locais legados precisam registrar as migrations já aplicadas antes de usar esse inicializador; esse histórico é exclusivo do harness. Supabase hospedado continua usando o histórico oficial do CLI.

Os rollbacks são destrutivos, separados em `supabase/rollbacks`, devem ser executados em ordem reversa e não devem ser usados em produção para remover dados reais. O teste dos contratos não significa aprovação de produção nem configuração do backend hospedado.
