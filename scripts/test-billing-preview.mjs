import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const goto = page.goto.bind(page);
page.goto = (path, options) =>
  goto("https://patri-realty-previa-05je1j.v2.appdeploy.ai/#" + path, options);
async function test(name, run) {
  try {
    await run({ page });
    if (errors.length) throw Error(errors.join("\n"));
    console.log(name + ": aprovado na prévia pública.");
  } finally {
    await browser.close();
  }
}

await test("ciclo de planos no celular preserva conteúdo, credita uma vez e libera contato", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on("dialog", (d) => d.accept());
  await page.goto("/demonstracao-plano");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", {
      name: "Reiniciar demonstração de planos",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Premium em teste", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simular fim do teste", exact: true })
    .click();
  await expect(
    page.getByText("1 foto visível · 4 fotos ocultas e preservadas", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Contato fictício liberado:", { exact: false }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Liberar pedido por 1 crédito", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Saldo insuficiente");
  await page
    .getByRole("button", { name: "Simular compra de 10 créditos", exact: true })
    .click();
  await expect(page.locator(".billing-current")).toContainText(
    /10\s*créditos disponíveis/,
  );
  await page
    .getByRole("button", {
      name: "Repetir último evento de pagamento",
      exact: true,
    })
    .click();
  await expect(page.locator(".billing-current")).toContainText(
    /10\s*créditos disponíveis/,
  );
  await page
    .getByRole("button", { name: "Liberar pedido por 1 crédito", exact: true })
    .click();
  await expect(
    page.getByText(/Contato fictício liberado: Síndico Exemplo/),
  ).toBeVisible();
  await expect(page.locator(".billing-current")).toContainText(
    /9\s*créditos disponíveis/,
  );
  await page.reload();
  await expect(page.locator(".billing-current")).toContainText(
    /9\s*créditos disponíveis/,
  );
  await page
    .getByRole("button", { name: "Simular assinatura Premium", exact: true })
    .click();
  await expect(
    page.getByText("5 fotos visíveis · nenhuma foto apagada", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/demonstracao-admin/planos");
  await page
    .locator("summary")
    .filter({ hasText: /^Premium$/ })
    .click();
  const form = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Premium" }) });
  await form.getByLabel("Preço em centavos", { exact: true }).fill("12900");
  await form.getByRole("button", { name: "Salvar plano", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Plano salvo");
  await page.reload();
  await page
    .locator("summary")
    .filter({ hasText: /^Premium$/ })
    .click();
  await expect(
    page.getByLabel("Preço em centavos", { exact: true }).nth(1),
  ).toHaveValue("12900");
});
