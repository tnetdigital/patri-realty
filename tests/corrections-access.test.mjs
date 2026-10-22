import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
const read = (p) => readFileSync(p, "utf8");
const files = (p) =>
  readdirSync(p, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(p + "/" + e.name) : [p + "/" + e.name],
  );
test("F26 componentes não fazem consultas diretas", () => {
  for (const f of files("src").filter((p) => p.endsWith(".tsx")))
    assert.doesNotMatch(read(f), /\bdb\(\)\s*\.(from|rpc|storage)/, f);
});
test("F05 login obrigatório por gateway", () =>
  assert.doesNotMatch(read("src/features/auth/api.ts"), /signInWithPassword/));
test("F10 Área tem histórico próprio", () =>
  assert.match(read("src/pages/Area.tsx"), /QuotationHistory/));
test("F16 contato e evento têm rotas", () => {
  const s = read("src/pages/App.tsx");
  for (const p of ["/evento", "/contato"])
    assert.ok(s.includes('path="' + p + '"'));
});
test("F12 versão de consentimento única", () =>
  assert.match(read("src/lib/texts.ts"), /documentVersion/));
