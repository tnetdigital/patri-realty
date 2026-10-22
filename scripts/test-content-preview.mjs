import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
async function test(name, run) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const goto = page.goto.bind(page);
  page.goto = (path, options) =>
    goto(
      "https://patri-realty-previa-05je1j.v2.appdeploy.ai/#" + path,
      options,
    );
  try {
    await run({ page });
    if (errors.length) throw Error(errors.join("\n"));
    console.log(name + ": aprovado na prévia pública.");
  } finally {
    await page.close();
  }
}

const body =
  "Este conteúdo fictício demonstra o planejamento das atividades, a organização dos documentos e o acompanhamento dos responsáveis no condomínio.";
await test("fornecedor envia uma matéria, editor revisa e publica e newsletter exige segundo aceite", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on("dialog", (d) => d.accept());
  await page.goto("/demonstracao-materias");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", {
      name: "Reiniciar demonstração editorial",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Nova matéria", exact: true }).click();
  await page
    .getByLabel("Título", { exact: true })
    .fill("Conexões editoriais de demonstração");
  await page
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("category-demo-1");
  await page.getByLabel("Texto do bloco 1", { exact: true }).fill(body);
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Rascunho salvo");
  await page
    .getByRole("button", { name: "Enviar para revisão", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saldo foi reservado");
  await page.reload();
  await page
    .getByRole("button", { name: /Conexões editoriais de demonstração/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Salvar rascunho", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Nova matéria", exact: true }).click();
  await page
    .getByLabel("Título", { exact: true })
    .fill("Envio acima do saldo mensal");
  await page
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("category-demo-1");
  await page.getByLabel("Texto do bloco 1", { exact: true }).fill(body);
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enviar para revisão", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Saldo de matérias insuficiente",
  );
  await page.goto("/demonstracao-conteudo");
  await page
    .getByRole("button", { name: /Conexões editoriais de demonstração/ })
    .click();
  await page
    .getByLabel("Comentário da revisão", { exact: true })
    .fill("Acrescente detalhes sobre a organização e os responsáveis.");
  await page.getByRole("button", { name: "Pedir ajuste", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Ajuste solicitado");
  await page.goto("/demonstracao-materias");
  await page
    .getByRole("button", { name: /Conexões editoriais de demonstração/ })
    .click();
  await expect(
    page.getByText(/Acrescente detalhes sobre a organização/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enviar para revisão", exact: true })
    .click();
  await page.goto("/demonstracao-conteudo");
  await page
    .getByRole("button", { name: /Conexões editoriais de demonstração/ })
    .click();
  await page
    .getByRole("button", { name: "Publicar agora", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Matéria publicada");
  await page
    .getByRole("link", { name: "Ver matéria publicada", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Conexões editoriais de demonstração",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Conteúdo de marca", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Conhecer o fornecedor", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Seu nome", { exact: true }).fill("Leitor Exemplo");
  await page
    .getByLabel("Seu e-mail", { exact: true })
    .fill("leitor.editorial@example.com");
  await page
    .getByRole("checkbox", { name: /Quero receber as novidades/ })
    .check();
  await page
    .getByRole("button", { name: "Solicitar inscrição", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Abrir confirmação simulada", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirmar inscrição", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar inscrição", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "duplo aceite foi registrado",
  );
  await page
    .getByRole("link", { name: "Cancelar inscrição simulada", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Inscrição cancelada");
});
await test("redação agenda publicação e organiza pautas e revistas", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/demonstracao-conteudo");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await page
    .getByRole("button", {
      name: "Reiniciar demonstração editorial",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Nova matéria", exact: true }).click();
  await page
    .getByLabel("Título", { exact: true })
    .fill("Matéria agendada de demonstração");
  await page
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("category-demo-1");
  await page.getByLabel("Texto do bloco 1", { exact: true }).fill(body);
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  const future = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
  await page
    .getByLabel("Data e hora de publicação", { exact: true })
    .fill(future);
  await page
    .getByRole("button", { name: "Agendar publicação", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Publicação agendada");
  await page.goto("/demonstracao-editorial");
  await expect(
    page.getByRole("link", {
      name: "Matéria agendada de demonstração",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.goto("/demonstracao-conteudo");
  await page.getByRole("button", { name: "Pautas", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Pauta de manutenção");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("escrevendo");
  await page.getByRole("button", { name: "Salvar pauta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Registro editorial salvo",
  );
  await expect(page.locator(".content-board")).toContainText(
    "Pauta de manutenção",
  );
  await page.getByRole("button", { name: "Revistas", exact: true }).click();
  await page
    .getByLabel("Título", { exact: true })
    .fill("Revista de demonstração");
  await page.getByLabel("Edição", { exact: true }).fill("01");
  await page.getByLabel("Slug", { exact: true }).fill("revista-demo");
  await page
    .getByLabel("URL da capa", { exact: true })
    .fill("https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800");
  await page
    .getByLabel("Link da edição digital", { exact: true })
    .fill("https://example.com/revista-demo");
  await page
    .getByLabel("Data de publicação", { exact: true })
    .fill("2026-10-19T09:00");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("publicada");
  await page
    .getByRole("button", { name: "Salvar revista", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Registro editorial salvo",
  );
  await page.goto("/demonstracao-editorial/revista");
  await page
    .getByRole("link", { name: "Revista de demonstração", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Ler edição digital", exact: true }),
  ).toHaveAttribute("href", "https://example.com/revista-demo");
});

await browser.close();
