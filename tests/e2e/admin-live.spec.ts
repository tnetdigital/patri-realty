import { resetLocalLoginBudget } from "./local-login-budget";
import { test, expect } from "@playwright/test";
import { loadEnv } from "vite";
import { execFileSync } from "node:child_process";
test.skip(
  process.env.PATRI_LIVE_TESTS !== "1",
  "Requer stack local de integração.",
);
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
function document(n: number) {
  let d = String(n).slice(-12).padStart(12, "1");
  for (let len = 12; len < 14; len++) {
    let w = len - 7,
      sum = 0;
    for (const x of d) {
      sum += Number(x) * w;
      w = w === 2 ? 9 : w - 1;
    }
    d += sum % 11 < 2 ? "0" : String(11 - (sum % 11));
  }
  return d;
}
test("admin real aprova, publica, pede ajuste por e-mail e registra auditoria", async ({
  page,
  browser,
}) => {
  const env = loadEnv("development", process.cwd(), ""),
    tag = Date.now(),
    owner = "admin-owner-" + tag + "@example.com",
    email = "admin-operador-" + tag + "@example.com",
    company = "Revisão Integrada " + tag;
  async function signup(address: string, supplier: boolean) {
    const r = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
      method: "POST",
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: address,
        password: "TestePatri2026!",
        data: {
          nome: supplier ? "Dono Integração" : "Admin Integração",
          tipo: supplier ? "fornecedor" : "sindico",
          cidade: "São Paulo",
          estado: "SP",
          empresa: company,
          cnpj: document(tag + 911),
          telefone: "11999998888",
          termos: true,
          termos_versao: "2026-10-19",
          privacidade_versao: "2026-10-19",
        },
      }),
    });
    expect(r.ok).toBe(true);
    return (await r.json()).id as string;
  }
  const oid = await signup(owner, true),
    aid = await signup(email, false);
  sql(
    `update auth.users set email_confirmed_at=now() where id in('${oid}','${aid}');insert into public.user_roles(user_id,role) values('${aid}','admin');update public.fornecedores set email='${owner}',logo_url='https://example.com/logo.webp',whatsapp='11999998888',descricao_curta='Descrição para o fluxo administrativo de integração.',status='em_analise' where dono_id='${oid}';insert into public.fornecedor_segmentos(fornecedor_id,segmento_id) select f.id,s.id from public.fornecedores f cross join public.segmentos s where f.dono_id='${oid}' and s.slug='elevadores';insert into public.cobertura(fornecedor_id,estado_uf) select id,'SP' from public.fornecedores where dono_id='${oid}';`,
  );
  try {
    page.on("dialog", (d) => d.accept());
    await page.goto("/entrar");
    await page.getByRole("button", { name: "Recusar opcionais" }).click();
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/area|admin/);
    await page.goto("/admin/fornecedores?q=" + encodeURIComponent(company));
    await page
      .getByRole("button", { name: "Abrir " + company, exact: true })
      .click();
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
      "registrada na auditoria",
    );
    await expect(page.locator("tbody")).toContainText("publicado");
    const slug = sql(
      `select slug from public.fornecedores where dono_id='${oid}';`,
    );
    const profile = async () =>
      await (
        await fetch("http://127.0.0.1:54321/rest/v1/rpc/fornecedor_publico", {
          method: "POST",
          headers: {
            apikey: env.VITE_SUPABASE_ANON_KEY,
            Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_slug: slug }),
        })
      ).json();
    expect((await profile()).fornecedor.nome_fantasia).toBe(company);
    expect(
      sql(
        `select (teste_fim-teste_inicio=interval '90 days')::text from public.fornecedores where dono_id='${oid}';`,
      ),
    ).toBe("true");
    await page
      .getByLabel("Motivo da decisão", { exact: true })
      .fill("Ajustar a apresentação dos serviços para nova análise.");
    await page
      .getByRole("button", { name: "Pedir ajuste", exact: true })
      .click();
    await expect(page.locator("tbody")).toContainText("ajuste_solicitado");
    expect((await profile()).fornecedor).toBeNull();
    execFileSync("python3", ["scripts/local-emails.py"]);
    await expect
      .poll(async () => {
        const m = await (
          await fetch("http://127.0.0.1:54324/api/v1/messages?limit=500")
        ).json();
        return m.messages.some(
          (x: { Subject: string; To: { Address: string }[] }) =>
            x.Subject === "Ajustes solicitados no perfil" &&
            x.To.some((t) => t.Address === owner),
        );
      })
      .toBe(true);
    await page.goto("/admin/auditoria");
    await page
      .getByRole("textbox", { name: "Buscar na administração", exact: true })
      .fill(company);
    await page
      .getByRole("button", { name: "Aplicar filtros", exact: true })
      .click();
    await expect(page.locator("tbody")).toContainText("UPDATE");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Administração", exact: true }),
    ).toBeVisible();
    await page.goto("/admin/usuarios?q=" + encodeURIComponent(owner));
    await page
      .getByRole("button", { name: "Abrir Dono Integração", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Forçar redefinição de senha", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "registrada na auditoria",
    );
    expect(
      sql(`select senha_pendente::text from public.profiles where id='${oid}'`),
    ).toBe("true");
    const context = await browser.newContext();
    try {
      const ownerPage = await context.newPage();
      await ownerPage.goto("http://127.0.0.1:5173/entrar");
      await ownerPage
        .getByRole("button", { name: "Recusar opcionais" })
        .click();
      await ownerPage.getByLabel("E-mail", { exact: true }).fill(owner);
      await ownerPage
        .getByLabel("Senha", { exact: true })
        .fill("TestePatri2026!");
      await ownerPage
        .getByRole("button", { name: "Entrar", exact: true })
        .click();
      await expect(ownerPage).toHaveURL(/area|redefinir-senha/);
      await ownerPage.goto("http://127.0.0.1:5173/painel");
      await expect(ownerPage).toHaveURL(/redefinir-senha/);
      await ownerPage
        .getByLabel("Senha", { exact: true })
        .fill("NovaPatri2026!");
      await ownerPage
        .getByRole("button", { name: "Salvar nova senha", exact: true })
        .click();
      await expect
        .poll(() =>
          sql(
            `select senha_pendente::text from public.profiles where id='${oid}'`,
          ),
        )
        .toBe("false");
      await ownerPage.goto("http://127.0.0.1:5173/painel");
      await expect(
        ownerPage.getByRole("heading", {
          name: "Sua empresa. Sua próxima conexão.",
          exact: true,
        }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  } finally {
    sql(
      `update public.fornecedores set status='rascunho' where dono_id='${oid}';`,
    );
  }
});

test.beforeEach(() => resetLocalLoginBudget());
