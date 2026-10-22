import { resetLocalLoginBudget } from "./local-login-budget";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
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
test("editor real agenda e publica; newsletter entrega link real no Mailpit e confirma duplo aceite", async ({
  page,
  browser,
}) => {
  const env = loadEnv("development", process.cwd(), ""),
    tag = Date.now(),
    email = "editor-content-" + tag + "@example.com",
    reader = "newsletter-content-" + tag + "@example.com",
    title = "Conteúdo integrado " + tag;
  const signup = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: "TestePatri2026!",
      data: {
        nome: "Editor Integração",
        tipo: "sindico",
        cidade: "São Paulo",
        estado: "SP",
        termos: true,
        termos_versao: "2026-10-19",
        privacidade_versao: "2026-10-19",
      },
    }),
  });
  expect(signup.ok).toBe(true);
  const uid = (await signup.json()).id as string;
  sql(
    `update auth.users set email_confirmed_at=now() where id='${uid}';insert into public.user_roles(user_id,role) values('${uid}','editor');`,
  );
  // Reset only the synthetic local gateway IP used by this repeatable integration fixture.
  const localSecret = readFileSync("infra/local/compose.yml", "utf8").match(
    /PGRST_JWT_SECRET: ['"]?([^\s'"]+)/,
  )![1];
  const salt = createHmac("sha256", localSecret)
    .update("newsletter-local-only")
    .digest("hex");
  const fixtureHash = createHmac("sha256", salt)
    .update("newsletter-local-integration")
    .digest("hex");
  sql(`delete from private.newsletter_attempts where ip_hash='${fixtureHash}'`);
  let articleId = "";
  try {
    page.on("dialog", (d) => d.accept());
    await page.goto("/entrar");
    await page.getByRole("button", { name: "Recusar opcionais" }).click();
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/area|conteudo/);
    await page.goto("/admin/conteudo");
    await page
      .getByRole("button", { name: "Nova matéria", exact: true })
      .click();
    await page.getByLabel("Título", { exact: true }).fill(title);
    await page
      .getByRole("combobox", { name: "Categoria", exact: true })
      .selectOption({ label: "Gestão condominial" });
    await page
      .getByLabel("Texto do bloco 1", { exact: true })
      .fill(
        "Conteúdo de integração com mais de dez palavras para verificar publicação agendada, leitura pública e autorização editorial.",
      );
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Rascunho salvo");
    articleId = sql(
      `select id from public.materias where autor_id='${uid}' limit 1`,
    );
    await page
      .getByLabel("Enviar imagem: Imagem de capa", { exact: true })
      .setInputFiles("public/images/architecture-detail.jpg");
    await expect(
      page.getByAltText("Prévia da imagem escolhida", { exact: true }),
    ).toHaveAttribute("src", /storage\/v1\/object\/public\/materias\//);
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Rascunho salvo");
    const future = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
    await page
      .getByLabel("Data e hora de publicação", { exact: true })
      .fill(future);
    await page
      .getByRole("button", { name: "Agendar publicação", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Publicação agendada");
    const slug = sql(
      `select slug from public.materias where id='${articleId}'`,
    );
    const read = async () => {
      const r = await fetch(
        "http://127.0.0.1:54321/rest/v1/rpc/conteudo_publico",
        {
          method: "POST",
          headers: {
            apikey: env.VITE_SUPABASE_ANON_KEY,
            Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ kind: "materia", slug_value: slug }),
        },
      );
      expect(r.ok).toBe(true);
      return r.json();
    };
    expect((await read()).item).toBeNull();
    sql(
      `update public.materias set agendada_em=now()-interval '1 second' where id='${articleId}';set request.jwt.claims='{"role":"service_role"}';select public.publicar_agendadas();`,
    );
    expect((await read()).item.titulo).toBe(title);
    const context = await browser.newContext();
    try {
      const publicPage = await context.newPage();
      await publicPage.goto("http://127.0.0.1:5173/materia/" + slug);
      await publicPage
        .getByRole("button", { name: "Recusar opcionais" })
        .click();
      await expect(
        publicPage.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      await publicPage
        .getByLabel("Seu nome", { exact: true })
        .fill("Leitor Integração");
      await publicPage.getByLabel("Seu e-mail", { exact: true }).fill(reader);
      await publicPage
        .getByRole("checkbox", { name: /Quero receber as novidades/ })
        .check();
      await publicPage
        .getByRole("button", { name: "Solicitar inscrição", exact: true })
        .click();
      await expect(publicPage.getByRole("status")).toContainText(
        "enviaremos um link",
      );
      expect(
        sql(
          `select confirmado::text from public.newsletter_inscritos where email='${reader}'`,
        ),
      ).toBe("false");
      execFileSync("python3", ["scripts/local-emails.py"]);
      async function emailLink(subject: string) {
        let messageId = "";
        await expect
          .poll(
            async () => {
              const messages = await (
                await fetch("http://127.0.0.1:54324/api/v1/messages?limit=500")
              ).json();
              messageId =
                messages.messages.find(
                  (message: {
                    ID: string;
                    Subject: string;
                    To: { Address: string }[];
                  }) =>
                    message.Subject === subject &&
                    message.To.some((target) => target.Address === reader),
                )?.ID || "";
              return messageId;
            },
            { timeout: 15000 },
          )
          .not.toBe("");
        const full = await (
          await fetch("http://127.0.0.1:54324/api/v1/message/" + messageId)
        ).json();
        const url = String(full.Text).match(
          /http:\/\/127\.0\.0\.1:5173\/newsletter\/(confirmar|descadastrar)\/[a-f0-9]{64}/,
        )?.[0];
        expect(url).toBeTruthy();
        return url!;
      }
      const confirm = await emailLink("Confirme sua inscrição na Patri Realty");
      await publicPage.goto(confirm);
      expect(
        sql(
          `select confirmado::text from public.newsletter_inscritos where email='${reader}'`,
        ),
      ).toBe("false");
      await publicPage
        .getByRole("button", { name: "Confirmar inscrição", exact: true })
        .click();
      await expect(publicPage.getByRole("status")).toContainText(
        "duplo aceite foi registrado",
      );
      expect(
        sql(
          `select confirmado::text from public.newsletter_inscritos where email='${reader}'`,
        ),
      ).toBe("true");
      execFileSync("python3", ["scripts/local-emails.py"]);
      await publicPage.goto(
        await emailLink("Inscrição confirmada na Patri Realty"),
      );
      await expect(publicPage.getByRole("status")).toContainText(
        "Inscrição cancelada",
      );
      expect(
        sql(
          `select confirmado::text from public.newsletter_inscritos where email='${reader}'`,
        ),
      ).toBe("false");
    } finally {
      await context.close();
    }
  } finally {
    if (articleId)
      sql(
        `update public.materias set status='arquivada' where id='${articleId}'`,
      );
  }
});

test.beforeEach(() => resetLocalLoginBudget());
