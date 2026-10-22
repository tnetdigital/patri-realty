import { resetLocalLoginBudget } from "./local-login-budget";
import { test, expect } from "@playwright/test";
import { loadEnv } from "vite";
import { execFileSync } from "node:child_process";
test.skip(process.env.PATRI_LIVE_TESTS !== "1", "Stack local requerida");
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
test("comercial conectado: salva campanha, registra evento real e revoga relatório", async ({
  page,
  browser,
}) => {
  const env = loadEnv("development", process.cwd(), ""),
    name = "Anunciante integração " + Date.now(),
    email = "comercial-" + Date.now() + "@example.com";
  const res = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: "TestePatri2026!",
      data: {
        nome: "Comercial Integração",
        tipo: "sindico",
        cidade: "São Paulo",
        estado: "SP",
        termos: true,
        termos_versao: "2026-10-19",
        privacidade_versao: "2026-10-19",
      },
    }),
  });
  expect(res.ok).toBe(true);
  const uid = (await res.json()).id;
  sql(
    `update auth.users set email_confirmed_at=now() where id='${uid}';insert into public.user_roles(user_id,role) values('${uid}','comercial');`,
  );
  let bid = "",
    cid = "";
  try {
    await page.goto("/entrar");
    await page.getByRole("button", { name: "Recusar opcionais" }).click();
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/area|admin/);
    await page.goto("/admin/comercial");
    await page.getByLabel("Anunciante", { exact: true }).fill(name);
    await page.getByLabel("Produto", { exact: true }).selectOption("banner");
    await page.getByLabel("Situação", { exact: true }).selectOption("ativo");
    await page.getByLabel("Início", { exact: true }).fill("2026-10-01T00:00");
    await page.getByLabel("Fim", { exact: true }).fill("2027-01-01T00:00");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Salvo com sucesso" }),
    ).toBeVisible();
    cid = sql(
      `select id from public.contratos where anunciante_nome='${name}'`,
    );
    await page.getByRole("button", { name: "Banners", exact: true }).click();
    await page.getByLabel("Contrato", { exact: true }).selectOption(cid);
    await page
      .getByRole("button", { name: "Usar anunciante e vigência do contrato" })
      .click();
    await page
      .getByLabel("Posição", { exact: true })
      .selectOption({ label: "Topo da home" });
    await page
      .getByLabel("Enviar imagem desktop", { exact: true })
      .setInputFiles("public/images/architecture-detail.jpg");
    await expect(
      page.getByLabel("Imagem desktop (URL)", { exact: true }),
    ).toHaveValue(/\/storage\/v1\/object\/public\/banners\//);
    await page
      .getByLabel("Imagem mobile (URL)", { exact: true })
      .fill("https://example.com/banner-mobile.jpg");
    await page
      .getByLabel("Destino HTTPS", { exact: true })
      .fill("https://example.com/campanha");
    await page.getByLabel("Situação", { exact: true }).selectOption("ativo");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Salvo com sucesso" }),
    ).toBeVisible();
    bid = sql(`select id from public.banners where anunciante_nome='${name}'`);
    const card = page
      .locator(".commercial-card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
    await card
      .getByRole("button", { name: "Gerar relatório", exact: true })
      .click();
    const href = await page
      .getByRole("link", { name: "Abrir relatório do anunciante" })
      .getAttribute("href");
    const ctx = await browser.newContext(),
      reader = await ctx.newPage();
    const event = await reader.request.post(
      "http://127.0.0.1:8788/banner-event",
      {
        headers: { origin: "http://127.0.0.1:5173" },
        data: {
          bid,
          event_id: crypto.randomUUID(),
          event_type: "impressao",
          consented: true,
        },
      },
    );
    expect(event.ok()).toBe(true);
    expect(await event.json()).toHaveProperty("registrado", true);
    await reader.goto(href!);
    await expect(
      reader.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(reader.locator(".commercial-stats strong").first()).toHaveText(
      "1",
    );
    await card
      .getByRole("button", { name: "Revogar link", exact: true })
      .click();
    await reader.reload();
    await expect(
      reader.getByText(/Link inválido, revogado ou expirado/),
    ).toBeVisible();
    await ctx.close();
  } finally {
    if (bid)
      sql(
        `delete from private.banner_events where banner_id='${bid}';delete from private.commercial_report_links where banner_id='${bid}';delete from public.banner_metricas_diarias where banner_id='${bid}';delete from public.banners where id='${bid}';`,
      );
    if (cid) sql(`delete from public.contratos where id='${cid}';`);
    sql(`update public.profiles set ativo=false where id='${uid}';`);
  }
});

test.beforeEach(() => resetLocalLoginBudget());
