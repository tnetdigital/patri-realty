import { chromium, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const articles = JSON.parse(
  readFileSync("src/data/editorial-drafts.json", "utf8"),
);
const base = process.env.EDITORIAL_PREVIEW_URL || "http://127.0.0.1:5199";
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.on("pageerror", (error) => errors.push(error.message));
console.log("Abrindo edição");
await page.goto(`${base}/previa-editorial`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: /Morar bem/ }).waitFor();
const refuse = page.getByRole("button", { name: "Recusar opcionais" });
if (await refuse.isVisible()) await refuse.click();
await expect(page.locator(".ed-card")).toHaveCount(12);
await page.locator("#ed-category").selectOption("Hotéis");
await expect(page.locator(".ed-card")).toHaveCount(3);
console.log("Filtro conferido");
await page.getByLabel("Buscar nesta edição").fill("nenhumresultadoxyz");
await expect(
  page.getByRole("heading", { name: "Nenhum artigo encontrado" }),
).toBeVisible();
await page.getByRole("button", { name: "Limpar filtros" }).click();
await expect(page.locator(".ed-card")).toHaveCount(12);
const downloadPromise = page.waitForEvent("download");
await page
  .getByRole("button", { name: "Baixar os 12 textos e metadados" })
  .click();
const download = await downloadPromise;
const file = await download.path();
expect(JSON.parse(readFileSync(file, "utf8")).articles).toHaveLength(12);
for (const article of articles) {
  await page.goto(`${base}/previa-editorial/${article.slug}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { level: 1, name: article.title }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,nofollow",
  );
  const image = page.locator(".ed-cover img");
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element) => element.complete && element.naturalWidth > 0),
    )
    .toBeTruthy();
  await page.locator(".ed-faq summary").first().click();
  await expect(page.locator(".ed-faq").first().locator("p")).toBeVisible();
  expect(await page.locator(".ed-sources a").count()).toBe(
    article.sources.length,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  console.log(`Leitura móvel, foto, FAQ, fontes e noindex: ${article.slug}`);
}
await page.goto(`${base}/previa-editorial/artigo-inexistente`);
await expect(
  page.getByRole("heading", { name: "Artigo não encontrado" }),
).toBeVisible();
await page.getByRole("link", { name: "Voltar aos 12 artigos" }).click();
await expect(page.locator(".ed-card")).toHaveCount(12);
for (const width of [320, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
}
await page.screenshot({
  path: "/tmp/patri-editorial-desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 375, height: 812 });
await page.screenshot({ path: "/tmp/patri-editorial-mobile.png" });
expect(errors).toEqual([]);
await browser.close();
console.log(
  "12 artigos, filtros, download, ausência, fotos e responsividade aprovados.",
);
