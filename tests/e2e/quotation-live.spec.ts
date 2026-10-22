import { resetLocalLoginBudget } from "./local-login-budget";
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { loadEnv } from "vite";
import { randomUUID } from "node:crypto";
test.skip(
  process.env.PATRI_LIVE_TESTS !== "1",
  "Requer stack local e gateway de orçamentos.",
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
function cnpj() {
  let d = String(Date.now() + 177).slice(-12);
  for (let len = 12; len < 14; len++) {
    let w = len - 7,
      sum = 0;
    for (const c of d) {
      sum += Number(c) * w;
      w = w === 2 ? 9 : w - 1;
    }
    d += sum % 11 < 2 ? "0" : String(11 - (sum % 11));
  }
  return d;
}
test("orçamento público chega por e-mail e painel, nota e resposta persistem", async ({
  page,
}) => {
  test.setTimeout(45000);
  const env = loadEnv("development", process.cwd(), ""),
    email = "quote-" + Date.now() + "@example.com",
    slug = "quote-" + Date.now(),
    recipient = "sindico-" + Date.now() + "@example.com";
  const auth = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: "TestePatri2026!",
      data: {
        nome: "Fornecedor Orçamentos",
        tipo: "fornecedor",
        empresa: "Empresa Orçamentos",
        cnpj: cnpj(),
        telefone: "11999998888",
        termos: true,
        termos_versao: "2026-10-19",
        privacidade_versao: "2026-10-19",
      },
    }),
  });
  expect(auth.ok).toBe(true);
  const uid = (await auth.json()).id;
  sql(
    `update auth.users set email_confirmed_at=now() where id='${uid}';update public.fornecedores set status='publicado',slug='${slug}',descricao_curta='Empresa para integração de orçamentos.' where dono_id='${uid}';insert into public.fornecedor_segmentos(fornecedor_id,segmento_id) select f.id,s.id from public.fornecedores f cross join lateral(select id from public.segmentos where ativo limit 1)s where f.dono_id='${uid}';`,
  );
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/fornecedor/" + slug);
    await page.getByRole("button", { name: "Recusar opcionais" }).click();
    await page
      .getByRole("button", { name: "Enviar pedido de orçamento", exact: true })
      .click();
    await expect(
      page.getByText("Informe pelo menos 3 caracteres."),
    ).toBeVisible();
    await page
      .getByLabel("Seu nome", { exact: true })
      .fill("Síndico Integração");
    await page.getByLabel("Seu e-mail", { exact: true }).fill(recipient);
    await page
      .getByLabel("WhatsApp com DDD", { exact: true })
      .fill("11988887777");
    await page
      .getByLabel("Nome do condomínio", { exact: true })
      .fill("Condomínio Integração");
    await page
      .getByLabel("Cidade do condomínio", { exact: true })
      .fill("São Paulo");
    await page
      .getByRole("combobox", { name: "Estado do condomínio", exact: true })
      .selectOption("SP");
    await page.getByLabel("Quantidade de unidades", { exact: true }).fill("36");
    await page
      .getByLabel("Descreva sua necessidade", { exact: true })
      .fill("Precisamos de uma proposta para o condomínio de integração.");
    await page
      .getByRole("checkbox", { name: /Autorizo o compartilhamento/ })
      .check();
    await page
      .getByRole("button", { name: "Enviar pedido de orçamento", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Pedido registrado.", exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const m = await (
          await fetch("http://127.0.0.1:54324/api/v1/messages?limit=500")
        ).json();
        return m.messages.some(
          (x: { Subject: string; To: { Address: string }[] }) =>
            x.Subject === "Novo pedido de orçamento" &&
            x.To.some((t) => t.Address === email),
        );
      })
      .toBe(true);
    await expect
      .poll(async () => {
        const m = await (
          await fetch("http://127.0.0.1:54324/api/v1/messages?limit=500")
        ).json();
        return m.messages.some(
          (x: { Subject: string; To: { Address: string }[] }) =>
            x.Subject === "Recebemos seu pedido de orçamento" &&
            x.To.some((t) => t.Address === recipient),
        );
      })
      .toBe(true);
    await page.goto("/entrar");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("TestePatri2026!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/painel/);
    await page.goto("/painel/orcamentos");
    await page.getByRole("button", { name: /Condomínio Integração/ }).click();
    await expect(page.getByText(recipient, { exact: false })).toBeVisible();
    sql(
      `update public.leads set criado_em=now()-interval '49 hours' where fornecedor_id=(select id from public.fornecedores where dono_id='${uid}');`,
    );
    execFileSync("python3", ["scripts/local-emails.py"]);
    await expect
      .poll(async () => {
        const m = await (
          await fetch("http://127.0.0.1:54324/api/v1/messages?limit=500")
        ).json();
        return m.messages.some(
          (x: { Subject: string; To: { Address: string }[] }) =>
            x.Subject === "Pedido sem resposta há 48 horas" &&
            x.To.some((t) => t.Address === email),
        );
      })
      .toBe(true);
    await page.reload();
    await page.getByRole("button", { name: /Condomínio Integração/ }).click();
    await expect(
      page
        .getByRole("article")
        .getByText("Sem resposta há 48 horas", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Nova nota", { exact: true })
      .fill("Visita técnica combinada para amanhã.");
    await page
      .getByRole("button", { name: "Salvar nota", exact: true })
      .click();
    await expect(
      page.getByText("Visita técnica combinada para amanhã.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Marcar como respondido", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Marcar como respondido", exact: true }),
    ).toBeDisabled();
    await page.reload();
    await page.getByRole("button", { name: /Condomínio Integração/ }).click();
    await expect(
      page.getByText("Visita técnica combinada para amanhã.", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    sql(
      `delete from public.lead_notas n using public.leads l,public.fornecedores f where n.lead_id=l.id and l.fornecedor_id=f.id and f.dono_id='${uid}';delete from public.email_outbox where fornecedor_id=(select id from public.fornecedores where dono_id='${uid}');with removed as (delete from public.leads where fornecedor_id=(select id from public.fornecedores where dono_id='${uid}') returning pedido_id) delete from private.quotation_requests where id in(select pedido_id from removed);update public.fornecedores set status='rascunho' where dono_id='${uid}';`,
    );
  }
});

test.beforeEach(() => resetLocalLoginBudget());
