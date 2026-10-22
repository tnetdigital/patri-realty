import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import AuthPage from "../../pages/AuthPage";

function registration(entry: string) {
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(
        MemoryRouter,
        { initialEntries: [entry] },
        createElement(AuthPage, { mode: "register" }),
      ),
    ),
  );
}

describe("cadastro escolhe o público pela URL do roteador", () => {
  it("abre o cadastro empresarial mesmo sem location global do navegador", () => {
    const html = registration("/cadastrar?tipo=fornecedor");
    expect(html).toContain('name="cnpj"');
    expect(html).toContain('name="empresa"');
    expect(html).not.toContain('name="condominio_nome"');
  });

  it("mantém o cadastro de síndico como padrão", () => {
    const html = registration("/cadastrar");
    expect(html).toContain('name="condominio_nome"');
    expect(html).not.toContain('name="cnpj"');
  });
});
