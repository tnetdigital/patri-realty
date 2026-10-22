import { describe, it, expect } from "vitest";
import { demoSuppliers } from "./fixtures";
import {
  directoryPath,
  filtersFromRoute,
  paginateSuppliers,
  safeHttps,
  videoId,
} from "./model";
describe("guia público", () => {
  it("preserva filtros acentuados e paginação na URL", () => {
    const f = {
      segmento: "limpeza",
      uf: "SP",
      cidade: "sao-paulo",
      q: "Conservação",
      pagina: 2,
      ordem: "nome" as const,
    };
    const u = new URL(directoryPath(f), "https://example.com");
    expect(filtersFromRoute(u.pathname, u.search)).toEqual(f);
  });
  it("inclui empresas que cobrem o estado inteiro", () => {
    const f = filtersFromRoute("/guia/manutencao-predial/sp/campinas", "");
    expect(
      paginateSuppliers(demoSuppliers, f).items.some((s) =>
        s.nome_fantasia.includes("Paulista"),
      ),
    ).toBe(true);
  });
  it("não mistura cobertura de estados", () => {
    const f = filtersFromRoute("/guia", "?uf=RJ");
    expect(
      paginateSuppliers(demoSuppliers, f).items.every((s) =>
        s.cobertura.some((c) => c.uf === "RJ"),
      ),
    ).toBe(true);
  });
  it("bloqueia links perigosos e vídeo fora da plataforma", () => {
    expect(safeHttps("javascript:alert(1)")).toBeNull();
    expect(safeHttps("https://user:secret@example.com")).toBeNull();
    expect(videoId("https://evil.test/dQw4w9WgXcQ")).toBeNull();
    expect(videoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
});
