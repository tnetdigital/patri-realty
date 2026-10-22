import { test } from "node:test";
import assert from "node:assert/strict";
import { accountHandler } from "../supabase/functions/_shared/account-handler.mjs";
import { loginHandler } from "../supabase/functions/_shared/login-handler.mjs";
const uid = "a0000000-0000-4000-8000-000000000002",
  session = "a1000000-0000-4000-8000-000000000002";
const token =
  "a." +
  Buffer.from(JSON.stringify({ session_id: session })).toString("base64url") +
  ".c";
const request = (body, origin = "https://site.test") =>
  new Request("https://api.test/account", {
    method: "POST",
    headers: {
      origin,
      authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
function fixture(options = {}) {
  const calls = [];
  const config = {
    production: false,
    url: "https://db.test",
    key: "server-only-fixture",
    salt: "salt-fixture",
    origins: ["https://site.test"],
    ip: () => "ip-fixture",
    fetch: async (url, init) => {
      const body = init.body ? JSON.parse(init.body) : null;
      calls.push({ url, body });
      if (url.endsWith("/auth/v1/user"))
        return Response.json({
          id: uid,
          email: "own@example.com",
          email_confirmed_at: "2026-10-21",
          user_metadata: { nome: "Pessoa" },
        });
      if (url.includes("validar_sessao_conta"))
        return Response.json(options.session !== false);
      if (url.includes("exportar_minha_conta"))
        return Response.json({ conta: { nome: "Pessoa" } });
      if (url.includes("limitar_conta"))
        return Response.json(options.limit !== false);
      if (url.includes("/token?"))
        return options.password === false
          ? Response.json({ message: "User not found" }, { status: 400 })
          : Response.json({
              user: { id: uid },
              access_token: "access",
              refresh_token: "refresh",
            });
      if (url.includes("/anonimizar_conta"))
        return Response.json({ anonimizada: true });
      if (url.includes("/admin/users/"))
        return Response.json(
          {},
          { status: options.cleanup === false ? 503 : 200 },
        );
      return Response.json({});
    },
  };
  return {
    calls,
    account: accountHandler(config),
    login: loginHandler(config),
  };
}
test("conta rejeita origem externa e sessão revogada antes de consultar dados", async () => {
  const f = fixture({ session: false });
  assert.equal(
    (await f.account(request({ action: "export" }, "https://evil.test")))
      .status,
    403,
  );
  assert.equal(f.calls.length, 0);
  assert.equal((await f.account(request({ action: "export" }))).status, 401);
  assert(!f.calls.some((x) => x.url.includes("exportar_minha_conta")));
});
test("exportação usa identidade verificada e ignora usuário enviado pelo navegador", async () => {
  const f = fixture();
  const r = await f.account(request({ action: "export", uid: "other-user" }));
  assert.equal(r.status, 200);
  assert.deepEqual(
    f.calls.find((x) => x.url.includes("validar_sessao_conta")).body,
    { uid, sessao: session },
  );
  assert.deepEqual(await r.json(), { conta: { nome: "Pessoa" } });
});
test("senha errada não anonimiza e limite bloqueia reautenticação", async () => {
  const f = fixture({ password: false });
  assert.equal(
    (
      await f.account(
        request({
          action: "delete",
          password: "Errada123",
          confirmation: "APAGAR",
        }),
      )
    ).status,
    400,
  );
  assert(!f.calls.some((x) => x.url.includes("anonimizar_conta")));
  const limited = fixture({ limit: false });
  assert.equal(
    (
      await limited.account(
        request({
          action: "delete",
          password: "Errada123",
          confirmation: "APAGAR",
        }),
      )
    ).status,
    429,
  );
  assert(!limited.calls.some((x) => x.url.includes("/token?")));
});
test("exclusão concluída mantém limpeza Auth recuperável quando provedor falha", async () => {
  const f = fixture({ cleanup: false });
  const r = await f.account(
    request({
      action: "delete",
      password: "Certa1234",
      confirmation: "APAGAR",
      uid: "other-user",
    }),
  );
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { anonimizada: true, auth_pendente: true });
  assert.deepEqual(
    f.calls.find((x) => x.url.includes("anonimizar_conta")).body,
    { uid },
  );
});
test("login usa hashes, retorna erro genérico e limita por e-mail e IP", async () => {
  const f = fixture({ password: false });
  const r = await f.login(
    request({ email: "Pessoa@Example.com", password: "Errada123" }),
  );
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { error: "E-mail ou senha incorretos." });
  const keys = f.calls.find((x) => x.url.includes("limitar_conta")).body.chaves;
  assert.equal(keys.length, 2);
  assert(keys.every((k) => /^[a-f0-9]{64}$/.test(k)));
  const limited = fixture({ limit: false });
  assert.equal(
    (
      await limited.login(
        request({ email: "pessoa@example.com", password: "Errada123" }),
      )
    ).status,
    429,
  );
  assert(!limited.calls.some((x) => x.url.includes("/token?")));
});
