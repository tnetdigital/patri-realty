import { test, expect } from "@playwright/test";
test("comercial mobile: contrato, preço, relatório e revogação", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demonstracao-comercial");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", { name: "Reiniciar demonstração", exact: true })
    .click();
  await page
    .getByLabel("Anunciante", { exact: true })
    .fill("Contrato de análise");
  await page.getByLabel("Produto", { exact: true }).selectOption("banner");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Salvo com sucesso" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Contrato de análise", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Banners", exact: true }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Salvo com sucesso" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Gerar relatório", exact: true })
    .click();
  const href = await page
    .getByRole("link", { name: "Abrir relatório do anunciante" })
    .getAttribute("href");
  expect(href).toContain("/demonstracao-relatorio/");
  await page.goto(href!);
  await expect(
    page.getByRole("heading", { name: "Anunciante Exemplo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Impressões", { exact: true }).first(),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.goto("/demonstracao-comercial");
  await page.getByRole("button", { name: "Banners", exact: true }).click();
  await page.getByRole("button", { name: "Revogar link", exact: true }).click();
  await page.goto(href!);
  await expect(
    page.getByText(/Link inválido, revogado ou expirado/),
  ).toBeVisible();
  await page.goto("/demonstracao-comercial");
  await page.getByRole("button", { name: "Preços", exact: true }).click();
  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: "Banner", exact: true }),
  });
  await form.getByRole("spinbutton").fill("490");
  await form.getByRole("button", { name: "Salvar preço" }).click();
  await expect(form.getByRole("status")).toContainText("Preço atualizado");
  await page.reload();
  await page.getByRole("button", { name: "Preços", exact: true }).click();
  await expect(
    page
      .locator("form")
      .filter({
        has: page.getByRole("heading", { name: "Banner", exact: true }),
      })
      .getByRole("spinbutton"),
  ).toHaveValue("490");
});
test("publicidade só conta impressão visível após consentimento", async ({
  page,
}) => {
  await page.goto("/demonstracao-comercial");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", { name: "Reiniciar demonstração", exact: true })
    .click();
  const ad = page.getByRole("complementary", { name: "Publicidade" });
  await ad.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("patri:commercial-demo:v1")!).metrics,
    ),
  ).toEqual({});
  await page.evaluate(() => {
    localStorage.setItem("patri:consent", "analytics");
    window.dispatchEvent(new Event("patri:consent"));
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("patri:commercial-demo:v1")!).metrics[
            "banner-demo-1"
          ]?.[0]?.impressoes || 0,
      ),
    )
    .toBe(1);
  await ad.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("patri:commercial-demo:v1")!).metrics[
          "banner-demo-1"
        ][0].impressoes,
    ),
  ).toBe(1);
});
test("três vagas de destaque e bloqueio de sobreposição no celular", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/demonstracao-comercial");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", { name: "Reiniciar demonstração", exact: true })
    .click();
  await page.getByLabel("Anunciante", { exact: true }).fill("Reserva Exemplo");
  await page.getByLabel("Produto", { exact: true }).selectOption("destaque");
  await page
    .getByLabel("Fornecedor vinculado (opcional para banners)", { exact: true })
    .selectOption("demo-company-0");
  await page.getByLabel("Situação", { exact: true }).selectOption("ativo");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reserva Exemplo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Destaques", exact: true }).click();
  const contract = await page
    .getByLabel("Contrato", { exact: true })
    .locator("option")
    .filter({ hasText: "Reserva Exemplo" })
    .getAttribute("value");
  for (const slot of ["1", "2", "3", "1"]) {
    await page.getByLabel("Contrato", { exact: true }).selectOption(contract!);
    await page
      .getByRole("button", { name: "Usar anunciante e vigência do contrato" })
      .click();
    await page
      .getByLabel("Fornecedor da reserva", { exact: true })
      .selectOption("demo-company-0");
    await page
      .getByLabel("Especialidade", { exact: true })
      .selectOption("demo-segment-2");
    await page.getByLabel("Estado", { exact: true }).selectOption("SP");
    await page.getByLabel("Vaga", { exact: true }).selectOption(slot);
    await page.getByLabel("Situação", { exact: true }).selectOption("ativo");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    if (slot === "1" && (await page.locator(".commercial-card").count()) === 3)
      await expect(
        page.getByRole("status").filter({ hasText: "Vaga já reservada" }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("status").filter({ hasText: "Salvo com sucesso" }),
      ).toBeVisible();
  }
  await expect(page.locator(".commercial-card")).toHaveCount(3);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
