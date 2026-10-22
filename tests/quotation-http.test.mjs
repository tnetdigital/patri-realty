import { test } from "node:test";
import assert from "node:assert/strict";
import {
  quotationHandler,
  verifyTurnstile,
} from "../supabase/functions/_shared/quotation-handler.mjs";
const config = {
  url: "https://db.example",
  key: "server-only-test-key",
  salt: "private-test-salt",
  origins: ["https://patri.example"],
  ip: () => "192.0.2.1",
  verify: async () => true,
};
const payload = {
  request_id: "51000000-0000-4000-8000-000000000001",
  website: "",
  nome: "Síndico",
  telefone: "11988887777",
  mensagem: "Preciso de um orçamento para o prédio.",
  copias: [],
  privacidade: true,
};
const request = (body = payload, origin = "https://patri.example") =>
  new Request("https://edge.example/quotation", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("CORS, honeypot, CAPTCHA e configuração bloqueiam envio inválido", async () => {
  assert.equal(
    (await quotationHandler(config)(request(payload, "https://evil.example")))
      .status,
    403,
  );
  assert.equal(
    (await quotationHandler(config)(request({ ...payload, website: "bot" })))
      .status,
    400,
  );
  assert.equal(
    (
      await quotationHandler({ ...config, verify: async () => false })(
        request(),
      )
    ).status,
    400,
  );
  assert.equal(
    (await quotationHandler({ ...config, salt: "" })(request())).status,
    503,
  );
  assert.equal(
    (
      await quotationHandler(config)(
        request({ ...payload, mensagem: "a".repeat(21000) }),
      )
    ).status,
    413,
  );
});
test("Edge deriva hash de IP no servidor e ignora campos privilegiados do cliente", async () => {
  const original = globalThis.fetch;
  let received;
  globalThis.fetch = async (url, options) => {
    received = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, "Bearer server-only-test-key");
    return Response.json({ recebido: true });
  };
  try {
    const response = await quotationHandler(config)(
      request({
        ...payload,
        p_ip: "fake",
        p_user: "admin",
        status: "respondido",
      }),
    );
    assert.equal(response.status, 201);
    assert.match(received.p_ip, /^[a-f0-9]{64}$/);
    assert(!JSON.stringify(received).includes("192.0.2.1"));
    assert.equal(received.p_user, null);
    assert.equal(received.p_data.status, undefined);
    assert.equal(received.p_data.p_ip, undefined);
  } finally {
    globalThis.fetch = original;
  }
});
test("Edge traduz limite de hora em 429 e erro de rede em falha recuperável", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({ message: "LIMITE_HORA" }, { status: 400 });
    assert.equal((await quotationHandler(config)(request())).status, 429);
    globalThis.fetch = async () => {
      throw Error("network");
    };
    assert.equal((await quotationHandler(config)(request())).status, 503);
  } finally {
    globalThis.fetch = original;
  }
});
test("Turnstile exige hostname e action corretos", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({
        success: true,
        hostname: "evil.example",
        action: "quotation",
      });
    assert.equal(
      await verifyTurnstile("secret", "token", "192.0.2.1", "patri.example"),
      false,
    );
    globalThis.fetch = async () =>
      Response.json({
        success: true,
        hostname: "patri.example",
        action: "login",
      });
    assert.equal(
      await verifyTurnstile("secret", "token", "192.0.2.1", "patri.example"),
      false,
    );
    globalThis.fetch = async () =>
      Response.json({
        success: true,
        hostname: "patri.example",
        action: "quotation",
      });
    assert.equal(
      await verifyTurnstile("secret", "token", "192.0.2.1", "patri.example"),
      true,
    );
  } finally {
    globalThis.fetch = original;
  }
});
