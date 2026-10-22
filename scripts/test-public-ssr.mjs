import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const uid = randomUUID(),
  sid = randomUUID(),
  slug = "teste-ssr-" + Date.now();
let cnpj = String(Date.now()).slice(-12).padStart(12, "1");
for (let len = 12; len < 14; len++) {
  let sum = 0,
    w = len - 7;
  for (let i = 0; i < len; i++) {
    sum += Number(cnpj[i]) * w;
    w = w === 2 ? 9 : w - 1;
  }
  cnpj += sum % 11 < 2 ? "0" : String(11 - (sum % 11));
}
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
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: s, stdio: ["pipe", "pipe", "pipe"] },
  );
const server = spawn("node", ["server.mjs"], {
  env: { ...process.env, PORT: "5176", VITE_SITE_URL: "http://127.0.0.1:5176" },
  stdio: "ignore",
});
let browser;
try {
  sql(
    `insert into auth.users(id,email,raw_user_meta_data) values ('${uid}','${uid}@ssr.test','{"nome":"Teste SSR","tipo":"sindico","cidade":"São Paulo","estado":"SP","termos":true,"termos_versao":"2026-10-19","privacidade_versao":"2026-10-19"}');insert into public.fornecedores(id,dono_id,nome_fantasia,cnpj,slug,status,descricao_curta,sobre) values ('${sid}','${uid}','Empresa de teste SSR','${cnpj}','${slug}','publicado','Descrição pública do teste SSR','Conteúdo público renderizado no servidor.');insert into public.slug_redirects(tipo,slug_antigo,slug_novo) values ('fornecedor','antigo-${slug}','${slug}');`,
  );
  const base = "http://127.0.0.1:5176";
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(base + "/robots.txt");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const response = await fetch(base + "/fornecedor/" + slug),
    html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<h1>Empresa de teste SSR<\/h1>/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /index,follow/);
  assert(!html.includes(cnpj));
  assert(!html.includes(uid));
  assert.match(
    await (await fetch(base + "/sitemap.xml")).text(),
    new RegExp(slug),
  );
  const moved = await fetch(base + "/fornecedor/antigo-" + slug, {
    redirect: "manual",
  });
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get("location"), "/fornecedor/" + slug);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/fornecedor/" + slug);
  await page
    .getByRole("heading", { name: "Empresa de teste SSR", exact: true })
    .waitFor();
  await page.waitForTimeout(500);
  assert.deepEqual(errors, []);
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  sql(`update public.fornecedores set status='rascunho' where id='${sid}';`);
  assert.equal((await fetch(base + "/fornecedor/" + slug)).status, 404);
  assert.equal(
    (await fetch(base + "/fornecedor/antigo-" + slug, { redirect: "manual" }))
      .status,
    404,
  );
  assert(!(await (await fetch(base + "/sitemap.xml")).text()).includes(slug));
  console.log(
    "SSR: HTML sem JavaScript, DTO público, schema, sitemap, 301, remoção imediata e hidratação móvel aprovados.",
  );
} finally {
  await browser?.close();
  server.kill();
  sql(
    `delete from public.slug_redirects where slug_novo='${slug}';delete from public.fornecedores where id='${sid}';delete from public.user_roles where user_id='${uid}';delete from public.consentimentos where user_id='${uid}';delete from public.profiles where id='${uid}';delete from auth.users where id='${uid}';`,
  );
}
