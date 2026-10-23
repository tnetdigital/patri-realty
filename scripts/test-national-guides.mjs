import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createLocalHarness } from './test-local-eligibility.mjs';
const h = await createLocalHarness();
let browser;
const checks = [];
try {
  h.state.sitemapSegments = [
    'teste',
    'administracao-condominial',
    'portaria-remota',
    'elevadores',
  ];
  for (const slug of [
    'administracao-condominial',
    'portaria-remota',
    'elevadores',
  ]) {
    const res = await fetch(h.base + '/guia/' + slug);
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.ok(html.includes('content="noindex,follow"'));
    assert.ok(html.includes('Guia em preparação'));
    assert.ok(!html.includes('application/ld+json'));
    assert.ok(
      html.includes('destaque pago não representa avaliação editorial'),
    );
    checks.push({
      slug,
      status: 200,
      noindex: true,
      draftTextPublished: false,
    });
  }
  const sitemap = await (await fetch(h.base + '/sitemap.xml')).text();
  for (const slug of [
    'administracao-condominial',
    'portaria-remota',
    'elevadores',
  ])
    assert.ok(!sitemap.includes('/guia/' + slug + '</loc>'));
  checks.push({ sitemap: 'piloto ausente' });
  h.state.publicCount = 0;
  const empty = await (await fetch(h.base + '/guia/teste?ordem=nome')).text();
  assert.ok(empty.includes('Ainda não encontramos esse parceiro.'));
  assert.ok(!empty.includes('Empresa sintética'));
  checks.push({ empty: 'sem empresas de preenchimento' });
  h.state.publicCount = 3;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [320, 375, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(h.base + '/guia/teste');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page
      .getByRole('button', { name: 'Recusar opcionais' })
      .click({ timeout: 1000 })
      .catch(() => {});
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      'sem rolagem horizontal: ' + width,
    );
    assert.ok(
      await page
        .getByText('destaque pago não representa avaliação editorial', {
          exact: false,
        })
        .isVisible(),
    );
    checks.push({
      width,
      horizontalOverflow: false,
      paidDisclosureVisible: true,
    });
  }
  const order = page.locator('.directory-results select');
  await order.selectOption('nome');
  await page.waitForURL('**/guia/teste?ordem=nome');
  await page.waitForFunction(
    () =>
      document.querySelector('meta[name="robots"]')?.content ===
      'noindex,follow',
  );
  checks.push({ sorting: 'nome', noindex: true });
  const stateInput = page.getByRole('combobox').first();
  await stateInput.fill('São');
  await stateInput.press('ArrowDown');
  await stateInput.press('Enter');
  assert.ok((await stateInput.inputValue()).includes('São Paulo'));
  checks.push({ keyboard: 'UF selecionada por teclado' });
  assert.deepEqual(errors, []);
  await mkdir('docs/seo/evidencias-prompt07', { recursive: true });
  await writeFile(
    'docs/seo/evidencias-prompt07/qa.json',
    JSON.stringify(
      {
        aviso: 'Transporte e empresas sintéticos; não prova oferta real.',
        checks,
      },
      null,
      2,
    ),
  );
  console.log(checks.length + ' cenários de guias nacionais aprovados.');
} finally {
  await browser?.close();
  await h.close();
}
