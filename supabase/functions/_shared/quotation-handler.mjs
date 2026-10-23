/** Shared HTTP boundary for Supabase Edge and the explicitly local integration gateway. */
export function quotationHandler(config) {
  return async (request) => {
    const origin = request.headers.get("origin") || "";
    const allowed = config.origins.includes(origin);
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Origin",
      ...(allowed
        ? {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "authorization,content-type,apikey",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
          }
        : {}),
    };
    const reply = (status, message) =>
      new Response(JSON.stringify(message), { status, headers });
    if (origin && !allowed)
      return reply(403, { error: "Origem não autorizada." });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST")
      return reply(405, { error: "Método não permitido." });
    try {
      if (!config.url || !config.key || !config.salt)
        return reply(503, {
          error: "O recebimento de pedidos está temporariamente indisponível.",
        });
      const chunks = [];
      let size = 0;
      const reader = request.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 20000) {
            await reader.cancel();
            return reply(413, { error: "Pedido muito grande." });
          }
          chunks.push(value);
        }
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const raw = new TextDecoder().decode(bytes);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return reply(400, { error: "Pedido inválido." });
      }
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        typeof body.website !== "string" ||
        body.website !== "" ||
        typeof body.request_id !== "string" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
          body.request_id,
        )
      )
        return reply(400, { error: "Confira os dados do pedido." });
      const ip = config.ip(request);
      if (!ip)
        return reply(503, {
          error: "Não foi possível validar a origem do pedido.",
        });
      if (!(await config.verify(body.turnstile_token, ip)))
        return reply(400, {
          error: "Confirme a verificação de segurança e tente novamente.",
        });
      const data = {};
      for (const k of [
        "fornecedor_id",
        "segmento_id",
        "nome",
        "email",
        "telefone",
        "condominio_nome",
        "cidade",
        "uf",
        "unidades",
        "urgencia",
        "mensagem",
        "privacidade",
        "website",
        "copias",
      ])
        data[k] = body[k];
      const hmacKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(config.salt),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const hex = (b) =>
        Array.from(new Uint8Array(b))
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("");
      const ipHash = hex(
        await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(ip)),
      );
      const payloadHash = hex(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(JSON.stringify(data)),
        ),
      );
      let user = null;
      const bearer = request.headers.get("authorization");
      if (bearer) {
        const auth = await fetch(config.url + "/auth/v1/user", {
          headers: { apikey: config.key, Authorization: bearer },
          signal: AbortSignal.timeout(10000),
        });
        if (!auth.ok)
          return reply(401, {
            error: "Sua sessão expirou. Entre novamente ou envie sem login.",
          });
        user = (await auth.json()).id;
      }
      const response = await fetch(
        config.url + "/rest/v1/rpc/receber_orcamento",
        {
          method: "POST",
          headers: {
            apikey: config.key,
            Authorization: "Bearer " + config.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_id: body.request_id,
            p_ip: ipHash,
            p_hash: payloadHash,
            p_data: data,
            p_user: user,
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        if (error.message?.includes("LIMITE_HORA"))
          return new Response(
            JSON.stringify({
              error:
                "Você atingiu o limite de 5 pedidos por hora. Tente novamente mais tarde.",
            }),
            { status: 429, headers: { ...headers, "Retry-After": "3600" } },
          );
        return reply(400, {
          error:
            "Não foi possível enviar. Confira os dados e se a empresa continua disponível.",
        });
      }
      const receipt = await response.json();
      if (receipt?.recebido !== true)
        return reply(503, {
          error:
            "Não foi possível confirmar o recebimento. Tente novamente com os mesmos dados.",
        });
      return reply(201, { recebido: true });
    } catch {
      return reply(503, {
        error:
          "Não foi possível confirmar o envio. Tente novamente com os mesmos dados.",
      });
    }
  };
}
export async function verifyTurnstile(
  secret,
  token,
  ip,
  hostname,
  expectedAction = "quotation",
) {
  if (
    !secret ||
    typeof token !== "string" ||
    token.length < 1 ||
    token.length > 2048
  )
    return false;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const data = await response.json();
    return (
      data.success === true &&
      data.hostname === hostname &&
      data.action === expectedAction
    );
  } catch {
    return false;
  }
}
