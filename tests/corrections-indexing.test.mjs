import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(p, "utf8");
test("F17 relatório SSR reconhecido e privado para indexação", () => {
  const s = read("src/entry-server.tsx");
  assert.match(s, /relatorio/);
  assert.match(s, /noindex[\s\S]*relatorio|relatorio[\s\S]*noindex/);
});
test("F24 Open Graph completo", () => {
  const s = read("server.mjs");
  for (const tag of ["og:title", "og:description", "og:image"])
    assert.ok(s.includes(tag));
});
test("F14 fontes não bloqueiam rede externa e estáticos comprimidos", () => {
  for (const p of ["src/styles.css", "src/premium.css"])
    assert.doesNotMatch(read(p), /@import url\(/);
  assert.match(read("server.mjs"), /gzip/);
});
