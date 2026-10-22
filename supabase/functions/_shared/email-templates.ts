export type EmailPayload = {
  empresa?: string;
  token?: string;
  dia?: number;
  acao?: string;
  motivo?: string;
  teste_ate?: string;
  preco_centavos?: number;
  pedidos?: number;
  editor?: boolean;
  fim?: string;
  servico?: string;
  slug?: string;
  visitas?: number;
  mes?: string;
};
export function renderEmail(
  job: { template: string; payload: EmailPayload },
  site: string,
) {
  const payload = job.payload;
  const invite = job.template === "convite_equipe";
  const subject = invite
    ? `Convite para a equipe — ${payload.empresa}`
    : job.template === "perfil_em_analise"
      ? "Recebemos o perfil da sua empresa"
      : "Sua empresa está quase pronta para se conectar";
  const target = invite
    ? `${site.replace(/\/$/, "")}/#/convite/${encodeURIComponent(payload.token || "")}`
    : `${site.replace(/\/$/, "")}/#/painel`;
  let body = invite
    ? `Você foi convidado para editar a página de ${payload.empresa}. O convite vale por 14 dias.`
    : job.template === "perfil_em_analise"
      ? `O perfil de ${payload.empresa} foi enviado para análise. A página permanece privada até a aprovação.`
      : `Complete o perfil de ${payload.empresa} para enviar sua página para análise.`;
  if (["contrato_renovar", "destaque_renovar"].includes(job.template))
    body = `A vigência de ${payload.empresa} termina em ${payload.fim}. Confira a renovação no painel comercial.`;
  const lead =
    job.template === "novo_orcamento" ||
    job.template === "orcamento_sem_resposta";
  let finalSubject =
    job.template === "novo_orcamento"
      ? "Novo pedido de orçamento"
      : job.template === "orcamento_sem_resposta"
        ? "Pedido sem resposta há 48 horas"
        : job.template === "orcamento_confirmado"
          ? "Recebemos seu pedido de orçamento"
          : subject;
  let finalTarget =
    job.template === "orcamento_confirmado"
      ? `${site.replace(/\/$/, "")}/guia`
      : lead
        ? `${site.replace(/\/$/, "")}/painel/orcamentos`
        : target;
  if (lead)
    body =
      job.template === "novo_orcamento"
        ? `Sua empresa ${payload.empresa} recebeu um pedido. Acesse o painel para ver os dados e responder.`
        : `Um pedido para ${payload.empresa} está sem resposta há pelo menos 48 horas. Acesse o painel.`;
  if (job.template === "orcamento_confirmado")
    body =
      "Seu pedido foi registrado e encaminhado aos fornecedores selecionados. A resposta será feita pelos contatos informados. A Patri Realty não garante prazo ou contratação.";

  if (["contrato_renovar", "destaque_renovar"].includes(job.template)) {
    finalSubject = "Renovação comercial na Patri Realty";
    finalTarget = site.replace(/\/$/, "") + "/admin/comercial";
  }
  if (job.template === "interesse_marketing") {
    finalSubject = "Novo interesse de marketing";
    body = `${payload.empresa} solicitou atendimento sobre ${payload.servico}. Consulte os detalhes no painel comercial.`;
    finalTarget = site.replace(/\/$/, "") + "/admin/marketing";
  }
  if (job.template === "convite_avaliar") {
    finalSubject = "Conte sua experiência com o fornecedor";
    body = `Você pediu um orçamento a ${payload.empresa}. Se houve atendimento, compartilhe sua experiência. A avaliação exige login e passa por moderação.`;
    finalTarget =
      site.replace(/\/$/, "") +
      "/fornecedor/" +
      encodeURIComponent(payload.slug || "") +
      "#avaliacoes";
  }
  if (job.template === "relatorio_mensal") {
    finalSubject = "Seu resumo mensal de resultados";
    body = `${payload.empresa}: ${payload.visitas || 0} visitas ao perfil no mês ${payload.mes}. Consulte cliques, orçamentos e a comparação de períodos no painel.`;
    finalTarget = site.replace(/\/$/, "") + "/painel/metricas";
  }
  if (job.template === "newsletter_confirmar") {
    finalSubject = "Confirme sua inscrição na Patri Realty";
    body =
      "Você solicitou receber as novidades da Patri Realty. Confirme sua inscrição pelo link, válido por 48 horas. Se não fez o pedido, ignore esta mensagem.";
    finalTarget =
      site.replace(/\/$/, "") +
      "/newsletter/confirmar/" +
      encodeURIComponent(payload.token || "");
  }
  if (job.template === "newsletter_confirmada") {
    finalSubject = "Inscrição confirmada na Patri Realty";
    body =
      "Seu duplo aceite foi registrado. Você pode cancelar a inscrição a qualquer momento pelo link abaixo.";
    finalTarget =
      site.replace(/\/$/, "") +
      "/newsletter/descadastrar/" +
      encodeURIComponent(payload.token || "");
  }
  if (job.template.startsWith("materia_")) {
    finalSubject =
      job.template === "materia_em_revisao"
        ? "Matéria recebida para revisão"
        : job.template === "materia_aprovada"
          ? "Matéria aprovada"
          : "Revisão da sua matéria";
    body = `${payload.empresa}. ${payload.motivo || "Acompanhe o fluxo de revisão no painel."}`;
    finalTarget =
      site.replace(/\/$/, "") +
      (payload.editor ? "/admin/conteudo" : "/painel/materias");
  }
  if (
    [
      "regua_plano",
      "fim_teste",
      "pagamento_confirmado",
      "pagamento_falhou",
    ].includes(job.template)
  ) {
    finalTarget = site.replace(/\/$/, "") + "/painel/plano";
    if (job.template === "fim_teste") {
      finalSubject = "Seu plano agora é Grátis";
      body =
        "O teste da sua empresa terminou. O conteúdo excedente foi preservado e pode voltar ao assinar. Acesse seu plano para consultar limites e créditos.";
    } else if (job.template === "pagamento_confirmado") {
      finalSubject = "Pagamento confirmado na Patri Realty";
      body =
        "Seu pagamento foi confirmado. Consulte os benefícios, créditos e extrato no painel.";
    } else if (job.template === "pagamento_falhou") {
      finalSubject = "Atualize seu pagamento na Patri Realty";
      body =
        "O pagamento não foi confirmado. Atualize seu cartão no portal. Após a carência de sete dias, os benefícios passam ao Grátis, preservando seu conteúdo.";
    } else {
      finalSubject =
        payload.dia === 0
          ? "Boas-vindas ao Premium em teste"
          : payload.dia === 88
            ? "Seu teste Premium está terminando"
            : "Acompanhe seu teste Premium";
      body = `Sua empresa ${payload.empresa} está no teste Premium até ${payload.teste_ate}. Pedidos recebidos: ${payload.pedidos || 0}. ${payload.preco_centavos ? "Mensalidade configurada: R$ " + (payload.preco_centavos / 100).toFixed(2) : "Preço final ainda em definição."} Consulte benefícios e complete seu perfil no painel. Nenhuma assinatura é cobrada automaticamente ao fim do teste.`;
    }
  }
  if (job.template === "convite_proprietario") {
    finalSubject = "Convite para assumir a página da empresa";
    finalTarget =
      site.replace(/\/$/, "") +
      "/assumir/" +
      encodeURIComponent(payload.token || "");
    body = `Você foi convidado a assumir a página de ${payload.empresa}. Entre com este e-mail para aceitar. O convite vale por 14 dias.`;
  }
  if (job.template === "decisao_fornecedor") {
    finalSubject =
      payload.acao === "aprovar"
        ? "Perfil aprovado na Patri Realty"
        : payload.acao === "ajuste"
          ? "Ajustes solicitados no perfil"
          : "Atualização do perfil na Patri Realty";
    body =
      payload.acao === "aprovar"
        ? `O perfil de ${payload.empresa} foi aprovado e está publicado. Consulte as datas do teste no painel.`
        : `Atualizamos o status do perfil de ${payload.empresa}. ${payload.motivo || "Acesse o painel para acompanhar."}`;
    finalTarget = site.replace(/\/$/, "") + "/painel";
  }

  return { invite, finalSubject, finalTarget, body };
}
