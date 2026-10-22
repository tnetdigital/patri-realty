import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
async function open(page: import("@playwright/test").Page) {
  await page.goto("/demonstracao");
  const cookies = page.getByRole("button", { name: "Recusar opcionais" });
  if (await cookies.isVisible()) await cookies.click();
  await expect(
    page.getByRole("heading", { name: "Sua empresa. Sua próxima conexão." }),
  ).toBeVisible();
}
test("exemplo completo persiste, pré-visualiza e envia sem publicar", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Preencher exemplo fictício" })
    .click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "90",
  );
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "Marca", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome fantasia")).toHaveValue("Empresa Exemplo");
  await page.getByRole("button", { name: "Pré-visualizar página" }).click();
  await expect(
    page.getByRole("heading", { name: "Empresa Exemplo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Serviços", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar editando" }).click();
  await page
    .getByRole("button", { name: "Enviar para análise", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar envio" }).click();
  await expect(
    page.getByText("Perfil enviado para análise", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar alterações" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByText("Perfil enviado para análise", { exact: true }),
  ).toBeVisible();
});
test("valida CNPJ e contato no texto e mantém isolamento da equipe demo", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Preencher exemplo fictício" })
    .click();
  await page.getByLabel("CNPJ", { exact: true }).fill("11222333000180");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("CNPJ inválido.", { exact: true })).toBeVisible();
  await page.getByLabel("CNPJ", { exact: true }).fill("11222333000181");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page
    .getByRole("navigation", { name: "Etapas do cadastro" })
    .getByRole("button", { name: "Sobre", exact: true })
    .click();
  await page
    .getByLabel("Sobre a empresa", { exact: true })
    .fill("Fale com vendas@example.com");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByText("Não inclua telefone ou e-mail no texto Sobre.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Sobre a empresa", { exact: true })
    .fill("Apresentação sem dados de contato.");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.getByRole("button", { name: "Minha equipe", exact: true }).click();
  await page.getByLabel("E-mail do convidado").fill("editor@example.com");
  await page.getByRole("button", { name: "Convidar por e-mail" }).click();
  await expect(
    page.getByText(
      "Convite de demonstração criado. Nenhum e-mail foi enviado.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Minha equipe", exact: true }).click();
  await expect(
    page.getByText("editor@example.com", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Revogar acesso de editor@example.com" })
    .click();
  await expect(page.getByText("Revogado", { exact: true })).toBeVisible();
});
test("recorta imagem, persiste marca e navega no celular sem overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page
    .getByRole("button", { name: "Preencher exemplo fictício" })
    .click();
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 800;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#17383a";
    ctx.fillRect(0, 0, 800, 800);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByLabel("Selecionar Logo da empresa", { exact: true })
    .setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: Buffer.from(data, "base64"),
    });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("slider", { name: "Aproximar imagem" })
    .press("ArrowRight");
  await page.getByRole("button", { name: "Usar imagem", exact: true }).click();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("status")).toContainText("Alterações salvas");
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Logo da empresa", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Pré-visualizar página" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
