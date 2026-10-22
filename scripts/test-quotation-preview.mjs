import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    (process.env.PATRI_PREVIEW_URL || "http://127.0.0.1:5178/") +
      "#/fornecedor/manutencao-exemplo-paulista",
  );
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", { name: "Simular envio de orçamento", exact: true })
    .click();
  await page.getByText("Informe pelo menos 3 caracteres.").waitFor();
  await page
    .getByRole("textbox", { name: "Seu nome", exact: true })
    .fill("Síndico QA");
  await page
    .getByRole("textbox", { name: "Seu e-mail", exact: true })
    .fill("sindico.qa@example.com");
  await page
    .getByRole("textbox", { name: "WhatsApp com DDD", exact: true })
    .fill("11988887777");
  await page
    .getByRole("textbox", { name: "Nome do condomínio", exact: true })
    .fill("Condomínio QA");
  await page
    .getByRole("textbox", { name: "Cidade do condomínio", exact: true })
    .fill("Campinas");
  await page
    .getByRole("combobox", { name: "Estado do condomínio", exact: true })
    .selectOption("SP");
  await page.getByLabel("Quantidade de unidades", { exact: true }).fill("30");
  await page
    .getByRole("textbox", { name: "Descreva sua necessidade", exact: true })
    .fill(
      "Precisamos de manutenção predial para o condomínio de demonstração.",
    );
  await page
    .getByRole("checkbox", { name: /Autorizo o compartilhamento/ })
    .check();
  await page
    .getByRole("button", { name: "Simular envio de orçamento", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "Simulação registrada neste navegador.",
      exact: true,
    })
    .waitFor();
  await page.getByRole("link", { name: "Ver pedidos no painel" }).click();
  await page
    .getByRole("button", { name: "Pedidos de orçamento", exact: true })
    .click();
  await page.getByRole("button", { name: /Condomínio QA/ }).click();
  await page
    .getByLabel("Nova nota", { exact: true })
    .fill("Contato simulado para amanhã");
  await page.getByRole("button", { name: "Salvar nota", exact: true }).click();
  await page
    .getByText("Contato simulado para amanhã", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Simular passagem de 48 horas" })
    .click();
  await page
    .getByRole("article")
    .getByText("Sem resposta há 48 horas", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Marcar como respondido", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Pedidos de orçamento", exact: true })
    .click();
  await page.getByRole("button", { name: /Condomínio QA/ }).click();
  await page
    .getByText("Contato simulado para amanhã", { exact: true })
    .waitFor();
  assert(
    await page
      .getByRole("button", { name: "Marcar como respondido", exact: true })
      .isDisabled(),
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Apagar simulações" }).click();
  await page.getByText(/Nenhum pedido neste filtro/).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Prévia móvel: validação, orçamento, painel, nota, 48h, resposta, persistência e limpeza aprovados.",
  );
} finally {
  await browser.close();
}
