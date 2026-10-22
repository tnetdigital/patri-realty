import { describe, it, expect } from "vitest";
import {
  blankArticle,
  validateArticle,
  wordCount,
  publicHref,
  videoId,
} from "./model";
const valid = () => ({
  ...blankArticle(),
  titulo: "Matéria de exemplo",
  categoria_id: "categoria",
  corpo: [
    {
      tipo: "paragrafo" as const,
      texto:
        "Uma publicação de exemplo com pelo menos dez palavras para validar as regras do fornecedor.",
    },
  ],
});
describe("conteúdo editorial", () => {
  it("limita palavras e links de fornecedor inclusive dentro de tabela", () => {
    expect(() => validateArticle(valid(), true)).not.toThrow();
    const tooLong = valid();
    tooLong.corpo[0].texto = "palavra ".repeat(601);
    expect(() => validateArticle(tooLong, true)).toThrow("600 palavras");
    const links = valid();
    links.corpo[0].texto += " https://example.com https://example.org";
    expect(() => validateArticle(links, true)).toThrow("um link");
  });
  it("rejeita HTML e impede endereços de script na leitura", () => {
    const a = valid();
    a.corpo[0].texto += "<script>";
    expect(() => validateArticle(a, true)).toThrow("HTML");
    expect(publicHref("javascript:alert(1)")).toBe("");
    expect(publicHref("https://example.com")).toBe("https://example.com");
    expect(videoId("https://youtu.be/abcdefghijk")).toBe("abcdefghijk");
  });
  it("conta palavras de tabelas no limite de texto", () => {
    expect(
      wordCount([
        {
          tipo: "tabela",
          texto: "Tabela de exemplo",
          linhas: [
            ["Cabeçalho um", "Cabeçalho dois"],
            ["Dado um", "Dado dois"],
          ],
        },
      ]),
    ).toBe(11);
  });
});
