import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
const read = (p) => readFileSync(p, "utf8");
test("F13 contrato de fornecedor com revisão jurídica", () => {
  assert.match(read("src/pages/App.tsx"), /path="\/contrato-fornecedor"/);
  assert.match(
    read("src/pages/InstitutionalPages.tsx"),
    /Contrato de fornecedor/,
  );
  assert.match(
    read("src/pages/InstitutionalPages.tsx"),
    /\[REVISÃO JURÍDICA NECESSÁRIA\]/,
  );
});
test("F28 fallback textual também no HTML inicial", () =>
  assert.match(
    read("src/components/BrandLogo.tsx"),
    /useState\(false\)[\s\S]*!available/,
  ));
test("Identidade conhecida preservada e pendências visíveis", () => {
  assert.match(read("src/lib/brand.ts"), /53\.816\.326\/0001-58/);
  assert.match(
    read("src/pages/InstitutionalPages.tsx"),
    /\[PENDENTE: e-mail de atendimento\]/,
  );
});
test("Nome antigo não permanece em textos da marca", () => {
  const walk = (p) =>
    readdirSync(p, { withFileTypes: true }).flatMap((x) =>
      x.isDirectory() ? walk(p + "/" + x.name) : [p + "/" + x.name],
    );
  for (const p of walk("src").filter((x) => /\.(tsx?|json|css)$/.test(x)))
    assert.doesNotMatch(
      read(p),
      /Portal Carrara|Portal Direcional|CondoHub|CondoConnect/i,
      p,
    );
});
test("F11 comercial pode editar somente preço na interface", () =>
  assert.match(read("src/features/billing/AdminBilling.tsx"), /priceOnly/));
test("F02 concessão mostra validade na interface", () =>
  assert.match(read("src/pages/AdminPage.tsx"), /Validade da concessão/));
test("F12 documentos legais leem a versão publicada", () =>
  assert.match(
    read("src/pages/InstitutionalPages.tsx"),
    /publicDocumentVersion/,
  ));
