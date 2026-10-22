import { resetLocalLoginBudget } from "./local-login-budget";
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
test.skip(
  process.env.PATRI_LIVE_TESTS !== "1",
  "Requer integração local com Auth, Storage e SMTP.",
);
const tag = Date.now();
function document() {
  let value = String(tag).slice(-12);
  for (let length = 12; length <= 13; length++) {
    let weight = length - 7;
    const n = [...value].reduce((a, v) => {
      const next = a + Number(v) * weight;
      weight = weight === 2 ? 9 : weight - 1;
      return next;
    }, 0);
    value += n % 11 < 2 ? 0 : 11 - (n % 11);
  }
  return value;
}
async function mail(email: string) {
  let id = "";
  await expect
    .poll(
      async () => {
        const r = await (
          await fetch("http://127.0.0.1:54324/api/v1/messages?limit=500")
        ).json();
        id = r.messages.find((m: { To: { Address: string }[] }) =>
          m.To.some((a) => a.Address === email),
        )?.ID;
        return !!id;
      },
      { timeout: 15000 },
    )
    .toBe(true);
  return await (
    await fetch("http://127.0.0.1:54324/api/v1/message/" + id)
  ).json();
}
async function confirm(page: import("@playwright/test").Page, email: string) {
  const m = await mail(email);
  const href = (m.HTML || m.Text)
    .replaceAll("&amp;", "&")
    .match(/http:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify[^"\s<>]*/)?.[0];
  expect(href).toBeTruthy();
  await page.goto(href!);
}
async function upload(
  page: import("@playwright/test").Page,
  label: string,
  width: number,
  height: number,
) {
  const data = await page.evaluate(
    ({ width, height }) => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#17383a";
      ctx.fillRect(0, 0, width, height);
      return c.toDataURL("image/png").split(",")[1];
    },
    { width, height },
  );
  await page.getByLabel("Selecionar " + label, { exact: true }).setInputFiles({
    name: "imagem.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Usar imagem", exact: true })
    .click();
  await expect(page.getByRole("dialog"))
    .toHaveCount(0, { timeout: 15000 })
    .catch(async () => {
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
}
test("cinco etapas, uploads reais, envio privado e convite de editor", async ({
  page,
  browser,
}) => {
  const email = `supplier-full-${tag}@example.com`,
    editor = `member-full-${tag}@example.com`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/cadastrar?tipo=fornecedor");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page.getByLabel("Nome completo").fill("Fornecedor Completo");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
  await page.getByLabel("WhatsApp com DDD").fill("11999998888");
  await page.getByLabel("Nome da empresa").fill("Empresa Completa");
  await page.getByLabel("CNPJ", { exact: true }).fill(document());
  await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/confirmar-email/);
  await confirm(page, email);
  await expect(page).toHaveURL(/painel/);
  await page
    .getByLabel("WhatsApp com DDD", { exact: true })
    .fill("11999998888");
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "Marca", exact: true }),
  ).toBeVisible();
  await upload(page, "Logo da empresa", 800, 800);
  await upload(page, "Capa da empresa", 1600, 900);
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  await page
    .getByLabel("Descrição curta", { exact: true })
    .fill("Soluções de manutenção para condomínios.");
  await page
    .getByLabel("Sobre a empresa", { exact: true })
    .fill("Empresa de demonstração do fluxo completo de cadastro.");
  await page
    .getByRole("checkbox", { name: "Manutenção predial", exact: true })
    .check();
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  await page
    .getByLabel("Estado de atendimento", { exact: true })
    .selectOption("SP");
  await page
    .getByRole("button", { name: "Adicionar região", exact: true })
    .click();
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await page.getByRole("button", { name: "Pré-visualizar página" }).click();
  await expect(
    page.getByRole("heading", { name: "Empresa Completa", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar editando" }).click();
  await page
    .getByRole("button", { name: "Enviar para análise", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar envio", exact: true })
    .click();
  await expect(
    page.getByText("Perfil enviado para análise", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Minha equipe", exact: true }).click();
  await page.getByLabel("E-mail do convidado").fill(editor);
  await page
    .getByRole("button", { name: "Convidar por e-mail", exact: true })
    .click();
  await expect(
    page.getByText("Convite registrado para envio por e-mail.", {
      exact: true,
    }),
  ).toBeVisible();
  execFileSync("python", ["scripts/local-emails.py"]);
  const invitation = await mail(editor);
  const link = (invitation.Text || invitation.HTML).match(
    /http:\/\/127\.0\.0\.1:5173\/convite\/[a-f0-9]{64}/,
  )?.[0];
  expect(link).toBeTruthy();
  const context = await browser.newContext(),
    member = await context.newPage();
  await member.goto(link!);
  await member.getByRole("button", { name: "Recusar opcionais" }).click();
  await member
    .getByRole("button", { name: "Criar conta", exact: true })
    .click();
  await member.getByLabel("Nome completo").fill("Editor Convidado");
  await member.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
  await member.getByRole("checkbox").check();
  await member
    .getByRole("button", { name: "Criar minha conta de editor", exact: true })
    .click();
  await expect(
    member.getByRole("heading", { name: "Confirme seu e-mail" }),
  ).toBeVisible();
  await confirm(member, editor);
  await expect(member).toHaveURL(/painel/);
  await member
    .getByRole("button", { name: "Minha equipe", exact: true })
    .click();
  await expect(
    member.getByText("Somente o dono pode gerenciar a equipe.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    member.getByRole("button", { name: "Convidar por e-mail" }),
  ).toHaveCount(0);
  await context.close();
});

test.beforeEach(() => resetLocalLoginBudget());
