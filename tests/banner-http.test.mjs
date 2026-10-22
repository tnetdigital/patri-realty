import { test } from "node:test";
import assert from "node:assert/strict";
import { bannerHandler } from "../supabase/functions/_shared/banner-handler.mjs";
const origin = "https://portal.example",
  uuid = "84000000-0000-4000-8000-000000000001",
  event = {
    bid: uuid,
    event_id: uuid,
    event_type: "impressao",
    consented: true,
  };
const req = (body = event, other = origin) =>
  new Request(origin, {
    method: "POST",
    headers: { origin: other },
    body: JSON.stringify(body),
  });
test("banner: origem, consentimento e formato antes de acessar banco", async () => {
  let calls = 0;
  const h = bannerHandler({
    url: origin,
    key: "private-test-only",
    salt: "private-test-only",
    origins: [origin],
    ip: () => "127.0.0.1",
    fetch: async () => {
      calls++;
      return Response.json({ registrado: true });
    },
  });
  assert.equal((await h(req(event, "https://outro.example"))).status, 403);
  assert.deepEqual(
    await (await h(req({ ...event, consented: false }))).json(),
    { ignorado: true },
  );
  assert.equal((await h(req({ ...event, bid: "invalid" }))).status, 400);
  assert.equal(calls, 0);
  assert.equal((await h(req())).status, 200);
  assert.equal(calls, 1);
});
test("banner: IP somente como HMAC e limite exposto como 429", async () => {
  let payload;
  const h = bannerHandler({
    url: origin,
    key: "private-test-only",
    salt: "private-test-only",
    origins: [origin],
    ip: () => "192.0.2.23",
    fetch: async (url, init) => {
      payload = JSON.parse(init.body);
      return Response.json({ message: "LIMITE_HORA" }, { status: 400 });
    },
  });
  assert.equal((await h(req())).status, 429);
  assert.match(payload.ip_hash, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(payload).includes("192.0.2.23"));
});
test("banner: erro não vaza detalhes internos", async () => {
  const h = bannerHandler({
    url: origin,
    key: "private-test-only",
    salt: "private-test-only",
    origins: [origin],
    ip: () => "127.0.0.1",
    fetch: async () =>
      Response.json({ message: "credencial-interna" }, { status: 500 }),
  });
  const r = await h(req());
  assert.equal(r.status, 503);
  assert.ok(!(await r.text()).includes("credencial-interna"));
});
