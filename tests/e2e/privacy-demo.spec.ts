import { test, expect } from "@playwright/test";
test("conta no celular: salvar, exportar, cancelar e confirmar exclusão", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/demonstracao-conta");
  const reject = page.getByRole("button", { name: "Recusar opcionais" });
  if (await reject.isVisible()) await reject.click();
  await page
    .getByRole("button", { name: "Reiniciar demonstração da conta" })
    .click();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Pessoa Revisão");
  await page.getByRole("button", { name: "Salvar dados pessoais" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Dados pessoais atualizados.",
  );
  await page.reload();
  await expect(page.getByLabel("Nome completo", { exact: true })).toHaveValue(
    "Pessoa Revisão",
  );
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar meus dados" }).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toBe("patri-realty-meus-dados.json");
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(JSON.parse(Buffer.concat(chunks).toString()).conta.nome).toBe(
    "Pessoa Revisão",
  );
  await page.getByRole("button", { name: "Quero apagar minha conta" }).click();
  await page.getByRole("button", { name: "Cancelar exclusão" }).click();
  await expect(page.getByLabel("Nome completo", { exact: true })).toHaveValue(
    "Pessoa Revisão",
  );
  await page.getByRole("button", { name: "Quero apagar minha conta" }).click();
  await page.getByLabel("Senha atual", { exact: true }).fill("SenhaErrada2026");
  await page.getByLabel("Digite APAGAR", { exact: true }).fill("APAGAR");
  await page
    .getByRole("button", { name: "Confirmar exclusão da conta" })
    .click();
  await expect(page.getByRole("alert")).toContainText("confirmar sua senha");
  await page.getByLabel("Senha atual", { exact: true }).fill("TestePatri2026!");
  await page
    .getByRole("button", { name: "Confirmar exclusão da conta" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conta removida", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Conta removida", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("institucional e documentos: navegação, versão e busca de página ausente", async ({
  page,
}) => {
  await page.goto("/para-fornecedores");
  await expect(
    page.getByRole("heading", {
      name: "A próxima conexão do seu negócio começa aqui.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Conhecer as regras" }).click();
  await expect(
    page.getByRole("heading", { name: "Termos de uso", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Versão 2026-10-21", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ler política de privacidade" }).click();
  await expect(
    page.getByRole("heading", { name: "Política de privacidade", exact: true }),
  ).toBeVisible();
  await page.goto("/endereco-inexistente");
  await page.getByLabel("Buscar no guia").fill("Elevadores");
  await page.getByRole("button", { name: "Buscar fornecedores" }).click();
  await expect(page).toHaveURL(/guia\?q=Elevadores/);
});
