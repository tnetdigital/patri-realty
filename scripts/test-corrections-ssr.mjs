import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const base = "http://127.0.0.1:5181";
const s = spawn("node", ["server.mjs"], {
  env: { ...process.env, PORT: "5181", VITE_SITE_URL: base },
  stdio: "ignore",
});
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/robots.txt")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  for (const path of [
    "/",
    "/guia",
    "/materias",
    "/revista",
    "/evento",
    "/contato",
    "/termos",
    "/privacidade",
  ]) {
    const r = await fetch(base + path),
      text = await r.text();
    assert.equal(r.status, 200, path);
    for (const p of ["og:title", "og:description", "og:image"])
      assert.ok(text.includes('property="' + p + '"'), path + " " + p);
  }
  const r = await fetch(base + "/relatorio/" + "a".repeat(64));
  const text = await r.text();
  assert.equal(r.status, 200);
  assert.match(text, /<meta name="robots" content="noindex,follow"/);
  const sitemap = await (await fetch(base + "/sitemap.xml")).text();
  for (const p of ["/evento", "/contato"])
    assert.ok(sitemap.includes(base + p), p);
  for (const p of ["/admin", "/conta", "/relatorio"])
    assert.ok(!sitemap.includes("<loc>" + base + p + "</loc>"));
  console.log("SSR: OG público, relatório noindex e sitemap aprovados.");
} finally {
  s.kill();
}
