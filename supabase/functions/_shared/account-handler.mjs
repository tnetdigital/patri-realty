// No browser-supplied identity is accepted. Every operation verifies Auth and a live session.
export function accountHandler(config) {
  return async (request) => {
    const origin = request.headers.get("origin") || "";
    const send = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": config.origins.includes(origin)
            ? origin
            : "null",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
          "Access-Control-Allow-Headers": "authorization,content-type,apikey",
          Vary: "Origin",
        },
      });
    if (!config.origins.includes(origin))
      return send({ error: "Origem não permitida" }, 403);
    if (request.method === "OPTIONS") return send({});
    if (request.method !== "POST")
      return send({ error: "Método não permitido" }, 405);
    if (!config.url || !config.key || !config.salt)
      return send({ error: "Serviço não configurado" }, 503);
    const transport = config.fetch || fetch;
    const call = async (path, body, token = config.key, method = "POST") => {
      const result = await transport(config.url + path, {
        method,
        headers: {
          apikey: config.key,
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        ...(method !== "GET" ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10000),
      });
      return { ok: result.ok, data: await result.json().catch(() => null) };
    };
    try {
      const raw = await request.text();
      if (raw.length > 2000)
        return send({ error: "Solicitação inválida" }, 413);
      const p = JSON.parse(raw);
      if (!["export", "delete"].includes(p.action))
        return send({ error: "Solicitação inválida" }, 400);
      const token = request.headers
        .get("authorization")
        ?.replace(/^Bearer /i, "");
      if (!token) return send({ error: "Entre novamente para continuar" }, 401);
      const user = await call("/auth/v1/user", null, token, "GET");
      if (!user.ok || !user.data?.id || !user.data.email_confirmed_at)
        return send({ error: "Entre com uma conta confirmada" }, 401);
      let session;
      try {
        session = JSON.parse(
          atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
        ).session_id;
      } catch {
        return send({ error: "Sessão inválida" }, 401);
      }
      if (!/^[a-f0-9-]{36}$/i.test(session || ""))
        return send({ error: "Entre novamente para continuar" }, 401);
      const valid = await call("/rest/v1/rpc/validar_sessao_conta", {
        uid: user.data.id,
        sessao: session,
      });
      if (!valid.ok || valid.data !== true)
        return send({ error: "Sua sessão expirou. Entre novamente." }, 401);
      if (p.action === "export") {
        const data = await call("/rest/v1/rpc/exportar_minha_conta", {}, token);
        return data.ok
          ? send(data.data)
          : send({ error: "Não foi possível exportar seus dados" }, 503);
      }
      if (
        p.confirmation !== "APAGAR" ||
        typeof p.password !== "string" ||
        p.password.length < 8 ||
        p.password.length > 256
      )
        return send({ error: "Informe sua senha e digite APAGAR" }, 400);
      const ip = config.ip(request);
      if (!ip) return send({ error: "Verificação indisponível" }, 503);
      const hmac = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(config.salt),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const hash = async (v) =>
        [
          ...new Uint8Array(
            await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(v)),
          ),
        ]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
      const limited = await call("/rest/v1/rpc/limitar_conta", {
        chaves: await Promise.all([
          hash("user:" + user.data.id),
          hash("ip:" + ip),
        ]),
      });
      if (!limited.ok) return send({ error: "Verificação indisponível" }, 503);
      if (!limited.data)
        return send(
          { error: "Limite de tentativas. Aguarde 15 minutos." },
          429,
        );
      const verified = await call("/auth/v1/token?grant_type=password", {
        email: user.data.email,
        password: p.password,
      });
      if (!verified.ok || verified.data?.user?.id !== user.data.id)
        return send({ error: "Não foi possível confirmar sua senha" }, 400);
      const erased = await call("/rest/v1/rpc/anonimizar_conta", {
        uid: user.data.id,
      });
      if (!erased.ok) {
        await call(
          "/auth/v1/logout?scope=local",
          {},
          verified.data.access_token,
        );
        return send(
          {
            error: erased.data?.message?.includes("último admin")
              ? "Transfira a administração antes de apagar esta conta."
              : "Não foi possível apagar a conta. Nenhuma alteração foi concluída.",
          },
          409,
        );
      }
      // Disable access immediately in SQL; Auth cleanup is durable and retryable by the jobs worker.
      let cleaned = false;
      try {
        await call(
          "/auth/v1/logout?scope=global",
          {},
          verified.data.access_token,
        );
        cleaned = await finishAuthErasure(config, user.data.id);
      } catch {
        /* The private queue retries Auth cleanup; the account is already inactive. */
      }
      return send({ anonimizada: true, auth_pendente: !cleaned });
    } catch {
      return send(
        { error: "Não foi possível concluir. Tente novamente." },
        503,
      );
    }
  };
}
export async function finishAuthErasure(config, uid) {
  const transport = config.fetch || fetch;
  const headers = {
    apikey: config.key,
    Authorization: "Bearer " + config.key,
    "Content-Type": "application/json",
  };
  // GoTrue soft deletion preserves the FK target while removing identities and personal Auth metadata.
  const response = await transport(config.url + "/auth/v1/admin/users/" + uid, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ should_soft_delete: true }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok && response.status !== 404) return false;
  const saved = await transport(
    config.url + "/rest/v1/rpc/concluir_exclusao_auth",
    {
      method: "POST",
      headers,
      body: JSON.stringify({ uid }),
      signal: AbortSignal.timeout(10000),
    },
  );
  return saved.ok;
}
