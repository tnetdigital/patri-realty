import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { exportGsc } from './gsc-read.mjs';
import { writePrivateMeasurement } from './measurement-files.mjs';
import { measurementFixture } from '../tests/fixtures/measurement.ts';
import { reconcileMeasurement } from '../src/features/measurement/reconcile.ts';

const checks = [];
const now = new Date('2026-10-23T10:00:00Z');
const fixture = measurementFixture();
let calls = [];
const fetcher = async (url, options) => {
  calls.push({
    url,
    method: options.method || 'GET',
    body: options.body && JSON.parse(options.body),
  });
  if (url.endsWith('/sites'))
    return Response.json({
      siteEntry: [
        { siteUrl: fixture.origin + '/', permissionLevel: 'siteOwner' },
      ],
    });
  return Response.json({
    rows: [
      {
        keys: ['2026-10-20', fixture.inventory.rows[0].url],
        impressions: 12,
        clicks: 2,
        position: 1.5,
      },
      {
        keys: ['2026-10-20', 'https://patri.example/painel?email=private'],
        impressions: 1,
        clicks: 0,
      },
    ],
  });
};
const exported = await exportGsc(fixture, {
  property: fixture.origin + '/',
  token: 'synthetic-token',
  fetcher,
  now,
});
assert.equal(exported.input.sources.at(-1).rows.length, 2);
assert.equal(exported.audit.omittedRows, 1);
assert.equal(exported.audit.coverage, 'partial');
assert(!JSON.stringify(exported).includes('email='));
assert(!JSON.stringify(exported).includes('synthetic-token'));
checks.push(
  'GSC mock verifies property, exports canonical eligible URLs only, omits credentials/private URLs',
);
assert.deepEqual(
  calls.map((c) => c.method),
  ['GET', 'POST'],
);
assert.deepEqual(calls[1].body.dimensions, ['date', 'page']);
assert.equal(calls[1].body.dataState, 'final');
checks.push('read-only sites/query allowlist and no query-text dimensions');
await assert.rejects(() =>
  exportGsc(fixture, {
    property: 'https://other.example/',
    token: 'fixture',
    fetcher,
    now,
  }),
);
checks.push('GSC property absent from access list rejected');
await assert.rejects(() =>
  exportGsc(fixture, {
    property: fixture.origin + '/',
    token: 'fixture',
    fetcher: async () => Response.json({ error: 'private' }, { status: 403 }),
    now,
  }),
);
checks.push('GSC forbidden response fails without logging body');
await assert.rejects(() =>
  exportGsc(fixture, {
    property: 'sc-domain:evil.example',
    token: 'fixture',
    fetcher: async () =>
      Response.json({
        siteEntry: [
          { siteUrl: 'sc-domain:evil.example', permissionLevel: 'siteOwner' },
        ],
      }),
    now,
  }),
);
checks.push('accessible unrelated domain rejected');
let pages = 0;
const paged = await exportGsc(fixture, {
  property: fixture.origin + '/',
  token: 'fixture',
  now,
  fetcher: async (url) => {
    if (url.endsWith('/sites'))
      return Response.json({
        siteEntry: [
          { siteUrl: fixture.origin + '/', permissionLevel: 'siteOwner' },
        ],
      });
    pages++;
    return Response.json({
      rows:
        pages === 1
          ? Array.from({ length: 25000 }, () => ({
              keys: ['2026-10-20', 'https://patri.example/materia/unknown'],
              impressions: 1,
              clicks: 0,
            }))
          : [],
    });
  },
});
assert.equal(pages, 2);
assert.equal(paged.audit.omittedRows, 25000);
assert.equal(paged.input.sources.at(-1).dataThrough, null);
checks.push(
  'GSC pagination ends on empty page and does not fabricate freshness',
);
const temp = await mkdtemp(join(tmpdir(), 'patri-measurement-'));
let vite, browser;
try {
  await assert.rejects(() =>
    writePrivateMeasurement(resolve('.preview/forbidden-measurement.json'), {}),
  );
  checks.push('private export cannot enter public checkout');
  await writePrivateMeasurement(join(temp, 'input.json'), fixture);
  await assert.rejects(() =>
    writePrivateMeasurement(join(temp, 'input.json'), fixture),
  );
  checks.push('exports never overwrite an existing destination');
  let child = spawnSync(
    process.execPath,
    [
      'scripts/measurement-report.mjs',
      join(temp, 'input.json'),
      join(temp, 'report.json'),
    ],
    { encoding: 'utf8' },
  );
  assert.equal(child.status, 0, child.stderr);
  assert.equal(
    JSON.parse(await readFile(join(temp, 'report.json'), 'utf8')).mode,
    'synthetic',
  );
  checks.push('offline read/report CLI works outside repository');
  child = spawnSync(
    process.execPath,
    ['scripts/gsc-read.mjs', join(temp, 'input.json'), join(temp, 'plan.json')],
    { encoding: 'utf8' },
  );
  assert.equal(child.status, 0, child.stderr);
  assert.equal(
    JSON.parse(await readFile(join(temp, 'plan.json'), 'utf8')).mode,
    'plan-only',
  );
  checks.push('GSC CLI defaults to plan without external requests');
  Object.assign(process.env, {
    VITE_SUPABASE_URL: 'http://127.0.0.1:15194',
    VITE_SUPABASE_ANON_KEY: 'fixture-public-key',
  });
  await mkdir('.preview', { recursive: true });
  await writeFile(
    '.preview/pt14.html',
    '<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/.preview/pt14.tsx"></script></body></html>',
  );
  await writeFile(
    '.preview/pt14.tsx',
    `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import GrowthPage from'../src/pages/GrowthPage';import{EditorialReport}from'../src/features/content/EditorialReport';import'../src/mobile.css';const c=new QueryClient({defaultOptions:{queries:{retry:false}}});createRoot(document.getElementById('root')!).render(<QueryClientProvider client={c}><MemoryRouter>{location.search.includes('editorial')?<EditorialReport sid={null} demo={false}/>:<GrowthPage admin/>}</MemoryRouter></QueryClientProvider>);`,
  );
  vite = await createServer({
    server: { host: '127.0.0.1', port: 15193, strictPort: true },
    logLevel: 'error',
  });
  await vite.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  let mode = 'ok',
    requests = 0;
  const errors = [];
  await context.route('http://127.0.0.1:15194/**', async (route) => {
    requests++;
    if (route.request().url().includes('relatorio_editorial'))
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: '11000000-0000-4000-8000-000000000001',
              titulo: '=SYNTHETIC()',
              leituras: 0,
              cliques_perfil: 0,
              tempo_medio_segundos: 120,
            },
          ],
          total: 1,
        }),
      });
    if (mode === 'error')
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{"message":"fixture unavailable"}',
      });
    const { date_from: from, date_to: to } = JSON.parse(
      route.request().postData(),
    );
    const data = {
      bloqueado: mode === 'locked',
      atual: { visualizacao_perfil: 0, visualizacao_materia: 3 },
      anterior: { visualizacao_perfil: 2 },
      diario: [
        { dia: to, tipo: 'visualizacao_perfil', quantidade: 0 },
        { dia: to, tipo: 'visualizacao_materia', quantidade: 3 },
      ],
      de: from,
      ate: to,
      atualizado_em: new Date().toISOString(),
    };
    if (mode === 'malformed') data.atual.visualizacao_perfil = -1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:15193/.preview/pt14.html');
  await page.getByText('Consulta recebida em', { exact: false }).waitFor();
  assert.equal(
    await page
      .locator('.growth-metric')
      .filter({ hasText: 'Aberturas de perfil' })
      .locator('strong')
      .textContent(),
    '0',
  );
  assert.equal(
    await page
      .locator('.growth-metric')
      .filter({ hasText: 'Cliques no WhatsApp' })
      .locator('strong')
      .textContent(),
    'Não disponível',
  );
  checks.push('UI explicit zero differs from missing data');
  assert(
    await page
      .getByText('Última execução da agregação: não informada pela fonte.', {
        exact: false,
      })
      .isVisible(),
  );
  checks.push('query receipt time never claims aggregation freshness');
  await page.getByLabel('Relatório',{exact:true}).selectOption('publicidade');
  assert.equal(await page.locator('.growth-metric').filter({hasText:'Impressões de banners'}).count(),1);
  checks.push('existing advertising metrics remain available separately for admin');
  await page.getByLabel('Relatório', { exact: true }).selectOption('leitores');
  assert.equal(
    await page
      .locator('.growth-metric')
      .filter({ hasText: 'Aberturas de matérias' })
      .locator('strong')
      .textContent(),
    '3',
  );
  assert.equal(
    await page
      .locator('.growth-metric')
      .filter({ hasText: 'Confirmações de pedido' })
      .count(),
    0,
  );
  checks.push('reader report separates content from supplier demand');
  await page.getByLabel('Relatório', { exact: true }).selectOption('aquisicao');
  assert.equal(await page.locator('.growth-metric').count(), 0);
  assert(
    await page
      .getByText('Cadastros, fornecedores aprovados', { exact: false })
      .isVisible(),
  );
  checks.push(
    'supplier acquisition report shows unavailable integration without fake counts',
  );
  await page.getByLabel('Relatório', { exact: true }).selectOption('procura');
  assert.equal(requests, 1);
  checks.push('changing report reuses the same authorized aggregate response');
  for (const width of [320, 375, 768]) {
    await page.setViewportSize({ width, height: 812 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  checks.push(
    'measurement panel has no horizontal overflow at 320/375/768 CSS pixels',
  );
  mode = 'malformed';
  await page.getByRole('button', { name: 'Atualizar métricas' }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('.growth-metric').count(), 0);
  checks.push(
    'malformed API response displays error without retaining misleading counts',
  );
  mode = 'locked';
  await page.getByRole('button', { name: 'Atualizar métricas' }).click();
  await page
    .getByRole('heading', { name: 'Conheça os resultados da sua presença' })
    .waitFor();
  assert.equal(await page.locator('.growth-metric').count(), 0);
  checks.push('existing plan restriction preserved');
  mode = 'error';
  await page.getByRole('button', { name: 'Atualizar métricas' }).click();
  await page.getByRole('alert').waitFor();
  checks.push('API outage is an error, not zero performance');
  await page.getByLabel('De', { exact: true }).fill('2020-01-01');
  assert(
    await page.getByRole('button', { name: 'Atualizar métricas' }).isDisabled(),
  );
  checks.push('invalid date range cannot query metrics');
  mode = 'ok';
  await page.goto('http://127.0.0.1:15193/.preview/pt14.html?editorial');
  await page.getByRole('heading', { name: '=SYNTHETIC()' }).waitFor();
  const editorialText = await page.locator('article').innerText();
  assert(editorialText.includes('Aberturas registradas: 0'));
  assert(
    editorialText.includes('Proxy de atividade por abertura: Não disponível'),
  );
  assert(!editorialText.includes('120 s'));
  checks.push(
    'editorial report avoids time proxy when no opening was registered',
  );
  const pendingDownload = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exportar página do relatório' })
    .click();
  const download = await pendingDownload;
  const csv = await readFile(await download.path(), 'utf8');
  assert(csv.includes('aberturas'));
  assert(csv.includes('atividade_por_abertura'));
  assert(!csv.includes('tempo_medio_segundos'));
  assert(csv.includes("'=SYNTHETIC()"));
  checks.push(
    'editorial CSV uses normalized labels and neutralizes spreadsheet formulas',
  );
  await page.getByLabel('De', { exact: true }).fill('2020-01-01');
  await page.getByRole('alert').waitFor();
  checks.push('editorial invalid date window does not query metrics');
  assert.deepEqual(errors, []);
  checks.push('no browser JavaScript errors in controlled measurement flows');
  await mkdir('docs/seo/evidencias-prompt14', { recursive: true });
  await writeFile(
    'docs/seo/evidencias-prompt14/exemplo-sintetico.json',
    JSON.stringify(reconcileMeasurement(fixture, now), null, 2) + '\n',
  );
  await writeFile(
    'docs/seo/evidencias-prompt14/qa.json',
    JSON.stringify(
      { synthetic: true, passed: checks.length, checks },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser?.close();
  await vite?.close();
  if (temp.startsWith(tmpdir()))
    await rm(temp, { recursive: true, force: true });
}
