import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
test("admin demonstra revisão, CSV com erro por linha, auditoria e comercial somente leitura", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on("dialog", (d) => d.accept());
  await page.goto("/demonstracao-admin/fornecedores");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", { name: "Reiniciar demonstração administrativa" })
    .click();
  await page
    .getByRole("button", {
      name: "Abrir Empresa Exemplo em Análise",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Aprovar e publicar", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("checklist");
  for (const name of [
    "Logo legível",
    "Descrição sem contato indevido ou propaganda enganosa",
    "CNPJ válido e situação ativa conferida",
    "Fotos próprias ou autorizadas",
    "Especialidades coerentes",
  ])
    await page.getByRole("checkbox", { name, exact: true }).check();
  await page
    .getByRole("button", { name: "Aprovar e publicar", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Operação simulada salva",
  );
  await expect(page.locator("tbody")).toContainText("publicado");
  await page.reload();
  await expect(page.locator("tbody")).toContainText("publicado");
  await page.goto("/demonstracao-admin/importar");
  const csv =
    "nome_fantasia,cnpj,segmento,cidade,uf,whatsapp,email,site,instagram\nImportada QA,04252011000110,Elevadores,São Paulo,SP,11988887777,dono@example.com,https://example.com,exemplo\nInválida QA,123,Elevadores,São Paulo,SP,11988887777,dono@example.com,https://example.com,exemplo";
  await page.getByLabel("Arquivo CSV", { exact: true }).setInputFiles({
    name: "fornecedores.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.locator("tbody")).toContainText("CNPJ inválido");
  await page
    .getByRole("button", { name: "Confirmar importação", exact: true })
    .click();
  await expect(page.locator(".admin-summary")).toContainText("1 criados");
  await page.goto("/demonstracao-admin/fornecedores");
  await page
    .getByRole("button", { name: "Abrir Importada QA", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Detalhes do registro" }),
  ).toContainText("rascunho");
  await page.goto("/demonstracao-admin/auditoria");
  await expect(page.locator("tbody")).toContainText("IMPORTACAO_CSV");
  await page
    .getByRole("combobox", { name: /^Simular papel/ })
    .selectOption("comercial");
  await page.goto("/demonstracao-admin/fornecedores");
  await page
    .getByRole("combobox", { name: /^Simular papel/ })
    .selectOption("comercial");
  await page
    .getByRole("button", {
      name: "Abrir Empresa Exemplo em Análise",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Aprovar e publicar", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
