export function newsletterHandler(config) {
  const send = (body, status, origin = "") =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
        Vary: "Origin",
        "Access-Control-Allow-Headers": "content-type,authorization,apikey",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
    });
  return async (request) => {
    const requestUrl = new URL(request.url);
    if (
      request.method === "POST" &&
      requestUrl.searchParams.has("unsubscribe")
    ) {
      const token = requestUrl.searchParams.get("unsubscribe");
      if (!/^[a-f0-9]{64}$/.test(token || ""))
        return send({ error: "Link inválido" }, 400);
      const r = await (config.fetch || fetch)(
        config.url + "/rest/v1/rpc/newsletter_token",
        {
          method: "POST",
          headers: {
            apikey: config.key,
            Authorization: "Bearer " + config.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_token: token, p_action: "descadastrar" }),
        },
      );
      return send({ recebido: r.ok }, r.ok ? 200 : 503);
    }
    const origin = request.headers.get("origin") || "";
    if (!config.origins.includes(origin))
      return send({ error: "Origem não permitida" }, 403);
    if (request.method === "OPTIONS") return send({}, 200, origin);
    if (request.method !== "POST")
      return send({ error: "Método não permitido" }, 405, origin);
    if (!config.url || !config.key || !config.salt || !config.verify)
      return send({ error: "Inscrição ainda não configurada." }, 503, origin);
    try {
      const raw = await request.text();
      if (raw.length > 8000)
        return send({ error: "Dados muito grandes" }, 413, origin);
      const p = JSON.parse(raw);
      if (p.website) return send({ recebido: true }, 200, origin);
      if (!p.aceite)
        return send(
          { error: "Aceite a política para solicitar a inscrição." },
          400,
          origin,
        );
      const ip = config.ip(request);
      if (!ip || !(await config.verify(p.turnstile_token || "", ip)))
        return send(
          { error: "Verificação de segurança não concluída." },
          400,
          origin,
        );
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(config.salt),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const hash = [
        ...new Uint8Array(
          await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip)),
        ),
      ]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      const r = await (config.fetch || fetch)(
        config.url + "/rest/v1/rpc/inscrever_newsletter",
        {
          method: "POST",
          headers: {
            apikey: config.key,
            Authorization: "Bearer " + config.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p: {
              nome: p.nome,
              email: p.email,
              cidade: p.cidade || "",
              perfil: p.perfil,
              aceite: true,
              website: "",
            },
            p_ip: hash,
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        return send(
          {
            error:
              b.message === "LIMITE_HORA"
                ? "Muitas tentativas. Tente novamente mais tarde."
                : "Não foi possível registrar a solicitação.",
          },
          b.message === "LIMITE_HORA" ? 429 : 400,
          origin,
        );
      }
      const receipt = await r.json();
      if (receipt?.recebido !== true)
        return send(
          {
            error: "Não foi possível confirmar a solicitação. Tente novamente.",
          },
          503,
          origin,
        );
      return send({ recebido: true }, 200, origin);
    } catch {
      return send(
        { error: "Não foi possível enviar agora. Tente novamente." },
        400,
        origin,
      );
    }
  };
}
