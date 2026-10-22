import test from "node:test";
import assert from "node:assert/strict";
import { billingHandlers } from "../supabase/functions/_shared/billing-handler.mjs";
import { verifyCaptcha } from "../supabase/functions/_shared/captcha.mjs";
test("F06 Stripe desativado mesmo com chaves até configuração explícita", async () => {
  let calls = 0;
  const h = billingHandlers({
    site: "https://site.test",
    stripeKey: "fixture",
    serviceKey: "fixture",
    webhookSecret: "fixture",
    fetch: () => {
      calls++;
      throw Error("unexpected");
    },
  });
  const r = await h.checkout(
    new Request("https://edge.test", {
      method: "POST",
      headers: { Origin: "https://site.test", Authorization: "Bearer fixture" },
      body: "{}",
    }),
  );
  assert.equal(r.status, 503);
  assert.equal(calls, 0);
});
test("F05 Turnstile produção sem chave bloqueia", async () =>
  assert.equal(
    await verifyCaptcha("token", { production: true, enabled: true }),
    false,
  ));
test("F06 e-mail simulado preserva fila sem chamar provedor", async () => {
  const { deliverEmail } =
    await import("../supabase/functions/_shared/email-delivery.mjs");
  let calls = 0;
  const r = await deliverEmail(
    { enabled: false, fetch: () => calls++ },
    { id: "fixture", to: "fixture@example.com" },
  );
  assert.deepEqual(r, { simulated: true });
  assert.equal(calls, 0);
});
