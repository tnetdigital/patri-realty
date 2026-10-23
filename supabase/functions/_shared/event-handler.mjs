export function eventHandler(config) {
  return async (request) => {
    const origin = request.headers.get("origin") || "",
      send = (body, status) =>
        new Response(JSON.stringify(body), {
          status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": config.origins.includes(origin)
              ? origin
              : "null",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
            Vary: "Origin",
            "Cache-Control": "no-store",
          },
        });
    if (!config.origins.includes(origin))
      return send({ error: "Origem não permitida" }, 403);
    if (request.method === "OPTIONS") return send({}, 200);
    if (request.method !== "POST")
      return send({ error: "Método não permitido" }, 405);
    if (!config.url || !config.key || !config.salt)
      return send({ error: "Serviço não configurado" }, 503);
    try {
      const raw = await request.text();
      if (raw.length > 2000) return send({ error: "Evento inválido" }, 413);
      const p = JSON.parse(raw);
      if (p.consented !== true) return send({ ignorado: true }, 200);
      const uuid =
        /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
      if (
        !uuid.test(p.eid) ||
        !uuid.test(p.session_id) ||
        ![
          "visualizacao_perfil",
          "clique_whatsapp",
          "clique_telefone",
          "clique_site",
          "clique_instagram",
          "orcamento_enviado",
          "visualizacao_materia",
          "tempo_materia",
          "clique_perfil_materia",
          "busca",
        ].includes(p.etype) ||
        (p.etype !== "busca" && !uuid.test(p.target)) ||
        (p.segment && !uuid.test(p.segment)) ||
        (p.region && !/^[A-Z]{2}$/.test(p.region))
      )
        return send({ error: "Evento inválido" }, 400);
      const ip = config.ip(request);
      if (!ip) return send({ error: "Origem indisponível" }, 400);
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(config.salt),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(ip),
      );
      const hash = [...new Uint8Array(signature)]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      const r = await (config.fetch || fetch)(
        `${config.url}/rest/v1/rpc/registrar_evento`,
        {
          method: "POST",
          headers: {
            apikey: config.key,
            Authorization: `Bearer ${config.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eid: p.eid,
            etype: p.etype,
            target: p.etype === "busca" ? null : p.target || null,
            session_id: p.session_id,
            consented: true,
            ip_hash: hash,
            segment: p.segment || null,
            region: p.region || "",
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const data = await r.json();
      if (!r.ok)
        return send(
          { error: "Evento indisponível" },
          data.message?.includes("LIMITE_HORA") ? 429 : 503,
        );
      return send(data, 200);
    } catch {
      return send({ error: "Evento inválido" }, 400);
    }
  };
}
