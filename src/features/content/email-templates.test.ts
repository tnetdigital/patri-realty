import { describe, it, expect } from "vitest";
import { renderEmail } from "../../../supabase/functions/_shared/email-templates";
describe("Templates transacionais separados", () => {
  it("mantém convite e destino pessoal", () => {
    const r = renderEmail(
      {
        template: "convite_equipe",
        payload: { empresa: "Empresa Teste", token: "safe-token" },
      },
      "https://site.test",
    );
    expect(r.finalTarget).toContain("/convite/safe-token");
    expect(r.body).toContain("14 dias");
  });
  it("renderiza resumo com payload tipado", () => {
    const r = renderEmail(
      {
        template: "relatorio_mensal",
        payload: { empresa: "Empresa Teste", visitas: 10, mes: "2026-10" },
      },
      "https://site.test",
    );
    expect(r.body).toContain("10 visitas");
    expect(r.body).toContain("2026-10");
  });
  it("identifica falha sem prometer pagamento", () => {
    const r = renderEmail(
      { template: "pagamento_falhou", payload: {} },
      "https://site.test",
    );
    expect(r.body).toContain("não foi confirmado");
  });
});
