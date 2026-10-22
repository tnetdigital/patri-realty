import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.PATRI_PREVIEW_URL || "http://127.0.0.1:5178/";
  await page.goto(base + "#/guia");
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  const state = page.getByRole("combobox", { name: "Estado", exact: true }),
    city = page.getByRole("combobox", {
      name: "Cidade de atendimento",
      exact: true,
    });
  assert(await city.isDisabled());
  await state.fill("sp");
  await page
    .getByRole("option", { name: "São Paulo (SP)", exact: true })
    .waitFor();
  await state.press("ArrowDown");
  await state.press("Enter");
  await city.fill("soroc");
  await page.getByRole("option", { name: "Sorocaba", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar especialidade" })
    .fill("avcb");
  await page.getByRole("checkbox", { name: /^AVCB e regularização/ }).check();
  await page
    .getByRole("textbox", { name: "Buscar especialidade" })
    .fill("elevadores");
  await page.getByRole("checkbox", { name: /^Elevadores/ }).check();
  await page
    .getByRole("button", { name: "Concluir seleção", exact: true })
    .click();
  await page.getByRole("button", { name: /^Encontrar fornecedores/ }).click();
  await page.waitForURL(/segmentos=.*elevadores.*cidade=sorocaba/);
  await page.reload();
  await page
    .getByRole("button", { name: "Remover Elevadores", exact: true })
    .waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector("input[role=combobox][aria-autocomplete=list]")
        ?.value === "São Paulo (SP)",
  );
  assert.equal(await city.inputValue(), "Sorocaba");
  await state.fill("ri");
  await page
    .getByRole("option", { name: "Rio de Janeiro (RJ)", exact: true })
    .click();
  assert.equal(await city.inputValue(), "");
  await city.fill("niter");
  await page.getByRole("option", { name: "Niterói", exact: true }).click();
  await page
    .getByRole("button", { name: "Remover Elevadores", exact: true })
    .click();
  await page.getByRole("button", { name: /^Encontrar fornecedores/ }).click();
  await page.waitForURL(
    /guia\/avcb-e-regularizacao-do-corpo-de-bombeiros\/rj\/niteroi/,
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  if (process.env.PATRI_LOCAL_SCREENSHOT)
    await page.screenshot({
      path: "/tmp/patri-smart-mobile.png",
      fullPage: true,
    });
  console.log(
    "Prévia: especialidades, sinônimos, cidades completas, teclado, UF dependente, seleção múltipla e persistência aprovados.",
  );
} finally {
  await browser.close();
}
