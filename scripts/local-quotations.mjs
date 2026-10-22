import { loginHandler } from "../supabase/functions/_shared/login-handler.mjs";
import { accountHandler } from "../supabase/functions/_shared/account-handler.mjs";
import { eventHandler } from "../supabase/functions/_shared/event-handler.mjs";
import { bannerHandler } from "../supabase/functions/_shared/banner-handler.mjs";
import { newsletterHandler } from "../supabase/functions/_shared/newsletter-handler.mjs";
import http from "node:http";
import { readFileSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { quotationHandler } from "../supabase/functions/_shared/quotation-handler.mjs";
// Local-only fixture key derived from the isolated Docker stack; never used in hosted deployments.
const compose = readFileSync("infra/local/compose.yml", "utf8");
const secret = compose.match(/PGRST_JWT_SECRET: ['"]?([^\s'"]+)/)?.[1];
if (!secret) throw Error("Stack local não configurada");
const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  ),
  p = Buffer.from(
    JSON.stringify({ role: "service_role", iss: "supabase", exp: 2000000000 }),
  ).toString("base64url");
const key =
  h +
  "." +
  p +
  "." +
  createHmac("sha256", secret)
    .update(h + "." + p)
    .digest("base64url");
const handler = quotationHandler({
  url: "http://127.0.0.1:54321",
  key,
  salt: createHmac("sha256", secret)
    .update("quotation-local-only")
    .digest("hex"),
  origins: ["http://127.0.0.1:5173", "http://127.0.0.1:5175"],
  ip: () => "local-integration",
  verify: async (token) => token === "local-integration",
});
const newsletter = newsletterHandler({
  url: "http://127.0.0.1:54321",
  key,
  salt: createHmac("sha256", secret)
    .update("newsletter-local-only")
    .digest("hex"),
  origins: ["http://127.0.0.1:5173", "http://127.0.0.1:5175"],
  ip: () => "newsletter-local-integration",
  verify: async (token) => token === "local-integration",
});
const banner = bannerHandler({
  url: "http://127.0.0.1:54321",
  key,
  salt: createHmac("sha256", secret).update("banner-local-only").digest("hex"),
  origins: ["http://127.0.0.1:5173", "http://127.0.0.1:5175"],
  ip: () => "local-banner",
});
const events = eventHandler({
  url: "http://127.0.0.1:54321",
  key,
  salt: createHmac("sha256", secret).update("event-local-only").digest("hex"),
  origins: ["http://127.0.0.1:5173", "http://127.0.0.1:5175"],
  ip: () => "local-event",
});
const account = accountHandler({
  url: "http://127.0.0.1:54321",
  key,
  salt: createHmac("sha256", secret).update("account-local-only").digest("hex"),
  origins: ["http://127.0.0.1:5173", "http://127.0.0.1:5175"],
  ip: () => "local-account",
});
const login = loginHandler({
  production: false,
  url: "http://127.0.0.1:54321",
  key,
  salt: createHmac("sha256", secret).update("login-local-only").digest("hex"),
  origins: ["http://127.0.0.1:5173", "http://127.0.0.1:5175"],
  ip: () => "local-login",
});
async function publishScheduled() {
  const r = await fetch(
    "http://127.0.0.1:54321/rest/v1/rpc/publicar_agendadas",
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: "{}",
    },
  );
  if (!r.ok) console.error("Falha na publicação agendada local.");
}
setInterval(() => void publishScheduled(), 300000).unref();
let jobsRunning = false;
let jobsPending = false;
function jobs() {
  if (jobsRunning) {
    jobsPending = true;
    return;
  }
  jobsRunning = true;
  // Mail delivery must not block the HTTP event loop or concurrent sign-ins.
  const child = spawn("python3", ["scripts/local-emails.py"], {
    stdio: "ignore",
  });
  child.once("error", () => console.error("Falha ao iniciar e-mail local."));
  child.once("close", (code) => {
    jobsRunning = false;
    if (code !== 0) console.error("Falha na rotina local de e-mail.");
    if (jobsPending) {
      jobsPending = false;
      jobs();
    }
  });
}
setInterval(jobs, 3600000).unref();
http
  .createServer(async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200).end("local");
      return;
    }
    if (
      ![
        "/quotation",
        "/newsletter",
        "/banner-event",
        "/event",
        "/account",
        "/auth-login",
      ].includes(req.url)
    ) {
      res.writeHead(404).end();
      return;
    }
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 20000) {
        res.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    const result = await (
      req.url === "/auth-login"
        ? login
        : req.url === "/account"
          ? account
          : req.url === "/event"
            ? events
            : req.url === "/banner-event"
              ? banner
              : req.url === "/newsletter"
                ? newsletter
                : handler
    )(
      new Request("http://127.0.0.1:8788/quotation", {
        method: req.method,
        headers: req.headers,
        ...(req.method !== "GET" && req.method !== "HEAD"
          ? { body: Buffer.concat(chunks) }
          : {}),
      }),
    );
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(await result.text());
    if (
      result.status === 201 ||
      (req.url === "/newsletter" && result.status === 200)
    )
      setTimeout(jobs, 0);
  })
  .listen(8788, "127.0.0.1", () =>
    console.log(
      "Recebimento LOCAL de orçamentos na porta 8788. Turnstile real somente na Edge Function.",
    ),
  );
