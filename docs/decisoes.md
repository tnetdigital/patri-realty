# Decisões de correção — 22/10/2026

- Assinatura paga vigente prevalece; concessões são assinaturas de origem admin em tabela própria, com validade, autor e motivo, preservando a relação única com cobrança Stripe. A função effective_plan resolve todos os benefícios.
- Estornos conciliam invoice, charge e PaymentIntent; valores acumulados evitam duplicidade e permitem estornos parciais.
- Identidade desconhecida usa [PENDENTE]. O CNPJ 53.816.326/0001-58 já foi fornecido pelo usuário e será preservado; dígitos conferem, sem consulta cadastral oficial.
- Documentos levam [REVISÃO JURÍDICA NECESSÁRIA]. Logotipo original ausente terá texto Patri Realty com marcador.
- Evento e contato mínimos, mensagens persistidas e protegidas. Gateway de login obrigatório. Turnstile com interruptor e bloqueio seguro em produção sem chave.
- Cada rotina terá migration condicional própria; nenhuma instalação de cron em produção. Integrações externas permanecem desligadas até homologação com credenciais.
- Trabalho somente local e homologação; não publicar produção. Credenciais locais em compose/bootstrap permanecem fora do Git.

- Contato exige conta ativa para permitir persistência com autoria e limitação, sem publicar mensagens de outras pessoas. Evento não inventa datas ou inscrições.
- O relatório editorial mede tempo visível em blocos de 30 segundos, só após consentimento. O calendário comercial soma valor integral dos contratos que cruzam o período, sem rateio e sem duplicar banners.
- Marca anterior não foi identificada na especificação. A busca de regressão exclui nomes de exemplos anteriores (CondoHub/CondoConnect) e nomes de portais de referência usados indevidamente como marca, preservando as fontes legítimas da taxonomia.
- O original do logo segue ausente no recurso da hospedagem. A prévia mantém o slot Logotipo e mostra marcador; não se declara arquivo aplicado.
- O template de hospedagem não aceita a diretiva de importação do Tailwind 4: a prévia usa CSS previamente compilado equivalente; o projeto local continua com Tailwind 4 atualizado.
