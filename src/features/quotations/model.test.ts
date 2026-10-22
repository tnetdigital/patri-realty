import { it, expect } from "vitest";
import { quotationSchema } from "./model";
const valid = {
  nome: "Síndico Exemplo",
  email: "sindico@example.com",
  telefone: "(11) 98888-7777",
  condominio_nome: "Condomínio Exemplo",
  cidade: "São Paulo",
  uf: "SP",
  unidades: "30",
  urgencia: "planejamento",
  mensagem: "Precisamos de um orçamento para manutenção predial.",
  privacidade: true,
  website: "",
  fornecedor_id: "supplier",
  segmento_id: "segment",
  copias: [],
};
it("normaliza telefone e unidades sem perder o aceite", () => {
  expect(quotationSchema.parse(valid)).toMatchObject({
    telefone: "11988887777",
    unidades: 30,
    privacidade: true,
  });
});
it("rejeita ausência de aceite, HTML, honeypot e mais de duas cópias", () => {
  for (const patch of [
    { privacidade: false },
    { mensagem: "<script>alert(1)</script>" },
    { website: "bot" },
    { copias: ["1", "2", "3"] },
    { unidades: 0 },
    { email: "incorreto" },
  ])
    expect(quotationSchema.safeParse({ ...valid, ...patch }).success).toBe(
      false,
    );
});
