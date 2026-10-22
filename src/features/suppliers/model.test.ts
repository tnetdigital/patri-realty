import { describe, it, expect } from "vitest";
import {
  blankSupplier,
  completeness,
  diagnosis,
  initialLimits,
  canSubmit,
  validateStep,
  hasContact,
  youtubeId,
  slugify,
} from "./model";
import { checkDimensions, cropRectangle } from "./images";
const valid = () => ({
  ...blankSupplier(),
  nome_fantasia: "Empresa Teste",
  cnpj: "11222333000181",
  whatsapp: "11999999999",
  logo_url: "https://example.com/logo.webp",
  descricao_curta: "Descrição de exemplo",
  segmentos: ["00000000-0000-4000-8000-000000000001"],
  cobertura: [{ id: "r", uf: "SP", cidade_id: null, cidade_nome: "" }],
});
describe("cadastro do fornecedor", () => {
  it("calcula os 100 pontos previstos sem inventar avaliações", () => {
    const d = {
      ...valid(),
      capa_url: "capa",
      sobre: "a".repeat(301),
      midias: Array.from({ length: 5 }, (_, i) => ({
        id: String(i),
        url: "foto",
        legenda: "",
      })),
      servicos: Array.from({ length: 3 }, (_, i) => ({
        id: String(i),
        titulo: "Serviço",
        descricao: "",
        foto_url: "",
      })),
      cases: [
        { id: "case", condominio: "Exemplo", descricao: "", foto_url: "" },
      ],
      faqs: Array.from({ length: 3 }, (_, i) => ({
        id: String(i),
        pergunta: "Pergunta",
        resposta: "Resposta",
      })),
      instagram: "exemplo",
    };
    expect(completeness(d)).toBe(90);
    expect(completeness({ ...d, avaliacoes_publicadas: 3 })).toBe(100);
    expect(completeness({ ...d, midias: [] })).toBe(80);
    expect(diagnosis(d).reduce((s, i) => s + i.points, 0)).toBe(100);
  });
  it("exige mínimo e impede reenvio em análise", () => {
    expect(canSubmit(blankSupplier())).toBe(false);
    expect(canSubmit(valid())).toBe(true);
    expect(canSubmit({ ...valid(), logo_url: "" })).toBe(false);
    expect(canSubmit({ ...valid(), status: "em_analise" })).toBe(false);
  });
  it("rejeita CNPJ inválido, HTTP, @ e contato no Sobre", () => {
    expect(
      validateStep({ ...valid(), cnpj: "11222333000180" }, 0, initialLimits),
    ).toHaveProperty("cnpj");
    expect(
      validateStep(
        { ...valid(), site: "http://example.com" },
        0,
        initialLimits,
      ),
    ).toHaveProperty("site");
    expect(
      validateStep({ ...valid(), instagram: "@exemplo" }, 0, initialLimits),
    ).toHaveProperty("instagram");
    expect(
      validateStep(
        { ...valid(), sobre: "Fale com vendas@example.com" },
        2,
        initialLimits,
      ),
    ).toHaveProperty("sobre");
    expect(hasContact("(11) 99999-9999")).toBe(true);
  });
  it("valida limites configuráveis e limpeza de texto", () => {
    expect(
      validateStep(
        {
          ...valid(),
          servicos: [
            {
              id: "s",
              titulo: "Um serviço",
              descricao: "<script>alert(1)</script>",
              foto_url: "",
            },
          ],
        },
        4,
        initialLimits,
      ),
    ).toHaveProperty("servicos.0.descricao");
    expect(
      validateStep(
        {
          ...valid(),
          cases: [
            { id: "s", condominio: "Condomínio", descricao: "", foto_url: "" },
          ],
        },
        4,
        { ...initialLimits, cases: 0 },
      ),
    ).toHaveProperty("cases");
    expect(
      validateStep(
        { ...valid(), midias: [{ id: "m", url: "", legenda: "" }] },
        4,
        initialLimits,
      ),
    ).toHaveProperty("midias.0.url");
  });
  it("normaliza slug e aceita somente YouTube HTTPS válido", () => {
    expect(slugify("Conexão & Manutenção")).toBe("conexao-manutencao");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ")).toBe(
      null,
    );
    expect(youtubeId("javascript:alert(1)")).toBe(null);
  });
});
describe("tratamento de imagens", () => {
  it("exige resolução mínima de logo e capa", () => {
    expect(() => checkDimensions(399, 400, "logo")).toThrow();
    expect(() => checkDimensions(1600, 899, "cover")).toThrow();
    expect(() => checkDimensions(1600, 900, "cover")).not.toThrow();
  });
  it("mantém recorte dentro da imagem em todos os deslocamentos", () => {
    for (const ratio of [1, 16 / 9])
      for (const x of [-10, 0, 50, 100, 120]) {
        const r = cropRectangle(2000, 1200, ratio, { zoom: 2, x, y: x });
        expect(r.sx).toBeGreaterThanOrEqual(0);
        expect(r.sy).toBeGreaterThanOrEqual(0);
        expect(r.sx + r.sw).toBeLessThanOrEqual(2000);
        expect(r.sy + r.sh).toBeLessThanOrEqual(1200);
        expect(r.sw / r.sh).toBeCloseTo(ratio);
      }
  });
});
