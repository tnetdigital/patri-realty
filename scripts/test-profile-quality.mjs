import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createLocalHarness } from './test-local-eligibility.mjs';
const h = await createLocalHarness();
const checks = [];
let browser;
try {
  h.fixture.suppliers[1].descricao_curta = '';
  let response = await fetch(h.base + '/fornecedor/synthetic-1');
  assert.equal(response.status, 404);
  assert.ok(!(await response.text()).includes('application/ld+json'));
  checks.push({ profile: 'incompleto', status: 404 });
  h.state.publicCount = 2;
  response = await fetch(h.base + '/fornecedor/synthetic-2');
  assert.equal(response.status, 404);
  checks.push({ profile: 'ausente da projeção pública', status: 404 });
  h.state.publicCount = 3;
  const html = await (await fetch(h.base + '/fornecedor/synthetic-0')).text();
  assert.ok(html.includes('Área atendida informada pela empresa'));
  assert.ok(html.includes('não comprova atendimento em cada município'));
  assert.ok(html.includes('Informações disponíveis'));
  assert.ok(html.includes('BreadcrumbList'));
  checks.push({
    profile: 'público',
    breadcrumbs: true,
    coverageQualified: true,
  });
  h.state.publicCount = 0;
  assert.equal((await fetch(h.base + '/fornecedor/synthetic-0')).status, 404);
  checks.push({ profile: 'retirado após acesso público', status: 404 });
  h.state.publicCount = 3;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [320, 375, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(h.base + '/fornecedor/synthetic-0');
    if (width === 320) {
      await page.locator('.cookies').waitFor();
      assert.equal(await page.locator('.profile-mobile-action').count(), 0);
      await page.getByRole('button', { name: 'Recusar opcionais' }).click();
      await page.locator('.profile-mobile-action').waitFor();
      await page.locator('.mobile-menu').click();
      await page.waitForFunction(
        () => !document.querySelector('.profile-mobile-action'),
      );
      await page.locator('.mobile-menu').click();
      checks.push({ consentAndMenu: 'ação cede espaço sem sobreposição' });
    }
    const action = page.locator('.profile-mobile-action button');
    await action.waitFor();
    const box = await action.boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= 901);
    assert.ok(
      await action.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
    );
    await action.click();
    await page.waitForFunction(() =>
      document
        .getElementById('pedir-orcamento')
        ?.contains(document.activeElement),
    );
    assert.equal(await page.locator('.profile-mobile-action').count(), 0);
    assert.ok(
      (await page.locator('#pedir-orcamento').innerText()).includes(
        'Empresa sintética 0',
      ),
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    checks.push({
      width,
      visibleAndClickable: true,
      correctSupplier: true,
      yieldsOnEditing: true,
      overflow: false,
    });
  }
  assert.deepEqual(errors, []);
  await mkdir('docs/seo/evidencias-prompt08', { recursive: true });
  await writeFile(
    'docs/seo/evidencias-prompt08/qa.json',
    JSON.stringify({ synthetic: true, realSubmission: false, checks }, null, 2),
  );
  console.log(checks.length + ' cenários de perfil/mobile aprovados.');
} finally {
  await browser?.close();
  await h.close();
}
