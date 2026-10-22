import { test, expect } from "@playwright/test";
for (const width of [320, 390, 768, 1280])
  test(`layout e navegação com largura ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/guia", "/cadastrar", "/demonstracao"]) {
      await page.goto(path);
      const cookies = page.getByRole("button", { name: "Recusar opcionais" });
      if (await cookies.isVisible()) await cookies.click();
      if (path === "/demonstracao")
        await expect(
          page.getByRole("button", {
            name: "Pedidos de orçamento",
            exact: true,
          }),
        ).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      expect(
        await page.evaluate(() =>
          /[\p{Extended_Pictographic}\u2190\u2192\u2197]/u.test(
            document.body.innerText.replace(/[©®™]/g, ""),
          ),
        ),
      ).toBe(false);
      if (width < 700) {
        const controls = page.locator(
          "input:not([type=checkbox]):not([type=hidden]):visible, select:visible, textarea:visible",
        );
        for (const c of await controls.all())
          expect(
            await c.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
          ).toBeGreaterThanOrEqual(16);
      }
    }
    await page.goto("/guia");
    if (width < 1024) {
      const menu = page.getByRole("button", { name: "Abrir navegação" });
      await menu.click();
      await expect(
        page
          .getByRole("navigation", { name: "Principal" })
          .getByRole("link", { name: "Entrar", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toHaveAttribute("aria-expanded", "false");
    }
    await expect(
      page.getByRole("button", { name: /^Encontrar fornecedores/ }),
    ).toHaveCSS("min-height", "48px");
  });
