import { test } from "node:test";
import assert from "node:assert/strict";
import { newsletterHandler } from "../supabase/functions/_shared/newsletter-handler.mjs";
const config = {
  url: "https://db.test",
  key: "service-fixture",
  salt: "newsletter-fixture-salt",
  origins: ["https://patri.test"],
  ip: () => "127.0.0.1",
  verify: async () => true,
};
const data = {
  nome: "Leitor Exemplo",
  email: "leitor@example.com",
  perfil: "sindico",
  aceite: true,
  website: "",
  turnstile_token: "fixture",
};
const request = (p = data, origin = "https://patri.test") =>
  new Request("https://edge.test/newsletter", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
test("newsletter protege CORS, aceite, honeypot e CAPTCHA sem gravar indevidamente", async () => {
  let count = 0;
  const h = newsletterHandler({
    ...config,
    fetch: async () => {
      count++;
      return Response.json({ recebido: true });
    },
  });
  assert.equal((await h(request(data, "https://other.test"))).status, 403);
  assert.equal((await h(request({ ...data, aceite: false }))).status, 400);
  assert.equal((await h(request({ ...data, website: "spam" }))).status, 200);
  assert.equal(count, 0);
  const blocked = newsletterHandler({ ...config, verify: async () => false });
  assert.equal((await blocked(request())).status, 400);
});
test("gateway deriva hash no servidor e não aceita identificador do cliente", async () => {
  let sent;
  const h = newsletterHandler({
    ...config,
    fetch: async (url, p) => {
      sent = JSON.parse(p.body);
      return Response.json({ recebido: true });
    },
  });
  assert.equal(
    (await h(request({ ...data, p_ip: "forged", confirmado: true }))).status,
    200,
  );
  assert.match(sent.p_ip, /^[a-f0-9]{64}$/);
  assert.notEqual(sent.p_ip, "forged");
  assert.equal(sent.p.confirmado, undefined);
  assert.equal(sent.p.email, "leitor@example.com");
});
test("limite de tentativas é traduzido em 429 e falha de rede é recuperável", async () => {
  const h = newsletterHandler({
    ...config,
    fetch: async () =>
      Response.json({ message: "LIMITE_HORA" }, { status: 400 }),
  });
  assert.equal((await h(request())).status, 429);
  const failed = newsletterHandler({
    ...config,
    fetch: async () => {
      throw Error("offline");
    },
  });
  assert.equal((await failed(request())).status, 400);
});
test("descadastro One-Click aceita token válido sem expor endereço de e-mail", async () => {
  let sent;
  const h = newsletterHandler({
    ...config,
    fetch: async (url, p) => {
      sent = JSON.parse(p.body);
      return Response.json({ valido: true });
    },
  });
  const r = await h(
    new Request("https://edge.test/newsletter?unsubscribe=" + "a".repeat(64), {
      method: "POST",
      body: "List-Unsubscribe=One-Click",
    }),
  );
  assert.equal(r.status, 200);
  assert.deepEqual(sent, { p_token: "a".repeat(64), p_action: "descadastrar" });
  const invalid = await h(
    new Request("https://edge.test/newsletter?unsubscribe=wrong", {
      method: "POST",
    }),
  );
  assert.equal(invalid.status, 400);
});
