import { deliverEmail } from "../_shared/email-delivery.mjs";
import { logJobFailure } from "../_shared/job-log.mjs";
import type { Database } from "../../../src/lib/database.types.ts";
import { renderEmail, type EmailPayload } from "../_shared/email-templates.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
const escape = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
Deno.serve(async (request) => {
  const secret = Deno.env.get("SUPPLIER_JOBS_SECRET");
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    resend = Deno.env.get("RESEND_API_KEY"),
    from = Deno.env.get("EMAIL_FROM"),
    site = Deno.env.get("SITE_URL");
  if (!url || !key || !site)
    return Response.json(
      { error: "Serviços de e-mail não configurados." },
      { status: 503 },
    );
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
  if (Deno.env.get("EMAIL_DELIVERY_ENABLED") !== "true" || !resend || !from) {
    const pending = await client
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente");
    return Response.json({ simulado: true, pendentes: pending.count ?? 0 });
  }

  const publication = await client.rpc("publicar_agendadas");
  if (publication.error) {
    await logJobFailure(url, key, "supplier-jobs", "PUBLICATION_FAILED");
    return Response.json(
      { error: "Falha ao publicar a fila editorial." },
      { status: 500 },
    );
  }
  const growthPrep = await client.rpc("rotinas_crescimento");
  if (growthPrep.error) {
    await logJobFailure(url, key, "supplier-jobs", "GROWTHPREP_FAILED");
    return Response.json(
      { error: "Falha nas rotinas de crescimento." },
      { status: 500 },
    );
  }
  const commercialPrep = await client.rpc("alertas_comerciais");
  if (commercialPrep.error) {
    await logJobFailure(url, key, "supplier-jobs", "COMMERCIALPREP_FAILED");
    return Response.json(
      { error: "Falha nos alertas comerciais." },
      { status: 500 },
    );
  }
  const billingPrep = await client.rpc("processar_ciclo_planos");
  if (billingPrep.error) {
    await logJobFailure(url, key, "supplier-jobs", "BILLINGPREP_FAILED");
    return Response.json(
      { error: "Falha no ciclo de planos." },
      { status: 500 },
    );
  }
  const leadPrep = await client.rpc("preparar_alertas_orcamento");
  if (leadPrep.error) {
    await logJobFailure(url, key, "supplier-jobs", "LEADPREP_FAILED");
    return Response.json(
      { error: "Falha ao preparar alertas." },
      { status: 500 },
    );
  }
  const prep = await client.rpc("preparar_lembretes_fornecedor");
  if (prep.error) {
    await logJobFailure(url, key, "supplier-jobs", "PREP_FAILED");
    return Response.json(
      { error: "Falha ao preparar notificações." },
      { status: 500 },
    );
  }
  const { data: jobs, error } = await client.rpc("reservar_emails_fornecedor");
  if (error)
    return Response.json(
      { error: "Falha ao reservar notificações." },
      { status: 500 },
    );
  let sent = 0,
    failed = 0;
  for (const job of jobs ?? []) {
    const payload = job.payload as EmailPayload;
    let { finalSubject, finalTarget, body } = renderEmail(
      { template: job.template, payload },
      site,
    );
    const invite = job.template === "convite_equipe";
    try {
      if (job.template === "conta_admin") {
        if (payload.acao === "confirmacao") {
          const sent = await client.auth.resend({
            type: "signup",
            email: job.destinatario,
            options: { emailRedirectTo: site.replace(/\/$/, "") + "/area" },
          });
          if (sent.error) throw sent.error;
          await client
            .from("email_outbox")
            .update({
              status: "enviado",
              processado_em: new Date().toISOString(),
              payload: {},
            })
            .eq("id", job.id);
          await client.from("email_log").insert({
            destinatario: job.destinatario,
            template: job.template,
            assunto: "Reenvio de confirmação",
            status: "enviado",
            enviado_em: new Date().toISOString(),
          });
          continue;
        }
        const link = await client.auth.admin.generateLink({
          type: "recovery",
          email: job.destinatario,
          options: { redirectTo: site.replace(/\/$/, "") + "/redefinir-senha" },
        });
        if (link.error) throw link.error;
        finalTarget = link.data.properties.action_link;
        finalSubject = "Redefina sua senha na Patri Realty";
        body =
          "A administração solicitou a redefinição da sua senha. Use este link pessoal para escolher uma nova senha. Se não reconhecer a solicitação, entre em contato com a equipe.";
      }
      const response = await deliverEmail(
        { enabled: true, key: resend, from },
        {
          id: job.id,
          payload: {
            from,
            ...(job.template === "newsletter_confirmada"
              ? {
                  headers: {
                    "List-Unsubscribe": `<${url}/functions/v1/newsletter?unsubscribe=${encodeURIComponent(payload.token || "")}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                  },
                }
              : {}),
            to: [job.destinatario],
            subject: finalSubject,
            html: `<p>${escape(body)}</p><p><a href="${escape(finalTarget)}">${job.template === "newsletter_confirmar" ? "Confirmar inscrição" : job.template === "newsletter_confirmada" ? "Cancelar inscrição" : invite || job.template === "convite_proprietario" ? "Aceitar convite" : job.template === "orcamento_confirmado" ? "Conhecer o guia" : "Acessar meu painel"}</a></p>`,
            text: `${body}\n\n${finalTarget}`,
          },
        },
      );
      if (response.simulated) continue;
      if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
      const log = await client.from("email_log").insert({
        destinatario: job.destinatario,
        template: job.template,
        assunto: finalSubject,
        status: "enviado",
        enviado_em: new Date().toISOString(),
      });
      if (log.error) throw log.error;
      const mark = await client
        .from("email_outbox")
        .update({
          status: "enviado",
          processado_em: new Date().toISOString(),
          payload: { empresa: payload.empresa },
          erro: null,
        })
        .eq("id", job.id);
      if (mark.error) throw mark.error;
      sent++;
    } catch (error) {
      failed++;
      await logJobFailure(url, key, "supplier-jobs", "EMAIL_FAILED");
      const note = error instanceof Error ? error.message : "Falha no envio";
      await client.from("email_log").insert({
        destinatario: job.destinatario,
        template: job.template,
        assunto: finalSubject,
        status: "falhou",
        erro: note,
      });
      await client
        .from("email_outbox")
        .update({
          status: job.tentativas >= 5 ? "falhou" : "pendente",
          erro: note,
        })
        .eq("id", job.id);
    }
  }
  return Response.json({ sent, failed });
});
