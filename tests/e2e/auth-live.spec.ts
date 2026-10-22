import { resetLocalLoginBudget } from "./local-login-budget";
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
test.skip(
  process.env.PATRI_LIVE_TESTS !== "1",
  "Requer ambiente local de integração.",
);
const tag = Date.now();
function cnpj() {
  let d = String(tag).slice(-12);
  for (let len = 12; len <= 13; len++) {
    let weight = len - 7;
    const sum = [...d].reduce((a, n) => {
      const r = a + Number(n) * weight;
      weight = weight === 2 ? 9 : weight - 1;
      return r;
    }, 0);
    d += sum % 11 < 2 ? 0 : 11 - (sum % 11);
  }
  return d;
}
test.describe.configure({ mode: "serial" });
async function confirm(page: import("@playwright/test").Page, email: string) {
  let id = "";
  await expect
    .poll(
      async () => {
        const data = await (
          await fetch("http://127.0.0.1:54324/api/v1/messages")
        ).json();
        const msg = data.messages.find((m: { To: { Address: string }[] }) =>
          m.To.some((a) => a.Address === email),
        );
        id = msg?.ID;
        return Boolean(id);
      },
      { timeout: 15000 },
    )
    .toBe(true);
  const message = await (
    await fetch("http://127.0.0.1:54324/api/v1/message/" + id)
  ).json();
  const text = (message.HTML || message.Text).replaceAll("&amp;", "&");
  const link = text.match(
    /https?:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify[^"\s<>]*/,
  )?.[0];
  expect(link).toBeTruthy();
  await page.goto(link!);
  await page.waitForURL(/127\.0\.0\.1:5173/);
}
async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
test("cadastro de fornecedor, e-mail real local, painel e isolamento do admin", async ({
  page,
}) => {
  const email = `fornecedor-${tag}@example.com`;
  await page.goto("/cadastrar?tipo=fornecedor");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page.getByLabel("Nome completo").fill("Fornecedor Integração");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
  await page.getByLabel("WhatsApp com DDD").fill("11999998888");
  await page.getByLabel("Nome da empresa").fill("Fornecedor Integração");
  await page.getByLabel("CNPJ", { exact: true }).fill(cnpj());
  await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/confirmar-email/);
  await confirm(page, email);
  await expect(page).toHaveURL(/painel/);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Acesso restrito" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, email);
  await expect(page).toHaveURL(/painel/);
});
test("cadastro de síndico e admin concedido apenas no banco", async ({
  page,
}) => {
  const email = `sindico-${tag}@example.com`;
  await page.goto("/cadastrar");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page.getByLabel("Nome completo").fill("Síndico Integração");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
  await expect(page.getByLabel("Estado", { exact: true })).toContainText("SP");
  await page.getByLabel("Estado", { exact: true }).selectOption("SP");
  await page.getByLabel("Cidade", { exact: true }).selectOption("São Paulo");
  await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/confirmar-email/);
  await confirm(page, email);
  await expect(page).toHaveURL(/\/area#?$/);
  await expect(
    page.getByRole("heading", { name: "Meus pedidos de orçamento" }),
  ).toBeVisible();
  execFileSync("docker", [
    "exec",
    "patri-local-db-1",
    "psql",
    "-U",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `insert into public.user_roles(user_id,role) select id,'admin' from auth.users where email='${email}'`,
  ]);
  await page.reload();
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Administração", exact: true }),
  ).toBeVisible();
});

test.beforeEach(() => resetLocalLoginBudget());
