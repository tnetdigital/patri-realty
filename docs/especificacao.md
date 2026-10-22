# Patri Realty: especificação para o Codex

Oct 19, 2026 · @Tercio Patini

Especificação completa do portal Patri Realty (guia de fornecedores para condomínios, com matérias, revista, evento e módulo comercial). Use como fonte única: o Codex deve implementar na ordem da seção 11 e conferir cada critério de aceite antes de avançar.

## 1. Visão geral, stack e convenções

O Patri Realty conecta síndicos a fornecedores de condomínio. O fornecedor se cadastra sozinho, monta a própria página e recebe pedidos de orçamento; a equipe aprova, modera e vende publicidade. Receita: planos, orçamentos avulsos por crédito, banners, destaques por segmento, matérias patrocinadas e serviços de marketing.

| Item | Decisão |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, React Hook Form + Zod |
| Backend | Supabase: Auth, Postgres com RLS, Storage, Edge Functions (Deno), pg\_cron |
| E-mail | Resend (domínio próprio com SPF e DKIM) |
| Pagamento | Stripe Checkout (cartão e Pix) com webhook |
| Idioma | Português do Brasil; datas dd/mm/aaaa; moeda R$ |
| Layout | Mobile-first; breakpoints do Tailwind |
| Cor primária | Azul-petróleo #0F4C5C; destaque laranja #E36414; fonte Inter |
| Hospedagem | Qualquer host estático (ex.: Vercel); variáveis em .env |

Convenções de código:

- Pastas: `src/pages`, `src/components`, `src/features/<módulo>`, `src/lib`, `src/hooks`, `supabase/migrations`, `supabase/functions`.
- Todo acesso a dados passa por funções em `src/features/<módulo>/api.ts`; componentes não chamam o Supabase direto.
- Toda mudança de banco vira uma migration numerada e reversível. Nunca editar o banco só pelo painel.
- Toda tabela nasce com RLS ativado; sem política, ninguém acessa.
- Nada é apagado de verdade: usar campo `status` ou `deletado_em`.
- Tipos do banco gerados com `supabase gen types` e versionados.
- Validar entradas no cliente (Zod) e no servidor (Edge Function ou constraint).
- Segredos (Stripe, Resend, service role) só em Edge Functions e variáveis de ambiente, nunca no navegador.
- Texto da interface em um arquivo de textos central, em português, para facilitar ajustes.

## 2. Usuários, papéis e permissões

Seis tipos de usuário. O papel fica na tabela `user_roles` (nunca no perfil) e é checado no banco pela função `has_role(uid, role)`; a interface só esconde o que o banco já bloqueia.

| Papel | Quem é | Como entra | Acessa |
| --- | --- | --- | --- |
| visitante | Qualquer pessoa sem login | — | Site público, formulário de orçamento, newsletter |
| sindico | Síndico, morador ou administrador de condomínio | Cadastro livre | Site público + avaliar fornecedores + histórico dos seus pedidos |
| fornecedor | Dono ou responsável de uma empresa | Cadastro livre, publicação após aprovação | `/painel` (só a própria empresa) |
| editor | Equipe de redação | Criado por admin | `/admin/conteudo` (matérias, revistas, pautas, newsletter, aprovação de matérias de fornecedor) |
| comercial | Equipe de vendas | Criado por admin | `/admin/comercial` (contratos, banners, destaques, preços, relatórios) e leitura de fornecedores |
| admin | Dono e gestores | Criado por outro admin ou direto no banco (primeiro) | Tudo |

Regras:

- Um usuário pode ter mais de um papel (ex.: sindico + fornecedor). A interface mostra um seletor de área quando houver mais de um.
- Cada fornecedor tem um dono (`dono_id`) e pode ter até 3 membros da equipe (tabela `fornecedor_membros`, papel `dono` ou `editor`). O dono convida por e-mail; o membro edita a página mas não muda plano nem pagamento.
- Conta desativada (`profiles.ativo = false`) não entra e não aparece publicamente.
- Só admin cria, altera ou remove os papéis admin, editor e comercial.

### Matriz de permissões

Legenda: L = ler, C = criar, E = editar, A = aprovar ou moderar, X = não acessa. "Próprio" = só os registros ligados à própria conta ou empresa.

| Recurso | visitante | sindico | fornecedor | editor | comercial | admin |
| --- | --- | --- | --- | --- | --- | --- |
| Fornecedores publicados | L | L | L | L | L | L |
| Fornecedor (qualquer status) | X | X | L, E próprio | X | L | L, E, A |
| Serviços, mídias, cases, FAQ | L (publicados) | L | C, E próprio | X | L | C, E |
| Orçamentos (leads) | C | C, L próprio | L, E próprio (status, notas) | X | L | L, E |
| Avaliações | L (publicadas) | C, L, E própria | L, responder própria | X | X | L, A |
| Matérias publicadas | L | L | L | L | L | L |
| Matérias (todas) | X | X | C, L, E próprias (rascunho) | C, E, A | L | C, E, A |
| Revistas, categorias, pautas | L (revistas) | L | L (revistas) | C, E | L | C, E |
| Newsletter (inscritos) | C (inscrever) | C | C | L, exportar | X | L, exportar |
| Banners, destaques, contratos | X | X | L próprio | L (banners ativos) | C, E | C, E |
| Planos, preços, créditos | L (planos) | X | L próprio | X | L, E (preços) | C, E |
| Métricas da empresa | X | X | L próprio (se plano permitir) | X | L | L |
| Usuários e papéis | X | E próprio perfil | E próprio perfil | X | X | C, E, A |
| Registro de ações (audit\_log) | X | X | X | X | L (comercial) | L |
| Configurações do portal | X | X | X | X | X | E |

## 3. Cadastro, login e recuperação de acesso

Autenticação por Supabase Auth (e-mail e senha). Login social (Google) é opcional na fase 2.

### Telas

| Rota | Função |
| --- | --- |
| `/cadastrar` | Escolha "Sou síndico" ou "Sou fornecedor", depois formulário |
| `/entrar` | E-mail, senha, "esqueci minha senha", link para cadastro |
| `/confirmar-email` | Aviso de confirmação pendente e botão "reenviar e-mail" |
| `/recuperar-senha` | Pede o e-mail e envia o link |
| `/redefinir-senha` | Define a nova senha a partir do link |
| `/convite/[token]` | Aceite de convite (membro de equipe de fornecedor ou fornecedor importado) |
| `/conta` | Dados pessoais, trocar senha e e-mail, baixar ou apagar dados (LGPD) |

### Campos do cadastro

| Campo | Síndico | Fornecedor | Regra |
| --- | --- | --- | --- |
| Nome completo | sim | sim | 3 a 120 caracteres |
| E-mail | sim | sim | Único; confirmação obrigatória |
| Senha | sim | sim | Mínimo 8, com letra e número; bloquear senhas comuns |
| Telefone/WhatsApp | opcional | sim | Máscara brasileira (DDD + número) |
| Cidade e estado | sim | — | Lista do IBGE |
| Nome do condomínio | opcional | — | Texto livre |
| Cargo | opcional (síndico, morador, administrador) | — | Lista fixa |
| Nome da empresa e CNPJ | — | sim | CNPJ validado por dígito verificador; único |
| Aceite dos Termos e da Política de Privacidade | sim | sim | Obrigatório; grava versão e data em `consentimentos` |
| Newsletter | opcional | opcional | Caixa desmarcada por padrão |

### Fluxos

1. **Cadastro de síndico:** cria usuário, `profiles` e papel `sindico`, envia e-mail de confirmação e, depois dele, leva à home.
2. **Cadastro de fornecedor:** cria usuário, `profiles`, papel `fornecedor` e um registro em `fornecedores` com status `rascunho`, `dono_id` = usuário e `cadastro_em` = agora. Depois da confirmação, abre o assistente de /painel (seção 4).
3. **Fornecedor importado:** o admin importa por CSV; o dono recebe um convite com token (válido por 14 dias) para criar a senha e assumir a página.
4. **Login:** redireciona por papel: admin e comercial para `/admin`, editor para `/admin/conteudo`, fornecedor para `/painel`, síndico para `/`. Com vários papéis, vai ao seletor de área.
5. **Recuperação de senha:** link por e-mail com validade de 1 hora e uso único.
6. **Sessão:** expira em 7 dias de inatividade; "sair" encerra a sessão no navegador.

### Segurança

- Limite de 5 tentativas de login por e-mail e por IP a cada 15 minutos, depois bloqueio temporário.
- Mensagens de erro genéricas ("e-mail ou senha incorretos"), sem revelar se a conta existe.
- CAPTCHA (Cloudflare Turnstile) em cadastro e recuperação.
- Rotas protegidas por componente `RequireRole` e por RLS; nunca confiar só na interface.
- Troca de e-mail exige confirmação no novo endereço.
- Conta apagada: dados pessoais anonimizados; fornecedores, pedidos e avaliações ficam sem identificação pessoal.

## 4. Cadastro do fornecedor e página pública

O fornecedor monta a página sozinho em `/painel`, num assistente de 5 passos que salva a cada passo. O perfil só vai ao ar depois da aprovação do admin.

### Status do perfil

| Status | Significado | Visível ao público |
| --- | --- | --- |
| rascunho | Cadastro em andamento | Não |
| em\_analise | Enviado para aprovação | Não |
| ajuste\_solicitado | Admin pediu correção (com motivo) | Não |
| publicado | Aprovado | Sim |
| suspenso | Retirado pelo admin | Não |
| recusado | Reprovado (com motivo) | Não |

Transições: rascunho → em\_analise → publicado | ajuste\_solicitado | recusado; ajuste\_solicitado → em\_analise; publicado → suspenso → publicado. Cada transição grava `audit_log` e envia e-mail ao dono.

### Assistente de cadastro (passo a passo)

| Passo | Campos | Validações |
| --- | --- | --- |
| 1. Empresa | Nome fantasia, razão social, CNPJ, WhatsApp, telefone, e-mail comercial, site, Instagram, endereço (CEP com preenchimento automático) | Nome fantasia obrigatório; WhatsApp obrigatório; site com `https://`; Instagram sem `@` |
| 2. Marca | Logo (quadrado, mínimo 400×400) e capa (16:9, mínimo 1600×900) | jpg, png ou webp até 5 MB; recorte no navegador; gerar versões menores |
| 3. Sobre | Descrição curta (até 160 caracteres), texto "Sobre a empresa" (até 2.000), ano de fundação, segmentos (1 a 3) | Descrição curta obrigatória; ao menos 1 segmento |
| 4. Onde atende | Estados e cidades (ou "todo o estado") | Ao menos 1 região |
| 5. Conteúdo | Serviços (título, descrição, foto), galeria de fotos, vídeo (link do YouTube), cases (condomínio, descrição, foto), perguntas frequentes, certificações | Limites conforme o plano (seção 8) |

Regras do assistente:

- Barra "Perfil X% completo" com a lista do que falta; prazo de 7 dias contados do cadastro, com lembretes nos dias 2, 5 e 7.
- "Enviar para análise" só habilita com o mínimo: logo, descrição curta, 1 segmento, 1 região e WhatsApp.
- Pré-visualização da página como o público verá.
- Depois de publicado, edições entram direto, mas campos sensíveis (nome fantasia, CNPJ, logo) voltam para análise e a versão antiga continua no ar até a decisão.
- Todo texto é limpo de HTML e links suspeitos; rejeitar telefone e e-mail digitados no texto "Sobre" (para não fugir do formulário de orçamento).
- CNPJ duplicado cai em fluxo de "reivindicar página": envia pedido ao admin com prova de vínculo.

### Página pública `/fornecedor/[slug]`

1. Capa, logo, nome, segmentos, cidade-sede, nota média e selo verificado.
2. Barra fixa no celular: WhatsApp, Ligar, Pedir orçamento.
3. Sobre a empresa e certificações.
4. Serviços (cards).
5. Galeria e vídeo.
6. Onde atende.
7. Clientes e cases.
8. Avaliações (média, lista, resposta do fornecedor).
9. Perguntas frequentes (acordeão).
10. Instagram: botão Seguir e até 6 posts por link.
11. Formulário de orçamento.
12. Matérias do fornecedor e fornecedores parecidos.

O slug é gerado do nome fantasia, único, sem acentos, e não muda após a publicação (mudanças criam redirecionamento 301). Cada bloco só aparece se tiver conteúdo.

## 5. Modelo de dados

Postgres (Supabase). Todas as tabelas têm `id uuid` (padrão `gen_random_uuid()`), `criado_em timestamptz`, `atualizado_em timestamptz` (trigger) e RLS ativado. Chaves estrangeiras com `on delete restrict`, salvo indicação. Índices em toda FK e em `slug`, `status` e datas de filtro. Busca com extensões `unaccent` e `pg_trgm`.

### Identidade e acesso

| Tabela | Colunas principais | RLS (resumo) |
| --- | --- | --- |
| profiles | id (= auth.users.id), nome, telefone, cidade, estado, condominio\_nome, cargo, ativo | Dono lê e edita o próprio; admin lê e edita todos |
| user\_roles | user\_id, role (enum: admin, editor, comercial, fornecedor, sindico) | Usuário lê os próprios; só admin escreve |
| consentimentos | user\_id ou email, documento (termos, privacidade, cookies, newsletter), versao, aceito\_em, origem | Insert público controlado; admin lê |
| convites | token (hash), email, tipo (membro\_fornecedor, dono\_importado), fornecedor\_id, expira\_em, usado\_em | Só Edge Function e admin |

### Catálogo e fornecedores

| Tabela | Colunas principais | RLS (resumo) |
| --- | --- | --- |
| segmentos | nome, slug, icone, ordem, ativo | Público lê ativos; admin escreve |
| estados / cidades | uf, nome, slug, ibge\_id | Público lê |
| fornecedores | dono\_id, nome\_fantasia, razao\_social, cnpj (único), slug (único), descricao\_curta, sobre, ano\_fundacao, logo\_url, capa\_url, whatsapp, telefone, email, site, instagram, cep, endereco, cidade\_id, video\_url, status, motivo\_status, selo\_verificado, plano\_id, teste\_ate, cadastro\_em, publicado\_em, completude | Público lê só `publicado`; dono e membros editam o próprio; admin tudo |
| fornecedor\_membros | fornecedor\_id, user\_id, papel (dono, editor) | Dono gerencia; membro lê |
| fornecedor\_segmentos | fornecedor\_id, segmento\_id (máx. 3) | Segue o fornecedor |
| cobertura | fornecedor\_id, estado\_uf, cidade\_id (nulo = estado todo) | Segue o fornecedor |
| servicos | fornecedor\_id, titulo, descricao, foto\_url, ordem, oculto\_por\_plano | Segue o fornecedor |
| midias | fornecedor\_id, tipo (foto, video), url, legenda, ordem, oculto\_por\_plano | Segue o fornecedor |
| cases | fornecedor\_id, condominio, descricao, foto\_url, ordem | Segue o fornecedor |
| faqs | fornecedor\_id, pergunta, resposta, ordem | Segue o fornecedor |
| fornecedor\_alteracoes | fornecedor\_id, autor\_id, campo, antes, depois, pendente, decidido\_por | Dono lê; admin decide |
| slug\_redirects | tipo, slug\_antigo, slug\_novo | Público lê |

### Orçamentos e avaliações

| Tabela | Colunas principais | RLS (resumo) |
| --- | --- | --- |
| leads | fornecedor\_id, segmento\_id, solicitante\_id (opcional), nome, email, telefone, condominio\_nome, cidade, uf, unidades, urgencia, mensagem, status (novo, visto, respondido, sem\_resposta, bloqueado\_plano, spam), origem, consentimento\_id, visto\_em, respondido\_em | Insert público (via Edge Function); fornecedor lê os próprios (contato oculto se bloqueado\_plano); admin tudo |
| lead\_notas | lead\_id, autor\_id, texto | Fornecedor dono do lead e admin |
| avaliacoes | fornecedor\_id, autor\_id, nota (1 a 5), titulo, texto, condominio, status (pendente, publicada, removida), resposta\_fornecedor, resposta\_em, denuncia\_motivo | Público lê `publicada`; autor edita a própria; admin modera |

### Planos e dinheiro

| Tabela | Colunas principais | RLS (resumo) |
| --- | --- | --- |
| planos | nome, slug, preco\_mensal, limite\_orcamentos\_mes, limite\_fotos, limite\_servicos, limite\_cases, materias\_blog\_mes, materias\_parceiros\_mes, tem\_metricas, tem\_selo, tem\_video, prioridade\_busca, ativo | Público lê ativos; admin e comercial escrevem preço |
| assinaturas | fornecedor\_id, plano\_id, status (teste, ativa, cancelada, vencida), origem (teste, pago), inicio, fim, stripe\_subscription\_id | Fornecedor lê a própria; admin tudo |
| carteira\_creditos | fornecedor\_id (único), saldo | Fornecedor lê; escrita só por função do servidor |
| creditos\_extrato | fornecedor\_id, tipo (compra, uso, ajuste, cortesia), quantidade, valor, lead\_id, stripe\_payment\_id | Fornecedor lê; escrita só servidor |
| pedidos\_pagamento | fornecedor\_id, tipo, valor, status, stripe\_session\_id | Fornecedor lê; escrita só servidor |

### Conteúdo

| Tabela | Colunas principais | RLS (resumo) |
| --- | --- | --- |
| categorias | nome, slug | Público lê; editor e admin escrevem |
| materias | titulo, slug, resumo, corpo, imagem\_capa, categoria\_id, autor\_id, tipo (editorial, patrocinada, fornecedor), fornecedor\_id, status (rascunho, em\_revisao, ajuste, agendada, publicada, arquivada), publicada\_em, seo\_titulo, seo\_descricao, canonical\_url, tempo\_leitura | Público lê `publicada`; fornecedor cria e vê as próprias; editor e admin tudo |
| materia\_entregas | materia\_id, portal\_id, url\_externa, entregue\_em | Editor e admin |
| portais\_parceiros | nome, url, vagas\_por\_mes, ativo | Editor e admin |
| revistas | titulo, edicao, slug, capa\_url, link\_digital, publicada\_em | Público lê; editor e admin escrevem |
| pautas | titulo, responsavel\_id, data\_prevista, status | Editor e admin |
| newsletter\_inscritos | email (único), nome, cidade, perfil, confirmado, token\_confirmacao, origem | Insert público; editor e admin leem |

### Comercial, métricas e apoio

| Tabela | Colunas principais | RLS (resumo) |
| --- | --- | --- |
| banner\_posicoes | slug, nome, largura, altura | Público lê |
| banners | anunciante\_nome, fornecedor\_id, posicao\_id, imagem\_desktop, imagem\_mobile, link\_destino, segmento\_id, uf, inicio, fim, status, token\_relatorio | Público lê ativos no período; comercial e admin escrevem |
| destaques | fornecedor\_id, segmento\_id, uf, cidade\_id, vaga (1 a 3), inicio, fim, status | Idem; restrição única por segmento, uf, vaga e período |
| contratos | fornecedor\_id, anunciante\_nome, produto, valor, inicio, fim, status, pago, renovacao\_em, observacao | Comercial e admin; fornecedor lê os próprios |
| tabela\_precos | produto, descricao, valor | Público não lê; comercial e admin escrevem |
| eventos | tipo, entidade, entidade\_id, segmento\_id, cidade, origem, sessao\_anonima, criado\_em | Insert público via função; fornecedor lê agregados próprios; admin tudo |
| interesses\_marketing | fornecedor\_id, servico, mensagem, whatsapp, status, notas | Fornecedor insere e lê; admin e comercial gerenciam |
| evento\_interessados | nome, email, empresa, tipo (visitante, expositor), consentimento\_id | Insert público; admin lê |
| contatos | nome, email, assunto, mensagem, status | Insert público; admin lê |
| email\_log | destinatario, template, assunto, status, erro, enviado\_em | Só servidor e admin |
| audit\_log | ator\_id, acao, tabela, registro\_id, antes (jsonb), depois (jsonb), ip\_hash, criado\_em | Só escrita por trigger; admin lê |
| configuracoes | chave, valor (jsonb) | Admin escreve; chaves públicas liberadas para leitura |

Triggers e funções obrigatórias: `has_role`, `handle_new_user` (cria profile), `set_atualizado_em`, `calcular_completude(fornecedor_id)`, `gravar_audit` (nas tabelas sensíveis), `gerar_slug`, `bloquear_lead_por_plano` e `consumir_credito`.

### Tabelas complementares (citadas nas regras das seções 7 a 10)

| Tabela | Colunas principais | RLS (resumo) |
| --- | --- | --- |
| metricas\_diarias | data, entidade, entidade\_id, tipo\_evento, quantidade, segmento\_id, uf | Fornecedor lê as próprias; admin e comercial leem tudo; escrita só pela tarefa noturna |
| reivindicacoes | fornecedor\_id, solicitante\_id, prova\_url, mensagem, status (pendente, aprovada, recusada), decidido\_por | Solicitante lê a própria; admin decide |
| saldo\_materias | fornecedor\_id, mes (aaaa-mm), permitido, usado, cortesia | Fornecedor lê o próprio; escrita só por função do servidor |
| termos\_versoes | documento, versao, publicado\_em, texto | Público lê; admin escreve |

## 6. Mapa de rotas

Todas as rotas públicas têm SEO próprio (title, description, Open Graph, canonical). Rotas de painel e admin ficam com `noindex` e protegidas por `RequireRole`.

### Públicas

| Rota | Página |
| --- | --- |
| `/` | Home: busca, segmentos, destaques, últimas matérias, revista, evento, números |
| `/guia` | Busca e grade de segmentos |
| `/guia/[segmento]` | Lista do segmento com filtros por estado e cidade |
| `/guia/[segmento]/[uf]/[cidade]` | Lista filtrada (página de SEO local) |
| `/busca?q=` | Resultado de busca geral |
| `/fornecedor/[slug]` | Página do fornecedor |
| `/materias`, `/materias/[categoria]`, `/materia/[slug]` | Blog |
| `/revista`, `/revista/[slug]` | Revista |
| `/evento` | Evento e lista de interesse |
| `/para-fornecedores` | Venda dos planos e botão de cadastro |
| `/anuncie` | Produtos de publicidade e formulário |
| `/quem-somos`, `/contato`, `/termos`, `/privacidade` | Institucionais e legais |
| `/r/[id]` | Link rastreado de banner (registra clique e redireciona) |
| `/relatorio/[token]` | Relatório do anunciante, sem login |
| `/sitemap.xml`, `/robots.txt` | SEO |

### Autenticação e conta

`/entrar`, `/cadastrar`, `/confirmar-email`, `/recuperar-senha`, `/redefinir-senha`, `/convite/[token]`, `/conta`, `/area` (seletor quando há mais de um papel).

### Painel do fornecedor (`/painel`, papel fornecedor)

| Rota | Função |
| --- | --- |
| `/painel` | Início: completude do perfil, dias restantes do teste, pendências, resumo de números |
| `/painel/cadastro` | Assistente de 5 passos (empresa, marca, sobre, região, conteúdo) |
| `/painel/pagina` | Editar a página publicada e pré-visualizar |
| `/painel/orcamentos`, `/painel/orcamentos/[id]` | Pedidos recebidos, resposta e notas |
| `/painel/avaliacoes` | Ver e responder avaliações |
| `/painel/metricas` | Visitas, cliques, orçamentos (plano permitindo) |
| `/painel/materias`, `/painel/materias/nova` | Saldo mensal e envio de matérias |
| `/painel/plano` | Plano, comparativo, créditos, extrato, faturas |
| `/painel/anuncios` | Banners e destaques contratados, com números |
| `/painel/cresca-com-a-gente` | Serviços de marketing e diagnóstico |
| `/painel/equipe` | Convidar e remover membros |

### Administração (`/admin`)

| Rota | Papel | Função |
| --- | --- | --- |
| `/admin` | admin, comercial | Painel geral |
| `/admin/fornecedores`, `/admin/fornecedores/[id]` | admin (comercial só lê) | Lista, fila de aprovação, edição |
| `/admin/importar` | admin | Importação por CSV |
| `/admin/orcamentos` | admin, comercial (lê) | Todos os pedidos |
| `/admin/avaliacoes` | admin | Moderação |
| `/admin/segmentos` | admin | Segmentos |
| `/admin/planos` | admin, comercial (preços) | Planos, testes e créditos |
| `/admin/comercial` | admin, comercial | Contratos, banners, destaques, faturamento, preços, relatórios |
| `/admin/conteudo` | admin, editor | Matérias, revistas, pautas, categorias, newsletter, portais parceiros |
| `/admin/marketing` | admin, comercial | Interesses em serviços |
| `/admin/metricas` | admin, comercial | Indicadores do portal |
| `/admin/usuarios` | admin | Usuários e papéis |
| `/admin/auditoria` | admin | Registro de ações |
| `/admin/configuracoes` | admin | Textos, e-mails, códigos de análise, limites |

## 7. Painel administrativo

Layout com barra lateral recolhível, busca global (fornecedor, e-mail, CNPJ) e sino de pendências. Toda tabela tem busca, filtros, ordenação, paginação de 25 itens e exportação CSV. Toda ação de escrita grava em `audit_log`.

### 7.1 Painel geral (`/admin`)

- Cartões: fornecedores em análise, ajustes pendentes, cadastros incompletos há mais de 7 dias, testes que vencem em 15 dias, orçamentos nos últimos 7 dias, orçamentos sem resposta, avaliações pendentes, matérias em revisão, contratos a vencer em 30 dias.
- Cada cartão leva à lista já filtrada.
- Gráfico de cadastros e orçamentos por semana.

### 7.2 Fornecedores

| Recurso | Comportamento |
| --- | --- |
| Lista | Colunas: logo, nome, CNPJ, segmentos, cidade, status, plano, fim do teste, completude, orçamentos no mês. Filtros: status, plano, segmento, estado, selo, com teste vencendo |
| Fila de aprovação | Abre o perfil completo ao lado do checklist: logo legível, descrição sem contato ou propaganda enganosa, CNPJ válido e ativo, fotos próprias, segmentos coerentes |
| Decisões | Aprovar (publica e abre o teste de 90 dias), Pedir ajuste (motivo obrigatório, e-mail ao dono), Recusar (motivo obrigatório) |
| Edição | Admin edita qualquer campo no lugar do fornecedor; a alteração fica no histórico |
| Ações rápidas | Marcar selo verificado, suspender, reativar, trocar plano, estender teste, ajustar créditos, reenviar convite, entrar como o fornecedor ("personificar", somente leitura e registrado) |
| Alterações pendentes | Fila de mudanças sensíveis (nome, CNPJ, logo) com antes e depois lado a lado |
| Reivindicações | Pedidos de assumir página de CNPJ já existente |

### 7.3 Importação em lote (`/admin/importar`)

1. Subir CSV (UTF-8, separador vírgula) com as colunas: `nome_fantasia`, `cnpj`, `segmento`, `cidade`, `uf`, `whatsapp`, `email`, `site`, `instagram`.
2. Pré-visualização com validação por linha (CNPJ, segmento existente, cidade válida, duplicidade) e lista de erros baixável.
3. Confirmação: cria perfis `rascunho` sem dono, em transação por lote de 100 linhas.
4. Opção de enviar convite por e-mail para o dono assumir a página; o convite expira em 14 dias.
5. Relatório final: criados, ignorados e com erro.

### 7.4 Orçamentos

Tabela com todos os pedidos, filtros por status, fornecedor, segmento, cidade e período. Destaque em vermelho para pedidos sem resposta há mais de 48 horas. Detalhe com a linha do tempo (enviado, visto, respondido), e ações: marcar spam, reenviar ao fornecedor, encaminhar a outro fornecedor do mesmo segmento. Comercial só lê.

### 7.5 Avaliações

Fila de pendentes e denunciadas. Ações: publicar, remover (motivo), manter. O fornecedor não pode apagar avaliações, só responder ou denunciar. Regras de moderação: sem dados pessoais, ofensas ou propaganda.

### 7.6 Segmentos

Criar, renomear, reordenar (arrastar), ativar e desativar. Segmento com fornecedores não pode ser apagado, só desativado; renomear atualiza o slug com redirecionamento.

### 7.7 Planos e cobrança

Editar planos e limites, lista de testes com data de fim, assinaturas, extrato de créditos, preço do orçamento avulso e pacotes de crédito. Reenviar e-mails da régua e ver o `email_log`.

### 7.8 Comercial

Quadro de contratos (proposta, ativo, encerrado, cancelado), calendário de ocupação de banners, mapa de vagas de destaque por segmento e estado, faturamento por produto e mês, tabela de preços, e gerador de link do relatório do anunciante.

### 7.9 Conteúdo

Editor rico de matérias (imagens, vídeo, tabelas), agendamento, SEO por matéria, fila de revisão das matérias de fornecedores (aprovar, pedir ajuste com comentário, recusar), revistas, categorias, pautas em quadro (ideia, escrevendo, revisão, publicada), portais parceiros e entregas, e lista de inscritos da newsletter com exportação.

### 7.10 Usuários

Lista com busca; trocar papéis; desativar e reativar; reenviar confirmação; forçar redefinição de senha. O último admin ativo não pode ser removido ou desativado.

### 7.11 Auditoria e configurações

Auditoria: filtros por ator, ação, tabela e período, com antes e depois. Configurações: textos institucionais, e-mail de contato, códigos do Google Analytics e Search Console, prazos (dias de teste, dias de completude, horas para alerta de orçamento), limites de upload e modelos de e-mail com variáveis.

## 8. Regras de negócio

Todos os números abaixo são valores iniciais, guardados em `planos` e `configuracoes` e editáveis no admin. Nenhum limite fica fixo no código.

### 8.1 Planos

| Recurso | Grátis | Premium | Destaque |
| --- | --- | --- | --- |
| Preço mensal | R$ 0 | definir no admin | definir no admin |
| Orçamentos com contato liberado por mês | 3 | ilimitado | ilimitado |
| Fotos na galeria | 1 | 12 | 20 |
| Vídeo | não | sim | sim |
| Serviços e cases | até 3 serviços, sem cases | ilimitado | ilimitado |
| Selo verificado | não | sim | sim |
| Métricas | não | sim | sim |
| Responder avaliações | não | sim | sim |
| Matérias no blog por mês | 0 | 1 | 2 |
| Matérias em portal parceiro por mês | 0 | 0 | 1 |
| Prioridade na busca | normal | normal | alta |

### 8.2 Teste gratuito de 90 dias

1. Ao **aprovar** um fornecedor, criar assinatura `teste` com plano Premium e `teste_ate = aprovação + 90 dias` (valor lido de `configuracoes`).
2. Durante o teste vale tudo do Premium. O fornecedor vê a contagem regressiva no painel.
3. Régua de e-mails: dia 0 boas-vindas; dias 2, 5 e 7 perfil incompleto (se faltar o mínimo); dia 60 e 80 resumo de resultados com o valor do plano; dia 88 aviso final; dia 91 confirmação da migração.
4. Ao fim do teste sem assinatura, a tarefa diária muda o plano para Grátis. Itens acima do limite recebem `oculto_por_plano = true` (nada é apagado) e voltam sozinhos se ele assinar.
5. Admin pode estender o teste (motivo obrigatório, vai ao `audit_log`).
6. Um CNPJ só recebe teste uma vez, mesmo que a conta seja recriada.
7. Cortesia: ao completar 100% do perfil durante o teste, creditar 1 matéria de cortesia.

### 8.3 Orçamentos (leads)

1. Qualquer pessoa envia o formulário (nome, e-mail, WhatsApp, condomínio, cidade e UF, unidades, urgência, mensagem, aceite de privacidade) sem login. A gravação passa por Edge Function com limite de 5 envios por IP por hora e campo anti-robô.
2. Status inicial `novo`. Ao abrir no painel vira `visto`; ao marcar resposta, `respondido`.
3. Tarefa de hora em hora: pedido sem resposta há 48 horas vira `sem_resposta` e dispara lembrete ao fornecedor; admin vê no alerta.
4. No plano Grátis, a partir do 4º pedido do mês civil, o pedido fica `bloqueado_plano`: o fornecedor vê segmento, cidade e data, mas não o contato. Para liberar: assinar ou gastar 1 crédito.
5. Liberar com crédito é atômico: descontar saldo, gravar no extrato e mudar status na mesma transação. Sem saldo, oferecer compra de pacote.
6. Síndico pode marcar "enviar também para até 2 fornecedores parecidos"; cada cópia segue as mesmas regras de plano.
7. 15 dias depois, e-mail ao síndico convidando a avaliar.

### 8.4 Créditos

Pacotes de 10, 25 e 50 créditos com preços na `tabela_precos`. Compra via Stripe Checkout; o webhook credita o saldo. Extrato com compra, uso, ajuste e cortesia. Créditos não expiram na primeira versão. Estorno do pagamento gera lançamento negativo.

### 8.5 Destaque por segmento

Até 3 vagas por segmento e UF no mesmo período (restrição única no banco). Quem tem destaque ativo aparece no topo da lista do segmento naquela UF, com o rótulo "Patrocinado". Ao fim da vigência, volta ao normal; aviso de renovação 15 dias antes.

### 8.6 Ordenação das listas

Destaque ativo, depois plano Destaque, depois Premium e teste, depois Grátis; dentro de cada grupo, nota média e depois ordem alfabética. Fornecedor não publicado nunca aparece em lista, busca, sitemap ou "parecidos".

### 8.7 Completude do perfil (0 a 100)

| Item | Pontos |
| --- | --- |
| Logo | 10 |
| Capa | 10 |
| Descrição curta | 10 |
| Sobre com mais de 300 caracteres | 10 |
| 5 ou mais fotos | 10 |
| 3 ou mais serviços | 10 |
| 1 ou mais case | 10 |
| 3 ou mais perguntas frequentes | 5 |
| Regiões de atendimento | 10 |
| Instagram informado | 5 |
| 3 ou mais avaliações publicadas | 10 |

O diagnóstico mostra o que falta e o impacto de cada item. Abaixo de 60, exibir o cartão "Falar com um especialista".

## 9. Conteúdo, comercial, avaliações, métricas e marketing

### 9.1 Matérias do fornecedor

1. Saldo mensal = limite do plano menos as matérias enviadas no mês; o que não foi usado expira no fim do mês. Cortesia não expira.
2. Envio: título, texto (máximo 600 palavras, 1 link), até 5 fotos. Vai para `em_revisao`; o editor aprova, pede ajuste com comentário ou recusa.
3. Aprovada, publica com o selo "Conteúdo de marca" e o cartão do fornecedor no final.
4. Portal parceiro: o fornecedor escolhe o destino; o admin ou editor registra a entrega e a URL externa. A versão externa deve apontar a original do blog em `canonical_url`.
5. Relatório por matéria: leituras, tempo médio e cliques para o perfil do fornecedor.

### 9.2 Newsletter

Inscrição com duplo aceite (e-mail de confirmação com token). Descadastro em um clique em todo e-mail. Exportação CSV no admin. O envio fica para a fase 2; na fase 1 só se capta a lista.

### 9.3 Banners e anúncios

| Posição | Onde aparece |
| --- | --- |
| home\_topo | Abaixo do cabeçalho da home |
| home\_meio | Entre últimas matérias e revista |
| materia\_meio | No meio do texto das matérias |
| guia\_topo | Topo de `/guia` |
| segmento\_topo | Topo de `/guia/[segmento]` |

Regras: só aparece dentro do período e com status `ativo`; rótulo "Publicidade"; vários banners na mesma posição giram em rodízio; segmentação opcional por segmento e UF; imagem separada para desktop e celular; clique passa por `/r/[id]`; impressão conta só quando o banner fica visível na tela (IntersectionObserver). Relatório do anunciante em `/relatorio/[token]` com impressões, cliques, taxa de clique por período e botão Imprimir/PDF.

### 9.4 Contratos

Produtos: banner, destaque, matéria patrocinada, pacote de orçamentos, plano. Estados: proposta, ativo, encerrado, cancelado; campo `pago` e `renovacao_em`. O sistema não cobra sozinho contratos de publicidade na fase 1: o comercial registra o pagamento manualmente. Alerta 30 e 7 dias antes do fim.

### 9.5 Avaliações

- Só usuário logado avalia, uma vez por fornecedor; nota de 1 a 5 e texto de 30 a 1.000 caracteres.
- Entra `pendente`; o admin publica ou remove. A média só conta as publicadas e só aparece com 1 ou mais.
- Fornecedor não avalia a si mesmo (bloquear por vínculo de dono ou membro e por mesmo e-mail de domínio da empresa quando houver).
- Resposta do fornecedor (planos Premium e Destaque) é pública e fica sob a avaliação.
- Dados estruturados `AggregateRating` só com avaliações reais publicadas.

### 9.6 Métricas

Eventos registrados sem dado pessoal (sem IP, sessão anônima por cookie de análise só após consentimento): `visualizacao_perfil`, `clique_whatsapp`, `clique_telefone`, `clique_site`, `clique_instagram`, `orcamento_enviado`, `visualizacao_materia`, `busca`, `impressao_banner`, `clique_banner`. Tabela de agregação diária (`metricas_diarias`) alimentada por tarefa noturna, para os painéis não varrerem a tabela de eventos. Painel do fornecedor: visitas, cliques por tipo, orçamentos, comparação com 30 dias anteriores, gráfico por dia e e-mail mensal. No plano Grátis, números borrados com convite para assinar.

### 9.7 Cresça com a gente (marketing)

Somente dentro de `/painel`, nunca na home pública. Quatro serviços: Perfil otimizado, Gestão de redes sociais, Campanha de geração de orçamentos, Pacote completo de posicionamento. O botão "Quero saber mais" grava em `interesses_marketing` (status: novo, em\_contato, proposta, fechado) e avisa por e-mail a equipe comercial. O cartão "Falar com um especialista" aparece quando a completude fica abaixo de 60 ou as visitas caem 30% ou mais contra o período anterior.

### 9.8 Instagram

Fase 1: campo `@instagram`, botão Seguir e até 6 links de posts exibidos com embed oficial (se falhar, mostrar imagem e link). A integração por API da Meta fica para depois.

## 10. Serviços de apoio

### 10.1 E-mails transacionais (Resend, via Edge Function)

| Modelo | Quando dispara | Para |
| --- | --- | --- |
| confirmar\_email, redefinir\_senha | Cadastro e recuperação (Supabase Auth com SMTP do Resend) | Usuário |
| boas\_vindas\_fornecedor | Dia 0 | Fornecedor |
| perfil\_incompleto | Dias 2, 5 e 7 | Fornecedor |
| perfil\_em\_analise, perfil\_aprovado, perfil\_ajuste, perfil\_recusado | Mudanças de status | Dono |
| novo\_orcamento | Pedido criado | Fornecedor |
| confirmacao\_orcamento | Pedido criado | Síndico |
| lembrete\_orcamento | 48 horas sem resposta | Fornecedor |
| convite\_avaliar | 15 dias após o pedido | Síndico |
| resumo\_teste\_60, resumo\_teste\_80, aviso\_teste\_88, migracao\_gratis\_91 | Régua do teste | Fornecedor |
| pagamento\_confirmado, pagamento\_falhou | Webhook do Stripe | Fornecedor |
| materia\_em\_revisao, materia\_aprovada, materia\_ajuste | Fluxo de matérias | Fornecedor e editor |
| convite\_equipe, convite\_importado | Convites | Convidado |
| newsletter\_confirmar | Inscrição | Inscrito |
| relatorio\_mensal | Dia 1 de cada mês | Fornecedor com métricas |
| alerta\_contrato | 30 e 7 dias antes do fim | Comercial |

Todo envio grava em `email_log`. Modelos com variáveis, editáveis no admin, com versão em texto simples. Rodapé com descadastro nos e-mails de marketing.

### 10.2 Pagamentos (Stripe)

- Assinaturas: produtos Premium e Destaque, cobrança mensal em cartão; Pix para pacotes de crédito.
- Edge Function `criar-checkout` gera a sessão; Edge Function `webhook-stripe` valida a assinatura do evento e trata `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` e `charge.refunded`.
- Webhook idempotente (guardar `event.id` processado).
- Falha de pagamento: 3 tentativas em 7 dias, depois queda para Grátis.
- Portal do cliente do Stripe para trocar cartão e cancelar.
- Nota fiscal: fora do escopo da fase 1; exportar lista de pagamentos em CSV para a contabilidade.

### 10.3 Armazenamento de arquivos

Buckets: `fornecedores` (público; pasta por fornecedor), `materias` (público), `banners` (público), `revistas` (público), `importacoes` (privado). Aceitar jpg, png, webp e gif (banners); até 5 MB por imagem; gerar miniaturas; remover metadados EXIF; políticas de storage espelham a RLS (fornecedor só escreve na própria pasta).

### 10.4 Tarefas agendadas (pg\_cron + Edge Functions)

| Tarefa | Frequência | O que faz |
| --- | --- | --- |
| alerta\_orcamentos | A cada hora | Marca `sem_resposta` após 48 horas e envia lembrete |
| regua\_teste | Diária, 8h | Envia e-mails por dia desde a aprovação |
| fim\_teste | Diária, 0h30 | Move para Grátis e oculta itens acima do limite |
| completude | Diária | Recalcula completude e lembretes de perfil |
| agregar\_metricas | Diária, 2h | Preenche `metricas_diarias` |
| relatorio\_mensal | Dia 1, 9h | Envia resumo mensal |
| encerrar\_banners\_destaques | Diária | Muda para `encerrado` o que passou do fim |
| convite\_avaliar | Diária | Convites de avaliação de 15 dias |
| publicar\_agendadas | A cada 5 minutos | Publica matérias agendadas |
| expirar\_materias\_mes | Dia 1, 0h | Zera o saldo não usado de matérias |
| limpar\_convites | Diária | Expira convites e tokens vencidos |

### 10.5 SEO

`sitemap.xml` dinâmico (fornecedores publicados, segmentos, segmento+cidade, matérias, revistas, páginas institucionais), `robots.txt` liberando o site e apontando o sitemap, canonical em todas as páginas, breadcrumbs, `LocalBusiness` na página do fornecedor, `Article` nas matérias, `Organization` e `WebSite` com busca na home, 301 para slugs antigos, 404 útil com busca, imagens WebP com carregamento sob demanda, meta `noindex` em `/painel`, `/admin` e resultados de busca interna. Como o conteúdo precisa ser indexado, usar renderização no servidor ou pré-renderização das páginas públicas (ex.: Vite com SSR/prerender, ou migrar a camada pública para Next.js se o Codex julgar necessário, registrando a decisão).

### 10.6 LGPD e privacidade

- Termos e Política de Privacidade em linguagem simples, com versão e data; aceite registrado em `consentimentos`.
- Banner de cookies com recusar e personalizar; análises só após aceite.
- Em `/conta`: baixar meus dados (JSON) e apagar minha conta (anonimiza dados pessoais).
- Dados do pedido de orçamento só ficam visíveis ao fornecedor destinatário e ao admin.
- Retenção: pedidos e avaliações anonimizados 24 meses após exclusão da conta; logs de e-mail por 12 meses.
- Encarregado de dados e e-mail de contato nas configurações.
- A redação final dos textos legais deve ser revisada por advogado.

### 10.7 Qualidade e operação

- Testes: unitários das funções de negócio (completude, limites de plano, créditos), testes de política RLS por papel (um teste por tabela sensível) e testes ponta a ponta (Playwright) dos fluxos: cadastro de fornecedor, aprovação, orçamento, bloqueio por plano e compra de crédito.
- Observabilidade: registro de erros (ex.: Sentry) e logs das Edge Functions.
- Acessibilidade: contraste AA, navegação por teclado, textos alternativos, rótulos em formulários.
- Desempenho: LCP abaixo de 2,5 s no celular nas páginas públicas.
- Ambientes: desenvolvimento, homologação e produção, com dados de exemplo (seed) só fora de produção.

### 10.8 Variáveis de ambiente

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (só servidor), `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`, `TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY`, `SITE_URL`, `EMAIL_FROM`. Entregar `.env.example` sem valores.

## 11. Fases de entrega e critérios de aceite

Implementar na ordem. Cada fase termina com migrations aplicadas, testes passando e os critérios abaixo verificados. Não iniciar a fase seguinte com critério pendente.

| Fase | Entrega | Critérios de aceite |
| --- | --- | --- |
| 1. Fundação | Projeto, layout, Auth, `profiles`, `user_roles`, `has_role`, `RequireRole`, `consentimentos`, `audit_log`, `configuracoes`, seed de segmentos e cidades | Cadastro e login de síndico e fornecedor funcionam; e-mail de confirmação chega; fornecedor não abre `/admin`; admin criado direto no banco abre `/admin`; teste de RLS por papel passa |
| 2. Cadastro do fornecedor | Assistente de 5 passos, uploads, completude, status, equipe, convites | Fornecedor completa os 5 passos e envia para análise; não aparece em nenhuma página pública; outro fornecedor não edita a página; CNPJ inválido e duplicado são barrados |
| 3. Guia público | Home, `/guia`, listas por segmento e cidade, página do fornecedor, busca, SEO, sitemap | Busca por segmento e cidade retorna só publicados; cada página tem title e description próprios; sitemap lista fornecedores publicados; Lighthouse mobile ≥ 90 em SEO e acessibilidade |
| 4. Orçamentos | Formulário, Edge Function, e-mails, painel de pedidos, alerta de 48 horas | Pedido chega por e-mail e no painel; 6º envio por IP em 1 hora é bloqueado; pedido sem resposta vira `sem_resposta` após 48 horas |
| 5. Admin | Painel geral, fornecedores, fila de aprovação, importação, orçamentos, segmentos, usuários, auditoria | Aprovar publica o perfil e abre o teste de 90 dias; pedir ajuste envia e-mail com motivo; CSV com erro aponta a linha; toda ação aparece na auditoria; último admin não pode ser removido |
| 6. Planos e pagamentos | Planos, assinaturas, créditos, Stripe, régua de e-mails, fim do teste | Fim do teste move para Grátis e oculta o excedente; 4º pedido do mês fica bloqueado; compra de crédito em modo de teste aumenta o saldo; webhook repetido não credita duas vezes |
| 7. Conteúdo | Matérias, categorias, revistas, pautas, newsletter, matérias do fornecedor, portais parceiros | Matéria agendada publica no horário; matéria de fornecedor passa por revisão e ganha selo; saldo mensal bloqueia excesso; duplo aceite da newsletter funciona |
| 8. Comercial | Banners, destaques, contratos, preços, relatórios do anunciante | Banner só aparece no período com rótulo "Publicidade"; cliques e impressões contam; 4ª vaga de destaque no mesmo segmento e UF é recusada pelo banco; relatório abre pelo link |
| 9. Avaliações e marketing | Avaliações, métricas, diagnóstico, Cresça com a gente, Instagram por link | Avaliação só aparece depois de aprovada; clique no WhatsApp é contado; diagnóstico cai ao remover fotos; interesse chega ao admin |
| 10. Lançamento | Páginas institucionais e legais, cookies, LGPD em `/conta`, segurança, e-mail com domínio próprio, testes ponta a ponta | Recusar cookies não dispara análises; baixar e apagar dados funcionam; nenhuma tabela sem RLS; Playwright cobre os cinco fluxos críticos |

### Entregáveis em cada fase

- Migrations em `supabase/migrations`, com seeds separados.
- Tipos do banco atualizados.
- Testes automatizados da fase.
- `README` com como rodar, variáveis de ambiente e decisões tomadas.
- Lista curta do que ficou pendente ou foi assumido.

### Fora do escopo da primeira versão

- Integração automática com a API do Instagram.
- Envio de newsletter pelo portal (apenas captação da lista).
- Emissão de nota fiscal.
- Aplicativo móvel nativo (a versão web é mobile-first).
- Marketplace com comissão, venda de ingressos do evento e revista impressa.
- Chat em tempo real entre síndico e fornecedor.

### Decisões em aberto (o Codex deve perguntar ou registrar a suposição)

- Preços finais dos planos, pacotes de crédito e produtos de publicidade.
- Domínio, nome comercial e identidade visual definitiva.
- Lista final de segmentos e de portais parceiros.
- Se a camada pública usa pré-renderização no Vite ou Next.js (ver 10.5).
