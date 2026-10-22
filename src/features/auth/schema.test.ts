import { describe, it, expect } from "vitest";
import { validCnpj, password, destination, registerSchema } from "./schema";
describe("documento e cadastro", () => {
  it("valida os dois dígitos do CNPJ", () => {
    expect(validCnpj("11.222.333/0001-81")).toBe(true);
    for (const v of ["11.222.333/0001-80", "11111111111111", "", "123"])
      expect(validCnpj(v)).toBe(false);
  });
  it("rejeita senha fraca e comum", () => {
    for (const v of ["abc", "abcdefgh", "12345678", "senha123"])
      expect(password.safeParse(v).success).toBe(false);
    expect(password.safeParse("Patri2026!").success).toBe(true);
  });
  it("não aceita cadastro administrativo", () => {
    expect(registerSchema.safeParse({ tipo: "admin" }).success).toBe(false);
  });
  it("exige CNPJ, WhatsApp e consentimento do fornecedor", () => {
    const v = {
      nome: "Fornecedor Teste",
      email: "teste@example.com",
      senha: "Patri2026!",
      tipo: "fornecedor",
      telefone: "11999999999",
      empresa: "Empresa Teste",
      cnpj: "11222333000181",
      cidade: "",
      estado: "",
      termos: true,
      newsletter: false,
    };
    expect(registerSchema.safeParse(v).success).toBe(true);
    for (const patch of [
      { termos: false },
      { cnpj: "11222333000180" },
      { telefone: "" },
      { empresa: "" },
    ])
      expect(registerSchema.safeParse({ ...v, ...patch }).success).toBe(false);
  });
});
describe("destino por papel", () => {
  it("separa acessos e exige seletor para papéis múltiplos", () => {
    expect(destination(["sindico"])).toBe("/area");
    expect(destination(["fornecedor"])).toBe("/painel");
    expect(destination(["editor"])).toBe("/admin/conteudo");
    expect(destination(["comercial"])).toBe("/admin");
    expect(destination(["admin"])).toBe("/admin");
    expect(destination(["admin", "fornecedor"])).toBe("/area");
  });
});
