const encoder = new TextEncoder();
export async function verifyStripeSignature(
  raw,
  header,
  secret,
  now = Date.now(),
) {
  if (!secret || !header) return false;
  const parts = header.split(",").map((x) => x.split("="));
  const timestamp = parts.find((x) => x[0] === "t")?.[1];
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(timestamp + "." + raw),
    ),
  );
  const expected = [...bytes]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return parts
    .filter((x) => x[0] === "v1")
    .some(([, actual]) => {
      if (actual?.length !== expected.length) return false;
      let different = 0;
      for (let i = 0; i < expected.length; i++)
        different |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
      return different === 0;
    });
}
export function billingHandlers(config) {
  const fetcher = config.fetch || fetch;
  async function rpc(name, data, token = config.serviceKey) {
    const r = await fetcher(config.url + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        apikey:
          token === config.serviceKey ? config.serviceKey : config.anonKey,
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const rawBody = await r.text();
    const body = rawBody ? JSON.parse(rawBody) : null;
    if (!r.ok) throw Error(body?.message || "Falha ao registrar a operação.");
    return body;
  }
  async function stripe(path, body, idempotency) {
    const r = await fetcher("https://api.stripe.com/v1/" + path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + config.stripeKey,
        ...(body
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : {}),
        ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
      },
      ...(body ? { body: new URLSearchParams(body) } : {}),
    });
    const value = await r.json();
    if (!r.ok)
      throw Error(
        "O provedor de pagamento não concluiu a operação. Tente novamente.",
      );
    return value;
  }
  const json = (body, status = 200, origin = "") =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
        Vary: "Origin",
        "Access-Control-Allow-Headers": "authorization,content-type,apikey",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
    });
  return {
    async checkout(request) {
      const origin = request.headers.get("origin") || "";
      if (origin !== config.site)
        return json({ error: "Origem não autorizada." }, 403);
      if (request.method === "OPTIONS") return json({}, 200, origin);
      if (request.method !== "POST")
        return json({ error: "Método inválido." }, 405, origin);
      if (config.enabled !== true || !config.stripeKey || !config.serviceKey)
        return json(
          {
            error:
              "Pagamento ainda não configurado. Nenhuma cobrança foi realizada.",
          },
          503,
          origin,
        );
      const token = request.headers
        .get("authorization")
        ?.replace(/^Bearer /, "");
      if (!token)
        return json({ error: "Entre com a conta proprietária." }, 401, origin);
      try {
        const data = await request.json();
        if (
          !/^[a-f0-9-]{36}$/i.test(data.request_id || "") ||
          !/^[a-f0-9-]{36}$/i.test(data.sid || "")
        )
          return json({ error: "Pedido inválido." }, 400, origin);
        // A fresh server identity check precedes the owner-checked RPC.
        const user = await fetcher(config.url + "/auth/v1/user", {
          headers: { apikey: config.anonKey, Authorization: "Bearer " + token },
        });
        if (!user.ok) return json({ error: "Sessão expirada." }, 401, origin);
        if (data.action === "portal") {
          const a = await fetcher(
            config.url +
              "/rest/v1/assinaturas?fornecedor_id=eq." +
              data.sid +
              "&select=stripe_customer_id",
            {
              headers: {
                apikey: config.serviceKey,
                Authorization: "Bearer " + config.serviceKey,
              },
            },
          );
          const summary = await rpc("resumo_plano", { sid: data.sid }, token);
          if (!summary.dono)
            throw Error("Somente o proprietário pode gerenciar a cobrança.");
          const customer = (await a.json())[0]?.stripe_customer_id;
          if (!customer)
            throw Error("Nenhuma assinatura de pagamento vinculada.");
          const session = await stripe("billing_portal/sessions", {
            customer,
            return_url: config.site + "/painel/plano",
          });
          return json({ url: session.url }, 200, origin);
        }
        const order = await rpc(
          "preparar_checkout",
          { sid: data.sid, product: data.product, request_id: data.request_id },
          token,
        );
        if (order.status !== "pendente")
          throw Error("Pedido já processado. Atualize o extrato.");
        if (order.stripe_checkout_id) {
          const session = await stripe(
            "checkout/sessions/" + encodeURIComponent(order.stripe_checkout_id),
          );
          if (session.status !== "open")
            throw Error("Checkout encerrado. Inicie uma nova compra.");
          return json({ url: session.url }, 200, origin);
        }
        const subscription = order.quantidade === 0;
        const values = {
          mode: subscription ? "subscription" : "payment",
          success_url: config.site + "/painel/plano?checkout=retorno",
          cancel_url: config.site + "/painel/plano?checkout=cancelado",
          "metadata[order_id]": order.id,
          "line_items[0][quantity]": "1",
          client_reference_id: order.id,
        };
        if (subscription) {
          const price = await stripe(
            "prices/" + encodeURIComponent(order.stripe_price_id),
          );
          if (
            !price.active ||
            price.currency !== "brl" ||
            price.unit_amount !== order.valor_centavos ||
            price.recurring?.interval !== "month" ||
            price.recurring?.interval_count !== 1
          )
            throw Error(
              "O preço mensal do provedor difere da configuração. A equipe precisa revisar o plano.",
            );
          values["line_items[0][price]"] = order.stripe_price_id;
          values["payment_method_types[0]"] = "card";
          values["subscription_data[metadata][order_id]"] = order.id;
        } else {
          values["line_items[0][price_data][currency]"] = "brl";
          values["line_items[0][price_data][unit_amount]"] = String(
            order.valor_centavos,
          );
          values["line_items[0][price_data][product_data][name]"] =
            order.quantidade + " créditos Patri Realty";
          values["payment_method_types[0]"] = "card";
          values["payment_method_types[1]"] = "pix";
        }
        const session = await stripe(
          "checkout/sessions",
          values,
          "patri:" + order.id,
        );
        await rpc("vincular_checkout", {
          oid: order.id,
          session_id: session.id,
          customer_id: session.customer || null,
        });
        return json({ url: session.url }, 200, origin);
      } catch (e) {
        return json({ error: e.message }, 400, origin);
      }
    },
    async webhook(request) {
      if (request.method !== "POST")
        return json({ error: "Método inválido" }, 405);
      if (
        config.enabled !== true ||
        !config.webhookSecret ||
        !config.stripeKey ||
        !config.serviceKey
      )
        return json({ error: "Integração não configurada" }, 503);
      if (Number(request.headers.get("content-length") || 0) > 1048576)
        return json({ error: "Evento muito grande" }, 413);
      const raw = await request.text();
      if (raw.length > 1048576)
        return json({ error: "Evento muito grande" }, 413);
      if (
        !(await verifyStripeSignature(
          raw,
          request.headers.get("stripe-signature"),
          config.webhookSecret,
        ))
      )
        return json({ error: "Assinatura inválida" }, 400);
      try {
        const event = JSON.parse(raw),
          object = event.data.object;
        let data;
        if (
          [
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
          ].includes(event.type)
        ) {
          // Retrieve canonical object: browser redirects and unpaid asynchronous sessions grant nothing.
          const session = await stripe(
            "checkout/sessions/" + encodeURIComponent(object.id),
          );
          if (session.payment_status !== "paid")
            return json({ ignorado: true });
          const sub = session.subscription
            ? await stripe(
                "subscriptions/" + encodeURIComponent(session.subscription),
              )
            : null;
          data = {
            session_id: session.id,
            payment_status: session.payment_status,
            currency: session.currency,
            amount_total: session.amount_total,
            payment_intent: session.payment_intent || "",
            customer: session.customer || "",
            subscription: session.subscription || "",
            period_end:
              sub?.items?.data?.[0]?.current_period_end ||
              sub?.current_period_end ||
              0,
          };
          return json(
            await rpc("aplicar_evento_stripe", {
              event_id: event.id,
              event_type: "checkout.session.completed",
              data,
            }),
          );
        }
        if (event.type === "charge.refunded") {
          const charge = await stripe(
            "charges/" + encodeURIComponent(object.id),
          );
          data = {
            payment_intent: charge.payment_intent,
            charge_id: charge.id,
            invoice_id: charge.invoice,
            amount_refunded: charge.amount_refunded,
          };
        } else if (
          [
            "invoice.paid",
            "invoice.payment_failed",
            "customer.subscription.updated",
            "customer.subscription.deleted",
          ].includes(event.type)
        ) {
          const id = event.type.startsWith("invoice.")
            ? object.subscription ||
              object.parent?.subscription_details?.subscription
            : object.id;
          if (!id) return json({ ignorado: true });
          const sub = await stripe("subscriptions/" + encodeURIComponent(id));
          data = {
            invoice_id: event.type.startsWith("invoice.") ? object.id : null,
            billing_reason: object.billing_reason,
            amount_paid: event.type.startsWith("invoice.")
              ? object.amount_paid
              : null,
            amount_due: event.type.startsWith("invoice.")
              ? object.amount_due
              : null,
            currency: object.currency,
            invoice_url: object.hosted_invoice_url,
            payment_intent:
              object.payment_intent ||
              object.payments?.data?.[0]?.payment?.payment_intent,
            charge_id: object.charge,
            subscription: sub.id,
            status: sub.status,
            period_end:
              sub.items?.data?.[0]?.current_period_end ||
              sub.current_period_end ||
              0,
            cancel_at_period_end: sub.cancel_at_period_end,
            price_id: sub.items?.data?.[0]?.price?.id,
          };
        } else return json({ ignorado: true });
        return json(
          await rpc("aplicar_evento_stripe", {
            event_id: event.id,
            event_type: event.type,
            data,
          }),
        );
      } catch {
        return json(
          { error: "Evento não processado; o provedor deve tentar novamente." },
          500,
        );
      }
    },
  };
}
