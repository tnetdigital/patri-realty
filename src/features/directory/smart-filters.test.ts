import { describe, it, expect } from "vitest";
import taxonomy from "./taxonomy.json";
import states from "./states.json";
import { matchingOptions } from "./SmartCombobox";
import { directoryPath, filtersFromRoute, paginateSuppliers } from "./model";
import { demoSuppliers } from "./fixtures";
describe("filtros inteligentes", () => {
  it("mantém múltiplas especialidades e localidade na URL", () => {
    const f = {
      segmento: "elevadores,manutencao-predial",
      uf: "SP",
      cidade: "campinas",
      q: "",
      pagina: 2,
      ordem: "nome" as const,
    };
    const u = new URL(directoryPath(f), "https://example.com");
    expect(filtersFromRoute(u.pathname, u.search)).toEqual(f);
  });
  it("combina especialidades com OU sem repetir empresas", () => {
    const f = filtersFromRoute(
      "/guia",
      "?segmentos=elevadores,manutencao-predial",
    );
    const result = paginateSuppliers(demoSuppliers, f);
    expect(result.total).toBe(2);
    expect(new Set(result.items.map((x) => x.id)).size).toBe(2);
  });
  it("localiza estado por sigla, nome e sem acento a partir de duas letras", () => {
    const o = states.map((s) => ({
      value: s.uf,
      label: s.nome + " (" + s.uf + ")",
      search: s.uf,
    }));
    expect(matchingOptions(o, "s")).toEqual([]);
    expect(matchingOptions(o, "sp")[0].value).toBe("SP");
    expect(matchingOptions(o, "sao")[0].value).toBe("SP");
  });
  it("catálogo canônico não repete segmentos e preserva todos os termos importados", () => {
    expect(taxonomy.segments.length).toBe(150);
    expect(new Set(taxonomy.segments.map((s) => s.slug)).size).toBe(150);
    expect(
      taxonomy.segments.flatMap((s) =>
        s.sources.filter((x) => x.portal === "Carrara"),
      ).length,
    ).toBe(119);
    expect(
      taxonomy.segments.flatMap((s) =>
        s.sources.filter((x) => x.portal === "Direcional"),
      ).length,
    ).toBe(85);
    expect(states.length).toBe(27);
  });
});
