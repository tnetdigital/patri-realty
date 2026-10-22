// Real local Auth + PostgREST + ledger; Stripe network is an explicit deterministic fixture.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { loadEnv } from "vite";
import { billingHandlers } from "../supabase/functions/_shared/billing-handler.mjs";
const env = loadEnv("development", process.cwd(), ""),
  url = "http://127.0.0.1:54321",
  site = "http://127.0.0.1:5173";
const secret = readFileSync("infra/local/compose.yml", "utf8").match(
  /PGRST_JWT_SECRET: ['"]?([^\s'"]+)/,
)[1];
const head = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  ),
  payload = Buffer.from(
    JSON.stringify({ role: "service_role", iss: "supabase", exp: 2000000000 }),
  ).toString("base64url");
const serviceKey =
  head +
  "." +
  payload +
  "." +
  createHmac("sha256", secret)
    .update(head + "." + payload)
    .digest("base64url");
const sql = (s) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "patri-local-db-1",
      "psql",
      "-U",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: s, encoding: "utf8" },
  ).trim();
const tag = Date.now(),
  email = "billing-integration-" + tag + "@example.com";
let doc = String(tag).slice(-12).padStart(12, "1");
for (let len = 12; len < 14; len++) {
  let w = len - 7,
    sum = 0;
  for (const x of doc) {
    sum += Number(x) * w;
    w = w === 2 ? 9 : w - 1;
  }
  doc += sum % 11 < 2 ? "0" : String(11 - (sum % 11));
}
const response = await fetch(url + "/auth/v1/signup", {
  method: "POST",
  headers: {
    apikey: env.VITE_SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password: "TestePatri2026!",
    data: {
      nome: "Dono Billing Integrado",
      tipo: "fornecedor",
      empresa: "Empresa Billing Integrada " + tag,
      cnpj: doc,
      telefone: "11999999999",
      termos: true,
      termos_versao: "2026-10-19",
      privacidade_versao: "2026-10-19",
    },
  }),
});
assert.equal(response.ok, true);
const user = await response.json();
sql(
  `update auth.users set email_confirmed_at=now() where id='${user.id}';update public.fornecedores set status='publicado',slug='billing-integration-${tag}' where dono_id='${user.id}';`,
);
const sid = sql(
    `select id from public.fornecedores where dono_id='${user.id}'`,
  ),
  id = randomUUID(),
  sessionId = "cs_test_local_" + tag;
// A fixture price is transactionally restored below. No remote payment network is used.
const before = sql(
  "select preco_centavos from public.tabela_precos where codigo='creditos_10'",
);
try {
  sql(
    "update public.tabela_precos set preco_centavos=4900 where codigo='creditos_10'",
  );
  const auth = await fetch(url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: "TestePatri2026!" }),
  });
  assert.equal(auth.ok, true);
  const token = (await auth.json()).access_token;
  let paid = false;
  const h = billingHandlers({
    enabled: true,
    url,
    site,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
    serviceKey,
    stripeKey: "sk_test_local_fixture",
    webhookSecret: "whsec_local_fixture",
    fetch: async (target, options) => {
      if (target.startsWith("https://api.stripe.com/"))
        return Response.json({
          id: sessionId,
          url: "https://checkout.stripe.com/c/pay/local-fixture",
          status: "open",
          payment_status: paid ? "paid" : "unpaid",
          currency: "brl",
          amount_total: 4900,
          payment_intent: "pi_local_" + tag,
          customer: "cus_local_" + tag,
        });
      return fetch(target, options);
    },
  });
  const r = await h.checkout(
    new Request("http://edge.local/criar-checkout", {
      method: "POST",
      headers: {
        Origin: site,
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sid,
        product: "creditos_10",
        request_id: id,
        amount: 1,
      }),
    }),
  );
  assert.equal(r.status, 200, JSON.stringify(await r.clone().json()));
  assert.equal(
    sql(`select stripe_checkout_id from public.pagamentos where id='${id}'`),
    sessionId,
  );
  const summary = async () => {
    const r = await fetch(url + "/rest/v1/rpc/resumo_plano", {
      method: "POST",
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sid }),
    });
    assert.equal(r.ok, true);
    return r.json();
  };
  assert.equal((await summary()).saldo, 0);
  const raw = JSON.stringify({
      id: "evt_local_" + tag,
      type: "checkout.session.completed",
      data: { object: { id: sessionId } },
    }),
    ts = Math.floor(Date.now() / 1000),
    signature =
      "t=" +
      ts +
      ",v1=" +
      createHmac("sha256", "whsec_local_fixture")
        .update(ts + "." + raw)
        .digest("hex");
  const event = () =>
    new Request("http://edge.local/webhook-stripe", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: raw,
    });
  assert.equal((await h.webhook(event())).status, 200);
  assert.equal((await summary()).saldo, 0);
  paid = true;
  const first = await h.webhook(event());
  assert.equal(first.status, 200, JSON.stringify(await first.clone().json()));
  assert.equal((await summary()).saldo, 10);
  const repeat = await h.webhook(event());
  assert.equal((await repeat.json()).duplicado, true);
  assert.equal((await summary()).saldo, 10);
  assert.equal(
    sql(
      `select count(*) from public.creditos_extrato where fornecedor_id='${sid}' and tipo='compra'`,
    ),
    "1",
  );
  console.log(
    "Integração local: identidade real, preço do banco, checkout fixture, evento assinado, confirmação e retry sem crédito duplicado aprovados. Stripe externo não foi acionado.",
  );
} finally {
  sql(
    `update public.tabela_precos set preco_centavos=${Number(before)} where codigo='creditos_10';update public.fornecedores set status='rascunho' where id='${sid}';update public.profiles set ativo=false where id='${user.id}';`,
  );
}
