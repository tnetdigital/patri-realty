import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(p, "utf8");
test("F28 marca textual com pendência até original", () => {
  const s = read("src/components/BrandLogo.tsx");
  assert.match(s, /\[PENDENTE: logotipo original\]/);
  assert.match(s, />Patri Realty</);
});
test("F13 marcador jurídico visível", () =>
  assert.match(
    read("src/pages/InstitutionalPages.tsx"),
    /\[REVISÃO JURÍDICA NECESSÁRIA\]/,
  ));
test("F18 artigo mede leitura e clique atribuído", () => {
  const s = read("src/features/growth/events.tsx");
  assert.match(s, /tempo_materia/);
  assert.match(read("src/pages/ContentPublic.tsx"), /clique_perfil_materia/);
});
test("F19 comercial mostra calendário e faturamento", () => {
  const s = read("src/pages/CommercialPage.tsx");
  assert.match(s, /CommercialCalendar/);
  assert.match(s, /Faturamento/);
});
