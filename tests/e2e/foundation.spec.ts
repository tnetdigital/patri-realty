import { test, expect } from "@playwright/test";
test("home, cadastro e privacidade funcionam no celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Grandes parcerias/ }),
  ).toBeVisible();
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await expect(
    page.getByRole("region", { name: "Preferências de cookies" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("patri:consent"))).toBe(
    "essential",
  );
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await expect(
    page.getByRole("button", { name: "Fechar navegação" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Conexões", exact: true })
    .click();
  await expect(page).toHaveURL(/#conexoes$/);
  await expect(
    page.getByRole("button", { name: "Abrir navegação" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.goto("/cadastrar?tipo=fornecedor");
  await expect(page.getByLabel("CNPJ", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("visitante não acessa área administrativa", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/entrar/);
  await expect(
    page.getByRole("heading", { name: "Bom ter você por aqui." }),
  ).toBeVisible();
});
