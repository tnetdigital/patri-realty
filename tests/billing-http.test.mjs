import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  verifyStripeSignature,
  billingHandlers,
} from "../supabase/functions/_shared/billing-handler.mjs";
const sign = (raw, t = Math.floor(Date.now() / 1000)) =>
  "t=" +
  t +
  ",v1=" +
  createHmac("sha256", "whsec_test_only")
    .update(t + "." + raw)
    .digest("hex");
test("Stripe signature verifies raw body, rejects mutation, stale and missing signatures", async () => {
  const raw = '{"id":"evt_test"}';
  assert.equal(
    await verifyStripeSignature(raw, sign(raw), "whsec_test_only"),
    true,
  );
  assert.equal(
    await verifyStripeSignature(raw + " ", sign(raw), "whsec_test_only"),
    false,
  );
  assert.equal(
    await verifyStripeSignature(raw, sign(raw, 1), "whsec_test_only"),
    false,
  );
  assert.equal(
    await verifyStripeSignature(raw, null, "whsec_test_only"),
    false,
  );
});
test("unconfigured checkout and invalid origin never create a charge", async () => {
  let calls = 0;
  const h = billingHandlers({
    enabled: true,
    site: "https://patri.test",
    fetch: () => {
      calls++;
    },
  });
  assert.equal(
    (
      await h.checkout(
        new Request("https://edge.test", {
          method: "POST",
          headers: { Origin: "https://other.test" },
        }),
      )
    ).status,
    403,
  );
  const r = await h.checkout(
    new Request("https://edge.test", {
      method: "POST",
      headers: { Origin: "https://patri.test" },
    }),
  );
  assert.equal(r.status, 503);
  assert.equal(calls, 0);
});
test("signed webhook retrieves canonical Stripe data and applies normalized server event", async () => {
  const calls = [];
  const event = {
    id: "evt_paid",
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", amount_total: 1 } },
  };
  const raw = JSON.stringify(event);
  const h = billingHandlers({
    enabled: true,
    url: "https://db.test",
    serviceKey: "server-test-key",
    stripeKey: "sk_test_fixture",
    webhookSecret: "whsec_test_only",
    fetch: async (url, opts) => {
      calls.push({ url, body: opts?.body });
      if (url.includes("api.stripe.com"))
        return Response.json({
          id: "cs_1",
          payment_status: "paid",
          amount_total: 4900,
          currency: "brl",
          payment_intent: "pi_1",
        });
      return Response.json({ processado: true });
    },
  });
  const r = await h.webhook(
    new Request("https://edge.test", {
      method: "POST",
      headers: { "stripe-signature": sign(raw) },
      body: raw,
    }),
  );
  assert.equal(r.status, 200);
  const data = JSON.parse(calls[1].body);
  assert.equal(data.data.amount_total, 4900);
  assert.equal(data.event_id, "evt_paid");
});
test("unpaid asynchronous checkout grants nothing and invalid signature cannot call DB", async () => {
  let n = 0;
  const h = billingHandlers({
    enabled: true,
    url: "https://db.test",
    serviceKey: "server-test-key",
    stripeKey: "sk_test_fixture",
    webhookSecret: "whsec_test_only",
    fetch: async () => {
      n++;
      return Response.json({ payment_status: "unpaid" });
    },
  });
  const raw = JSON.stringify({
    id: "evt_unpaid",
    type: "checkout.session.completed",
    data: { object: { id: "cs_2" } },
  });
  const r = await h.webhook(
    new Request("https://edge.test", {
      method: "POST",
      headers: { "stripe-signature": sign(raw) },
      body: raw,
    }),
  );
  assert.equal(r.status, 200);
  assert.equal(n, 1);
  const bad = await h.webhook(
    new Request("https://edge.test", { method: "POST", body: raw }),
  );
  assert.equal(bad.status, 400);
  assert.equal(n, 1);
});
test("checkout uses server price, owner identity and idempotent order; ignores client amount", async () => {
  const calls = [];
  const h = billingHandlers({
    enabled: true,
    url: "https://db.test",
    site: "https://patri.test",
    anonKey: "anon-test",
    serviceKey: "server-test-key",
    stripeKey: "sk_test_fixture",
    fetch: async (url, opts) => {
      calls.push({ url, opts });
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: "owner" });
      if (url.endsWith("/preparar_checkout"))
        return Response.json({
          id: "65000000-0000-4000-8000-000000000001",
          produto: "creditos_10",
          quantidade: 10,
          valor_centavos: 4900,
          status: "pendente",
        });
      if (url.includes("api.stripe.com"))
        return Response.json({
          id: "cs_1",
          url: "https://checkout.stripe.com/c/pay/test",
        });
      return Response.json(null);
    },
  });
  const r = await h.checkout(
    new Request("https://edge.test", {
      method: "POST",
      headers: {
        Origin: "https://patri.test",
        Authorization: "Bearer owner-test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sid: "65000000-0000-4000-8000-000000000002",
        request_id: "65000000-0000-4000-8000-000000000001",
        product: "creditos_10",
        amount: 1,
      }),
    }),
  );
  assert.equal(r.status, 200);
  const api = calls.find((x) => x.url.includes("api.stripe.com"));
  assert.equal(
    api.opts.body.get("line_items[0][price_data][unit_amount]"),
    "4900",
  );
  assert.ok(api.opts.headers["Idempotency-Key"]);
  assert.equal(
    calls.at(-1).url,
    "https://db.test/rest/v1/rpc/vincular_checkout",
  );
});
