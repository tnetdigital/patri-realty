import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const uid = randomUUID(),
  mid = randomUUID(),
  slug = "materia-ssr-" + Date.now();
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
const server = spawn("node", ["server.mjs"], {
  env: { ...process.env, PORT: "5177", VITE_SITE_URL: "http://127.0.0.1:5177" },
  stdio: "ignore",
});
let browser;
try {
  sql(
    `insert into auth.users(id,email,raw_user_meta_data) values('${uid}','${uid}@content-ssr.test','{"nome":"Editor SSR Conteúdo","tipo":"sindico","cidade":"São Paulo","estado":"SP","termos":true,"termos_versao":"2026-10-19","privacidade_versao":"2026-10-19"}');insert into public.materias(id,titulo,slug,resumo,corpo,categoria_id,autor_id,tipo,status,publicada_em,seo_titulo,seo_descricao,motivo) select '${mid}','Leitura Editorial SSR','${slug}','Resumo de integração SSR','[{"tipo":"paragrafo","texto":"Texto público com mais de dez palavras para garantir leitura sem JavaScript e segurança da projeção editorial."}]',id,'${uid}','editorial','publicada',now(),'Título SEO editorial','Descrição SEO editorial','Comentário privado que não pode vazar' from public.categorias where ativa limit 1;insert into public.conteudo_redirects(tipo,slug_antigo,slug_novo) values('materia','antiga-${slug}','${slug}');`,
  );
  const base = "http://127.0.0.1:5177";
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(base + "/robots.txt");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const response = await fetch(base + "/materia/" + slug),
    html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<h1>Leitura Editorial SSR<\/h1>/);
  assert.match(html, /<title>Título SEO editorial \| Patri Realty<\/title>/);
  assert.match(html, /Descrição SEO editorial/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /Texto público com mais de dez palavras/);
  assert(!html.includes("Comentário privado"));
  assert(!html.includes(uid));
  assert.match(
    await (await fetch(base + "/sitemap.xml")).text(),
    new RegExp("/materia/" + slug),
  );
  const redirect = await fetch(base + "/materia/antiga-" + slug, {
    redirect: "manual",
  });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get("location"), "/materia/" + slug);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/materia/" + slug);
  await page
    .getByRole("heading", { name: "Leitura Editorial SSR", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.title === "Título SEO editorial | Patri Realty",
  );
  assert.deepEqual(errors, []);
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  sql(`update public.materias set status='arquivada' where id='${mid}'`);
  assert.equal((await fetch(base + "/materia/" + slug)).status, 404);
  assert(!(await (await fetch(base + "/sitemap.xml")).text()).includes(slug));
  console.log(
    "Conteúdo SSR: HTML sem JavaScript, SEO, Article, privacidade, 301, sitemap, remoção e hidratação móvel aprovados.",
  );
} finally {
  await browser?.close();
  server.kill();
  sql(
    `delete from public.conteudo_redirects where slug_novo='${slug}';delete from public.materias where id='${mid}';delete from public.user_roles where user_id='${uid}';delete from public.consentimentos where user_id='${uid}';delete from public.profiles where id='${uid}';delete from auth.users where id='${uid}';`,
  );
}
