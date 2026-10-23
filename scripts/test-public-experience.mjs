import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  performanceFixture,
  isolateRequests,
  mediaUrl,
} from "./performance-fixture.mjs";
const h = await performanceFixture();
let browser;
const checks = [];
const errors = [];
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  await isolateRequests(context, h.base);
  await context.addInitScript(() => {
    localStorage.setItem("patri:consent", "essential");
    window.__interactions = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          if (e.interactionId) window.__interactions.push(e.duration);
      }).observe({ type: "event", buffered: true, durationThreshold: 16 });
    } catch {}
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [320, 375, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/guia/teste",
      "/fornecedor/synthetic-0",
      "/materia/desempenho-qa",
    ]) {
      await page.goto(h.base + path, { waitUntil: "networkidle" });
      assert.ok(await page.locator("main h1").isVisible());
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.equal(
        await page.locator("link[rel=canonical]").getAttribute("href"),
        h.base + path,
      );
      if (path.includes("/materia/"))
        assert.equal(
          await page
            .locator('meta[property="og:type"]')
            .getAttribute("content"),
          "article",
        );
      checks.push({
        name: "conteúdo, metadata e ausência de rolagem horizontal",
        width,
        path,
        passed: true,
      });
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(h.base + "/guia/teste", { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .locator(".skip-to-content")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page
      .locator("#main-content")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.locator(".mobile-menu").click();
  await page
    .getByRole("navigation", { name: "Principal", exact: true })
    .getByRole("link", { name: "Guia de fornecedores" })
    .focus();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator(".mobile-menu").getAttribute("aria-expanded"),
    "false",
  );
  assert.equal(
    await page
      .locator(".mobile-menu")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  checks.push({
    name: "atalho ao conteúdo e Escape do menu restauram foco",
    passed: true,
  });
  const state = page.getByRole("combobox", { name: "Estado", exact: true });
  await state.fill("SP");
  await state.press("ArrowDown");
  await state.press("Enter");
  assert.ok((await state.inputValue()).includes("São Paulo"));
  const city = page.getByRole("combobox", { name: "Cidade de atendimento" });
  await city.fill("Cidade");
  await page
    .getByRole("option", { name: "Cidade sintética", exact: true })
    .waitFor();
  await city.press("ArrowDown");
  await city.press("Enter");
  assert.ok((await city.inputValue()).includes("sintética"));
  if (
    (await page.locator(".specialty-trigger").getAttribute("aria-expanded")) !==
    "true"
  )
    await page.locator(".specialty-trigger").click();
  await page
    .getByRole("textbox", { name: "Buscar especialidade" })
    .fill("teste");
  assert.ok(
    (await page.getByRole("checkbox", { name: /Teste|sintético/i }).count()) >=
      1,
  );
  await page.getByRole("button", { name: "Fechar especialidades" }).click();
  checks.push({
    name: "autocomplete por teclado e filtro de especialidade permanecem funcionais",
    passed: true,
  });
  await page.goto(h.base + "/fornecedor/synthetic-0", {
    waitUntil: "networkidle",
  });
  const first = page.locator(".quotation-form [name=nome]");
  await first.fill("Valor sintético preservado");
  await page
    .getByRole("button", { name: "Preferências de privacidade", exact: true })
    .click();
  await page.locator(".cookies").waitFor();
  assert.equal(await first.inputValue(), "Valor sintético preservado");
  assert.equal(await page.locator(".profile-mobile-action").count(), 0);
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  assert.equal(await first.inputValue(), "Valor sintético preservado");
  assert.equal(
    await page
      .getByRole("button", { name: "Preferências de privacidade", exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  checks.push({
    name: "privacidade reabre sem reload ou perda do formulário; ação móvel cede espaço e foco retorna",
    passed: true,
  });
  await page.goto(h.base + "/guia/teste", { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 1280, height: 900 });
  // Browser zoom at 400% gives 1280/4 = 320 CSS pixels (WCAG reflow equivalent).
  await page.setViewportSize({ width: 320, height: 900 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );

  checks.push({
    name: "reflow equivalente a 400%: 320 CSS px a partir de 1280, sem rolagem horizontal",
    passed: true,
  });
  const blockedContext = await browser.newContext({
    viewport: { width: 320, height: 812 },
  });
  await isolateRequests(blockedContext, h.base);
  await blockedContext.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Denied", "SecurityError");
      },
    }),
  );
  const blockedPage = await blockedContext.newPage();
  blockedPage.on("pageerror", (e) => errors.push(e.message));
  await blockedPage.goto(h.base + "/guia/teste", { waitUntil: "networkidle" });
  await blockedPage.locator(".cookies").waitFor();
  await blockedPage.getByRole("button", { name: "Recusar opcionais" }).click();
  assert.ok(await blockedPage.locator("main h1").isVisible());
  await blockedContext.close();
  checks.push({
    name: "armazenamento negado não derruba o conteúdo ou os controles de privacidade",
    passed: true,
  });
  h.state.banners = [
    {
      id: "15000000-0000-4000-8000-000000000001",
      anunciante_nome: "Anunciante sintético",
      imagem_desktop: mediaUrl,
      imagem_mobile: mediaUrl,
    },
  ];
  const html = await (await fetch(h.base + "/guia/teste")).text();
  assert.ok(html.includes("Visitar anunciante Anunciante sintético"));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(h.base + "/guia/teste", { waitUntil: "networkidle" });
  const picture = page.locator(".ad-slot picture");
  assert.ok((await picture.boundingBox()).height > 100);
  assert.equal(
    await page.locator(".ad-slot img").getAttribute("loading"),
    "eager",
  );
  assert.equal(
    await page
      .locator(".ad-slot img")
      .evaluate((el) => getComputedStyle(el).objectFit),
    "contain",
  );
  h.state.banners = [];
  assert.ok(
    !(await (await fetch(h.base + "/guia/teste")).text()).includes(
      "Visitar anunciante Anunciante sintético",
    ),
  );
  checks.push({
    name: "anúncio ativo no HTML, quadro reservado sem corte, eager no topo e retirada respeitada",
    passed: true,
  });
  const response = await fetch(h.base + "/guia/teste", {
    headers: { "Accept-Encoding": "gzip" },
  });
  assert.equal(response.headers.get("content-encoding"), "gzip");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const asset = Array.from(
    html.matchAll(/(?:src|href)="(\/assets\/[^" ]+\.js)"/g),
  )[0]?.[1];
  assert.ok(asset);
  const assetResponse = await fetch(h.base + asset);
  assert.ok(assetResponse.headers.get("cache-control").includes("immutable"));
  checks.push({
    name: "gzip e cache imutável apenas para assets; HTML continua no-store",
    passed: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
    "auto",
  );
  checks.push({ name: "movimento reduzido respeitado", passed: true });
  // Keep server content visible even when the public article chunk is delayed.
  const delayed = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  await isolateRequests(delayed, h.base);
  await delayed.addInitScript(() => {
    localStorage.setItem("patri:consent", "essential");
    window.__lostHeading = false;
    let seen = false;
    new MutationObserver(() => {
      const present = !!document.querySelector("main h1");
      if (seen && !present) window.__lostHeading = true;
      if (present) seen = true;
    }).observe(document, { subtree: true, childList: true });
  });
  const delayedPage = await delayed.newPage();
  await delayedPage.route(
    /\/assets\/ContentPublic-[^/]+\.js/,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.continue();
    },
  );
  await delayedPage.goto(h.base + "/materia/desempenho-qa", {
    waitUntil: "networkidle",
  });
  assert.equal(await delayedPage.evaluate(() => window.__lostHeading), false);
  assert.equal(
    await delayedPage.locator("form").getAttribute("method"),
    "post",
  );
  await delayed.close();
  checks.push({
    name: "chunk público atrasado preserva H1 SSR durante hidratação; formulário sem fallback GET",
    passed: true,
  });
  const interactions = await page.evaluate(() => window.__interactions || []);
  assert.deepEqual(errors, []);
  await mkdir("docs/seo/evidencias-prompt12", { recursive: true });
  await writeFile(
    "docs/seo/evidencias-prompt12/qa.json",
    JSON.stringify(
      {
        synthetic: true,
        fieldINP: null,
        physicalKeyboardTested: false,
        automatedChecks: checks.length,
        interactionsSampleMs: interactions,
        errors,
        checks,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser?.close();
  await h.close();
}
