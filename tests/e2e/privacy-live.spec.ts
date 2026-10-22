import { resetLocalLoginBudget } from "./local-login-budget";
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { loadEnv } from "vite";
test.skip(process.env.PATRI_LIVE_TESTS !== "1", "Requer stack local");
const sql = (s: string) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "patri-local-db-1",
      "psql",
      "-U",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: s, encoding: "utf8" },
  ).trim();
test("conta real: dados próprios, exportação e anonimização com senha e sessão revogada", async ({
  page,
}) => {
  // Isolated local fixture: clear the shared test IP budget before this scenario.
  sql("delete from private.conta_tentativas");
  const env = loadEnv("development", process.cwd(), ""),
    email = `privacy-${Date.now()}@example.com`;
  const response = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: "TestePatri2026!",
      data: {
        nome: "Pessoa Privacidade",
        tipo: "sindico",
        cidade: "São Paulo",
        estado: "SP",
        telefone: "11988887777",
        termos: true,
        termos_versao: "2026-10-21",
        privacidade_versao: "2026-10-21",
      },
    }),
  });
  expect(response.ok).toBe(true);
  const user = await response.json();
  sql(`update auth.users set email_confirmed_at=now() where id='${user.id}'`);
  await page.goto("/entrar");
  const reject = page.getByRole("button", { name: "Recusar opcionais" });
  if (await reject.isVisible()) await reject.click();
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
  await page.goto("/conta");
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Pessoa Atualizada");
  await page.getByRole("button", { name: "Salvar dados pessoais" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Dados pessoais atualizados.",
  );
  const exportRequest = page.waitForRequest(
    (r) => r.url().endsWith("/account") && r.method() === "POST",
  );
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar meus dados" }).click();
  const oldAuthorization = (await exportRequest).headers().authorization;
  const file = await downloading;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks).toString());
  expect(data.conta.nome).toBe("Pessoa Atualizada");
  expect(data.conta.email).toBe(email);
  await page.getByRole("button", { name: "Quero apagar minha conta" }).click();
  await page.getByLabel("Senha atual", { exact: true }).fill("ErradaSenha123");
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
  expect(
    sql(
      `select nome||'|'||ativo::text from public.profiles where id='${user.id}'`,
    ),
  ).toBe("Conta removida|false");
  expect(
    sql(`select count(*) from auth.sessions where user_id='${user.id}'`),
  ).toBe("0");
  expect(
    sql(`select count(*) from auth.refresh_tokens where user_id='${user.id}'`),
  ).toBe("0");
  expect(
    sql(
      `select (deleted_at is not null)::text from auth.users where id='${user.id}'`,
    ),
  ).toBe("true");
  expect(
    sql(
      `select count(*) from auth.identities where user_id='${user.id}' and (identity_data::text like '%${email}%' or identity_data::text like '%Pessoa Privacidade%' or provider_id='${email}')`,
    ),
  ).toBe("0");
  expect(
    sql(
      `select raw_user_meta_data::text from auth.users where id='${user.id}'`,
    ),
  ).not.toContain("Pessoa Privacidade");
  const stale = await fetch("http://127.0.0.1:8788/account", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:5173",
      Authorization: oldAuthorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "export" }),
  });
  expect(stale.status).toBe(401);
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/entrar/);
});

test.beforeEach(() => resetLocalLoginBudget());
