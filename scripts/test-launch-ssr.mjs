import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const base = "http://127.0.0.1:5179";
const server = spawn("node", ["server.mjs"], {
  env: { ...process.env, PORT: "5179", VITE_SITE_URL: base },
  stdio: "ignore",
});
try {
  for (let n = 0; n < 50; n++) {
    try {
      await fetch(base + "/robots.txt");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  for (const [path, title] of [
    ["/sobre-o-projeto", "Sobre a Patri Realty"],
    ["/para-fornecedores", "Para fornecedores"],
    ["/termos", "Termos de uso"],
    ["/privacidade", "Política de privacidade"],
  ]) {
    const response = await fetch(base + path),
      html = await response.text();
    assert.equal(response.status, 200);
    assert(html.includes("<title>" + title + " | Patri Realty</title>"));
    assert(html.includes("index,follow"));
    assert(html.includes('href="' + base + path + '"'));
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
  const map = await (await fetch(base + "/sitemap.xml")).text();
  for (const path of [
    "/sobre-o-projeto",
    "/para-fornecedores",
    "/termos",
    "/privacidade",
  ])
    assert(map.includes(base + path));
  const missing = await fetch(base + "/nao-existe");
  assert.equal(missing.status, 404);
  assert((await missing.text()).includes("Buscar fornecedores"));
  const account = await (await fetch(base + "/conta")).text();
  assert(account.includes("noindex"));
  assert(!account.includes("Pessoa Atualizada"));
  const home = await (await fetch(base + "/")).text();
  assert(home.includes("SearchAction"));
  assert(home.includes("Organization"));
  console.log(
    "Lançamento SSR: institucional indexável, canonical, sitemap, 404 útil, conta privada e Organization/WebSite aprovados.",
  );
} finally {
  server.kill();
}
