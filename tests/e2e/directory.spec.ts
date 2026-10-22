import { test, expect } from "@playwright/test";
import {
  demoCatalog,
  demoSuppliers,
} from "../../src/features/directory/fixtures";
import { paginateSuppliers } from "../../src/features/directory/model";
test("guia filtra por cobertura, abre perfil e preserva URL", async ({
  page,
}) => {
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = route.request().url().split("/").pop(),
      a = route.request().postDataJSON();
    let data: unknown = {};
    if (name === "catalogo_guia") data = demoCatalog(a.p_uf);
    if (name === "buscar_fornecedores")
      data = paginateSuppliers(demoSuppliers, {
        segmento: a.p_segmento,
        uf: a.p_uf,
        cidade: a.p_cidade,
        q: a.p_q,
        pagina: a.p_pagina,
        ordem: a.p_ordem,
      });
    if (name === "fornecedor_publico")
      data = {
        fornecedor: demoSuppliers.find((s) => s.slug === a.p_slug) || null,
        redirect: null,
      };
    await route.fulfill({ json: data });
  });
  await page.goto("/guia");
  await expect(
    page.getByRole("heading", {
      name: "Boas soluções começam com boas conexões.",
    }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Estado", exact: true }).fill("sã");
  await page
    .getByRole("option", { name: "São Paulo (SP)", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Cidade de atendimento", exact: true })
    .fill("cam");
  await page.getByRole("option", { name: "Campinas", exact: true }).click();
  await page.getByRole("button", { name: "Encontrar fornecedores" }).click();
  await expect(page).toHaveURL(/uf=SP.*cidade=campinas/);
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Cidade de atendimento", exact: true }),
  ).toHaveValue("Campinas");
  await page.getByRole("link", { name: "Conhecer empresa" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Sobre a empresa" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Onde atende" }),
  ).toBeVisible();
  await page.goBack();
  await page.getByLabel("O que você procura?").fill("SemResultadoXYZ");
  await page.getByRole("button", { name: "Encontrar fornecedores" }).click();
  await expect(
    page.getByRole("heading", { name: "Ainda não encontramos esse parceiro." }),
  ).toBeVisible();
});
test("Instagram exige ação para incorporar e mantém link de fallback", async ({
  page,
}) => {
  const s = {
    ...demoSuppliers[0],
    instagram: "https://www.instagram.com/empresaexemplo/",
    instagram_posts: ["https://www.instagram.com/p/EXEMPLO123/"],
  };
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = route.request().url().split("/").pop();
    await route.fulfill({
      json:
        name === "catalogo_guia"
          ? demoCatalog()
          : name === "buscar_fornecedores"
            ? { items: [], total: 0, pagina: 1, paginas: 0, not_found: false }
            : name === "fornecedor_publico"
              ? { fornecedor: s, redirect: null }
              : name === "listar_avaliacoes"
                ? { items: [], total: 0, media: null, publicadas: 0 }
                : [],
    });
  });
  await page.context().route("https://www.instagram.com/**", (r) => r.abort());
  await page.goto("/fornecedor/" + s.slug);
  await expect(
    page.getByRole("link", { name: "Abrir publicação no Instagram" }),
  ).toBeVisible();
  await expect(page.getByTitle("Publicação oficial do Instagram")).toHaveCount(
    0,
  );
  const request = page.waitForRequest(
    "https://www.instagram.com/p/EXEMPLO123/embed/",
  );
  await page
    .getByRole("button", { name: "Carregar publicação do Instagram" })
    .click();
  await request;
  await expect(
    page.getByRole("link", { name: "Abrir publicação no Instagram" }),
  ).toBeVisible();
});
