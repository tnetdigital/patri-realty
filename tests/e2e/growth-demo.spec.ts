import { test, expect } from "@playwright/test";
const profile = "/demonstracao-avaliacoes";
const title = "Experiência organizada no condomínio";
const body =
  "A equipe apresentou um atendimento organizado e explicou os serviços com clareza para nosso condomínio.";
test("avaliação móvel passa por moderação, resposta paga, denúncia e remoção", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demonstracao-crescimento");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", { name: "Reiniciar simulação", exact: true })
    .click();
  await page.goto(profile);
  await page.getByLabel("Pessoa na simulação").selectOption("sindico-1");
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Sua experiência", { exact: true }).fill(body);
  await page
    .getByRole("button", { name: "Enviar avaliação", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "enviada para moderação" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toHaveCount(0);
  await page.goto("/demonstracao-moderacao");
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.goto(profile);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.goto("/demonstracao-crescimento/avaliacoes");
  await page
    .getByRole("button", { name: "Simular plano Grátis", exact: true })
    .click();
  await page
    .getByLabel("Resposta ou motivo da denúncia")
    .fill("Agradecemos o relato e permanecemos à disposição do condomínio.");
  await page
    .getByRole("button", { name: "Publicar resposta", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Premium e Destaque" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simular plano Premium", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publicar resposta", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Resposta publicada" }),
  ).toBeVisible();
  await page.goto(profile);
  await expect(
    page.getByText(
      "Agradecemos o relato e permanecemos à disposição do condomínio.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto("/demonstracao-crescimento/avaliacoes");
  await page
    .getByLabel("Resposta ou motivo da denúncia")
    .fill("Solicitamos revisão deste conteúdo pela administração.");
  await page
    .getByRole("button", { name: "Denunciar avaliação", exact: true })
    .click();
  await page.goto("/demonstracao-moderacao");
  await expect(page.getByText(/Denúncia: Solicitamos revisão/)).toBeVisible();
  await page
    .getByLabel("Motivo da moderação")
    .fill("Relato removido após análise da solicitação de revisão.");
  await page
    .getByRole("button", { name: "Remover com motivo", exact: true })
    .click();
  await page.goto(profile);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Pessoa na simulação").selectOption("fornecedor");
  await page
    .getByLabel("Título", { exact: true })
    .fill("Autoavaliação bloqueada");
  await page.getByLabel("Sua experiência", { exact: true }).fill(body);
  await page
    .getByRole("button", { name: "Enviar avaliação", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "possui vínculo" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
test("métricas, privacidade e interesse chegam ao comercial no celular", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/demonstracao-crescimento");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", { name: "Reiniciar simulação", exact: true })
    .click();
  expect(
    (await page.context().cookies()).some((c) => c.name === "patri_analytics"),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Gerar exemplo de resultados", exact: true })
    .click();
  await expect(
    page.getByText("Variação de visitas: -40%", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Falar com um especialista" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simular plano Grátis", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Conhecer planos", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".growth-metric")).toHaveCount(0);
  await page.goto("/demonstracao-crescimento/cresca");
  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: "Perfil otimizado", exact: true }),
  });
  await form.getByLabel("WhatsApp para retorno").fill("11988887777");
  await form
    .getByLabel("O que você busca?")
    .fill("Quero organizar a apresentação da empresa.");
  await form
    .getByRole("button", { name: "Quero saber mais", exact: true })
    .click();
  await expect(form.getByRole("status")).toContainText("Interesse registrado");
  await page.goto("/demonstracao-marketing");
  await expect(
    page.getByText("Quero organizar a apresentação da empresa.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Status", { exact: true }).selectOption("em_contato");
  await page
    .getByLabel("Notas internas")
    .fill("Retorno preparado pela equipe comercial.");
  await page
    .getByRole("button", { name: "Salvar acompanhamento", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Acompanhamento atualizado" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "em_contato",
  );
  await page.goto("/demonstracao-crescimento/cresca");
  await expect(
    page.getByText("Retorno preparado pela equipe comercial.", { exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
test("consentimento cria sessão anônima e conta o clique simulado sem coletar após recusa", async ({
  page,
}) => {
  await page.goto("/demonstracao-avaliacoes");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", { name: "Simular clique no WhatsApp" })
    .click();
  expect(
    (await page.context().cookies()).some((c) => c.name === "patri_analytics"),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Preferências de privacidade" })
    .click();
  await page.getByRole("button", { name: "Permitir análises" }).click();
  await page
    .getByRole("button", { name: "Simular clique no WhatsApp" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(
          localStorage.getItem("patri:growth-demo:v1") || '{"events":[]}',
        )
          .events.filter((e: { tipo: string }) => e.tipo === "clique_whatsapp")
          .reduce(
            (n: number, e: { quantidade: number }) => n + e.quantidade,
            0,
          ),
      ),
    )
    .toBe(1);
  expect(
    (await page.context().cookies()).some((c) => c.name === "patri_analytics"),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Preferências de privacidade" })
    .click();
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", { name: "Simular clique no WhatsApp" })
    .click();
  expect(
    (await page.context().cookies()).some((c) => c.name === "patri_analytics"),
  ).toBe(false);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("patri:growth-demo:v1")!).events.filter(
          (e: { tipo: string }) => e.tipo === "clique_whatsapp",
        ).length,
    ),
  ).toBe(1);
});
test("diagnóstico perde pontos ao remover foto", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/demonstracao");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", { name: "Preencher exemplo fictício" })
    .click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "90",
  );
  await page.getByRole("button", { name: "Conteúdo", exact: true }).click();
  await page
    .getByRole("button", { name: "Remover foto 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "80",
  );
  await page.goto("/demonstracao-crescimento/diagnostico");
  await expect(page.locator(".growth-score")).toHaveText("80 / 100");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
