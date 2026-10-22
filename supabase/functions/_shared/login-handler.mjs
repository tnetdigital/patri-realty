import { verifyCaptcha } from "./captcha.mjs";
export function loginHandler(config) {
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
          "Access-Control-Allow-Headers": "content-type",
          Vary: "Origin",
        },
      });
    if (!config.origins.includes(origin))
      return send({ error: "Origem não permitida" }, 403);
    if (request.method === "OPTIONS") return send({});
    if (request.method !== "POST")
      return send({ error: "Método não permitido" }, 405);
    if (!config.url || !config.key || !config.salt)
      return send({ error: "Acesso temporariamente indisponível" }, 503);
    try {
      const raw = await request.text();
      if (raw.length > 2000)
        return send({ error: "Solicitação inválida" }, 413);
      const p = JSON.parse(raw),
        email = typeof p.email === "string" ? p.email.trim().toLowerCase() : "";
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 ||
        typeof p.password !== "string" ||
        p.password.length < 1 ||
        p.password.length > 256
      )
        return send({ error: "E-mail ou senha incorretos." }, 400);
      if (
        !(await verifyCaptcha(p.captchaToken, {
          production: config.production !== false,
          enabled: config.captchaEnabled === true,
          secret: config.captchaSecret,
          hostname: config.hostname,
          fetch: config.fetch,
        }))
      )
        return send(
          { error: "Verificação de segurança indisponível. Tente mais tarde." },
          503,
        );
      const ip = config.ip(request);
      if (!ip)
        return send({ error: "Acesso temporariamente indisponível" }, 503);
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(config.salt),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const hash = async (v) =>
        [
          ...new Uint8Array(
            await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(v)),
          ),
        ]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
      const transport = config.fetch || fetch;
      const headers = {
        apikey: config.key,
        Authorization: "Bearer " + config.key,
        "Content-Type": "application/json",
      };
      const limited = await transport(
        config.url + "/rest/v1/rpc/limitar_conta",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            chaves: await Promise.all([
              hash("login-email:" + email),
              hash("login-ip:" + ip),
            ]),
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!limited.ok)
        return send({ error: "Acesso temporariamente indisponível" }, 503);
      if ((await limited.json()) !== true)
        return send(
          { error: "Limite de tentativas. Aguarde 15 minutos." },
          429,
        );
      const result = await transport(
        config.url + "/auth/v1/token?grant_type=password",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ email, password: p.password }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const data = await result.json();
      if (!result.ok || !data.access_token || !data.refresh_token)
        return send({ error: "E-mail ou senha incorretos." }, 400);
      return send({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
    } catch {
      return send({ error: "Acesso temporariamente indisponível" }, 503);
    }
  };
}
