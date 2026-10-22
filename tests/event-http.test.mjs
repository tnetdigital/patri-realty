import { test } from "node:test";
import assert from "node:assert/strict";
import { eventHandler } from "../supabase/functions/_shared/event-handler.mjs";
const origin = "https://portal.example",
  uid = "93000000-0000-4000-8000-000000000001",
  body = {
    eid: uid,
    etype: "clique_whatsapp",
    target: uid,
    session_id: uid,
    consented: true,
  },
  request = (p = body, o = origin) =>
    new Request(origin, {
      method: "POST",
      headers: { origin: o },
      body: JSON.stringify(p),
    });
test("eventos: consentimento e origem antes de persistir", async () => {
  let n = 0;
  const handler = eventHandler({
    url: origin,
    key: "fixture-key",
    salt: "fixture-salt",
    origins: [origin],
    ip: () => "192.0.2.1",
    fetch: async () => {
      n++;
      return Response.json({ registrado: true });
    },
  });
  assert.equal(
    (await handler(request(body, "https://other.example"))).status,
    403,
  );
  assert.deepEqual(
    await (await handler(request({ ...body, consented: false }))).json(),
    { ignorado: true },
  );
  assert.equal(
    (await handler(request({ ...body, etype: "outro" }))).status,
    400,
  );
  assert.equal(n, 0);
  assert.equal((await handler(request())).status, 200);
  assert.equal(n, 1);
});
test("eventos: remove campos extras e deriva hash sem enviar IP ao banco", async () => {
  let saved;
  const handler = eventHandler({
    url: origin,
    key: "fixture-key",
    salt: "fixture-salt",
    origins: [origin],
    ip: () => "192.0.2.1",
    fetch: async (url, init) => {
      saved = JSON.parse(init.body);
      return Response.json({ registrado: true });
    },
  });
  await handler(
    request({
      ...body,
      email: "private@example.com",
      ip_hash: "forged",
      query: "Pessoa identificável",
    }),
  );
  assert.match(saved.ip_hash, /^[a-f0-9]{64}$/);
  assert.equal(saved.session_id, uid);
  assert.ok(!("email" in saved));
  assert.ok(!JSON.stringify(saved).includes("192.0.2.1"));
  assert.ok(!("query" in saved));
});
test("eventos: limite e falha de serviço têm retorno controlado", async () => {
  const config = {
    url: origin,
    key: "fixture-key",
    salt: "fixture-salt",
    origins: [origin],
    ip: () => "192.0.2.1",
  };
  const limit = eventHandler({
    ...config,
    fetch: async () =>
      Response.json({ message: "LIMITE_HORA" }, { status: 400 }),
  });
  assert.equal((await limit(request())).status, 429);
  const fail = eventHandler({
    ...config,
    fetch: async () =>
      Response.json({ message: "detalhe secreto" }, { status: 500 }),
  });
  const r = await fail(request());
  assert.equal(r.status, 503);
  assert.ok(!(await r.text()).includes("secreto"));
});
