import { resetLocalLoginBudget } from "./local-login-budget";
import { test, expect, type Page } from "@playwright/test";
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
const tag = Date.now();
function cnpj() {
  let v = String(tag).slice(-12);
  for (let n = 12; n <= 13; n++) {
    let w = n - 7;
    const sum = [...v].reduce((a, d) => {
      const next = a + Number(d) * w;
      w = w === 2 ? 9 : w - 1;
      return next;
    }, 0);
    v += sum % 11 < 2 ? 0 : 11 - (sum % 11);
  }
  return v;
}
async function login(page: Page, email: string) {
  await page.goto("/entrar");
  const cookies = page.getByRole("button", { name: "Recusar opcionais" });
  if (await cookies.isVisible()) await cookies.click();
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
  await expect(
    page.getByRole("link", { name: "Minha área", exact: true }),
  ).toBeVisible();
}
test("avaliação real aprovada, resposta Premium, clique WhatsApp agregado e marketing privado", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const env = loadEnv("development", process.cwd(), ""),
    users: { id: string; email: string }[] = [];
  for (const role of ["owner", "reader", "admin"]) {
    const email = `growth-${role}-${tag}@example.com`,
      res = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
        method: "POST",
        headers: {
          apikey: env.VITE_SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: "TestePatri2026!",
          data: {
            nome: "Pessoa Integração",
            tipo: role === "owner" ? "fornecedor" : "sindico",
            empresa: "Empresa Crescimento",
            cnpj: role === "owner" ? cnpj() : "",
            telefone: "11988887777",
            cidade: "São Paulo",
            estado: "SP",
            termos: true,
            termos_versao: "2026-10-19",
            privacidade_versao: "2026-10-19",
          },
        }),
      });
    expect(res.ok).toBe(true);
    users.push({ id: (await res.json()).id, email });
  }
  const [owner, reader, admin] = users,
    sid = sql(`select id from public.fornecedores where dono_id='${owner.id}'`),
    slug = "growth-" + tag;
  sql(
    `update auth.users set email_confirmed_at=now() where id in ('${owner.id}','${reader.id}','${admin.id}');insert into public.user_roles(user_id,role) values('${admin.id}','admin');update public.fornecedores set status='publicado',slug='${slug}',whatsapp='11988887777',descricao_curta='Empresa para integração local' where id='${sid}';insert into public.assinaturas(fornecedor_id,plano,status,periodo_ate) values('${sid}','premium','ativa',now()+interval '30 days') on conflict(fornecedor_id) do update set plano='premium',status='ativa',periodo_ate=excluded.periodo_ate;`,
  );
  const title = "Atendimento integrado " + tag,
    adminContext = await browser.newContext(),
    adminPage = await adminContext.newPage();
  try {
    await login(page, reader.email);
    await page.goto("/fornecedor/" + slug);
    await page.getByLabel("Título", { exact: true }).fill(title);
    await page
      .getByLabel("Sua experiência", { exact: true })
      .fill(
        "A experiência de integração demonstrou um atendimento claro e organizado para o condomínio.",
      );
    await page
      .getByRole("button", { name: "Enviar avaliação", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "enviada para moderação" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toHaveCount(0);
    await login(adminPage, admin.email);
    await adminPage.goto("/admin/avaliacoes");
    const card = adminPage.locator(".growth-card").filter({
      has: adminPage.getByRole("heading", { name: title, exact: true }),
    });
    await card.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(
      adminPage.getByRole("status").filter({ hasText: "Avaliação publicada" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Preferências de privacidade" })
      .click();
    await page.getByRole("button", { name: "Permitir análises" }).click();
    await page
      .context()
      .route("https://wa.me/**", (r) =>
        r.fulfill({ body: "Anunciante de integração" }),
      );
    await page
      .getByRole("link", { name: "Conversar no WhatsApp", exact: true })
      .click();
    await expect
      .poll(() =>
        Number(
          sql(
            `select count(*) from public.eventos where fornecedor_id='${sid}' and tipo='clique_whatsapp'`,
          ),
        ),
      )
      .toBe(1);
    sql(
      `set request.jwt.claims='{"role":"service_role"}';select public.agregar_metricas();`,
    );
    await login(page, owner.email);
    await page.goto("/painel/metricas");
    await expect(
      page
        .locator(".growth-metric")
        .filter({ has: page.getByText("Cliques no WhatsApp", { exact: true }) })
        .locator("strong"),
    ).toHaveText("1");
    await page.goto("/painel/avaliacoes");
    await page
      .getByLabel("Resposta ou motivo da denúncia")
      .fill("Agradecemos a avaliação e seguimos à disposição do condomínio.");
    await page
      .getByRole("button", { name: "Publicar resposta", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Resposta publicada" }),
    ).toBeVisible();
    await page.goto("/painel/cresca");
    const form = page.locator("form").filter({
      has: page.getByRole("heading", {
        name: "Perfil otimizado",
        exact: true,
      }),
    });
    await form.getByLabel("WhatsApp para retorno").fill("11988887777");
    await form
      .getByLabel("O que você busca?")
      .fill("Solicitação integrada de melhoria do perfil.");
    await form
      .getByRole("button", { name: "Quero saber mais", exact: true })
      .click();
    await expect(form.getByRole("status")).toContainText(
      "Interesse registrado",
    );
    await adminPage.goto("/admin/marketing");
    const interest = adminPage.locator(".growth-card").filter({
      has: adminPage.getByText("Solicitação integrada de melhoria do perfil.", {
        exact: true,
      }),
    });
    await expect(interest).toBeVisible();
    await interest
      .getByLabel("Status", { exact: true })
      .selectOption("em_contato");
    await interest
      .getByLabel("Notas internas")
      .fill("Nota restrita do atendimento comercial.");
    await interest
      .getByRole("button", { name: "Salvar acompanhamento" })
      .click();
    await expect(interest.getByRole("status")).toContainText(
      "Acompanhamento atualizado",
    );
    await page.reload();
    await expect(
      page.getByText("Nota restrita do atendimento comercial.", {
        exact: true,
      }),
    ).toHaveCount(0);
  } finally {
    await adminContext.close();
    sql(
      `delete from public.eventos where fornecedor_id='${sid}';delete from public.metricas_diarias where fornecedor_id='${sid}';delete from public.interesses_marketing where fornecedor_id='${sid}';delete from public.avaliacoes where fornecedor_id='${sid}';update public.profiles set ativo=false where id in ('${owner.id}','${reader.id}','${admin.id}');`,
    );
  }
});

test.beforeEach(() => resetLocalLoginBudget());
