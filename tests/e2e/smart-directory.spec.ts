import { test, expect } from "@playwright/test";
test("especialidades agrupadas e localização inteligente no celular", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/guia");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  const state = page.getByRole("combobox", { name: "Estado", exact: true }),
    city = page.getByRole("combobox", {
      name: "Cidade de atendimento",
      exact: true,
    });
  await expect(city).toBeDisabled();
  await state.fill("sp");
  await expect(
    page.getByRole("option", { name: "São Paulo (SP)", exact: true }),
  ).toBeVisible();
  await state.press("ArrowDown");
  await state.press("Enter");
  await expect(state).toHaveValue("São Paulo (SP)");
  await city.fill("cam");
  await page.getByRole("option", { name: "Campinas", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar especialidade", exact: true })
    .fill("administradoras");
  await page
    .getByRole("checkbox", { name: /^Administração condominial/ })
    .check();
  await page
    .getByRole("textbox", { name: "Buscar especialidade", exact: true })
    .fill("elevadores");
  await page.getByRole("checkbox", { name: /^Elevadores/ }).check();
  await page
    .getByRole("button", { name: "Concluir seleção", exact: true })
    .click();
  await page.getByRole("button", { name: /^Encontrar fornecedores/ }).click();
  await expect(page).toHaveURL(
    /segmentos=.*administracao-condominial.*elevadores.*uf=SP.*cidade=campinas/,
  );
  await page.reload();
  await expect(state).toHaveValue("São Paulo (SP)");
  await expect(city).toHaveValue("Campinas");
  await expect(
    page.getByRole("button", { name: "Remover Elevadores", exact: true }),
  ).toBeVisible();
  await state.fill("rio");
  await page
    .getByRole("option", { name: "Rio de Janeiro (RJ)", exact: true })
    .click();
  await expect(city).toHaveValue("");
  await city.fill("campinas");
  await expect(
    page.getByText("Nenhuma opção encontrada. Confira a grafia.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Encontrar fornecedores/ }).click();
  await expect(page).toHaveURL(/uf=SP/);
  await city.fill("niter");
  await page.getByRole("option", { name: "Niterói", exact: true }).click();
  await page
    .getByRole("button", { name: "Remover Elevadores", exact: true })
    .click();
  await page.getByRole("button", { name: /^Encontrar fornecedores/ }).click();
  await expect(page).toHaveURL(/guia\/administracao-condominial\/rj\/niteroi/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
