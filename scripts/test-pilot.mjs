import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { chromium } from '@playwright/test';
import { createLocalHarness } from './test-local-eligibility.mjs';
import {
  comparePilotTexts,
  bytesHash,
  reassessPilot,
} from '../server/pilot.mjs';

const publicManifest = JSON.parse(
  await readFile('docs/seo/manifesto-piloto-pt15.json', 'utf8'),
);
const manifestArg = process.argv.indexOf('--private-manifest');
const privateFile = manifestArg >= 0 ? process.argv[manifestArg + 1] : null;
const full = privateFile
  ? JSON.parse(await readFile(resolve(privateFile), 'utf8'))
  : null;
if (full) {
  const assessed = reassessPilot(full);
  assert.equal(assessed.summary.ready, 0);
  assert.equal(assessed.items.length, publicManifest.items.length);
}
// Clean clones may use anonymous synthetic paths for the private rows. They must not claim annex coverage.
const selected = publicManifest.items.map((row) => ({
  id: row.id,
  family: row.family,
  path:
    full?.items.find((x) => x.id === row.id)?.path ||
    row.path ||
    '/materia/synthetic-' + row.id.toLowerCase(),
}));
const h = await createLocalHarness();
let browser;
const checks = [];
const rows = [];
const errors = [];
const texts = [];
try {
  if (full) {
    for (const ref of full.evidenceIndex.filter(
      (e) => e.visibility === 'private',
    ))
      assert.equal(
        bytesHash(
          await readFile(resolve(dirname(resolve(privateFile)), ref.ref)),
        ),
        ref.sha256,
        'Private source integrity',
      );
    checks.push(
      'private source bytes match recorded hashes; no candidate or approval changed',
    );
  }
  h.state.publicCount = 0;
  h.state.sitemapSegments = selected
    .filter((x) => x.family === 'national-guide')
    .map((x) => x.path.split('/')[2]);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  await context.addInitScript(() =>
    localStorage.setItem('patri:consent', 'essential'),
  );
  let externalBlocked = 0;
  await context.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(h.base + '/') || u.startsWith('http://127.0.0.1:15187/'))
      return route.continue();
    externalBlocked++;
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const sitemapResponse = await fetch(h.base + '/sitemap.xml');
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  const inspectedLinks = new Map();
  for (const row of selected) {
    const response = await fetch(h.base + row.path, { redirect: 'manual' }),
      html = await response.text();
    const initial = await page.evaluate((html) => {
      const d = new DOMParser().parseFromString(html, 'text/html');
      const main = d.querySelector('main')?.cloneNode(true);
      main
        ?.querySelectorAll(
          'nav,header,footer,aside,form,button,input,select,script,style,svg',
        )
        .forEach((x) => x.remove());
      return {
        h1: d.querySelector('main h1')?.textContent?.trim(),
        title: d.title,
        description: d.querySelector('meta[name=description]')?.content,
        robots: d.querySelector('meta[name=robots]')?.content,
        canonical:
          d.querySelector('link[rel=canonical]')?.getAttribute('href') || null,
        graphs: d.querySelectorAll('script[type="application/ld+json"]').length,
        mainText: main?.textContent?.replace(/\s+/g, ' ').trim() || '',
        links: [...d.querySelectorAll('a[href]')].map((x) =>
          x.getAttribute('href'),
        ),
      };
    }, html);
    const national = row.family === 'national-guide';
    assert.equal(response.status, national ? 200 : 404, row.id);
    assert(initial.h1);
    assert(initial.title);
    assert(initial.description);
    assert.match(initial.robots, /noindex/);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    assert.equal(initial.graphs, 0, row.id);
    assert(!sitemap.includes(h.base + row.path + '</loc>'), row.id);
    assert.equal(initial.canonical, national ? h.base + row.path : null);
    if (!national) {
      const api = await fetch(
        h.base +
          '/api/editorial-public?kind=materia&slug=' +
          encodeURIComponent(row.path.split('/')[2]),
      );
      assert.equal(api.status, 200);
      assert.equal((await api.json()).item, null);
      checks.push(
        row.id + ': editorial public projection refuses unapproved draft',
      );
    }
    checks.push(
      row.id + ': initial HTTP/metadata/noindex/schema/sitemap exclusion',
    );
    if (national)
      texts.push({
        id: row.id,
        text: initial.mainText
          .normalize('NFKD')
          .replace(/\p{M}/gu, '')
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      });
    let publicLinks = 0;
    for (const href of [...new Set(initial.links)]) {
      const u = new URL(href, h.base + row.path);
      if (
        u.origin !== h.base ||
        u.search ||
        u.hash ||
        !/^\/(?:$|guia(?:\/|$)|fornecedor\/|materia\/|materias(?:\/|$)|revista(?:\/|$)|sobre-o-projeto$|para-fornecedores$|termos$|privacidade$|evento$|contato$|contrato-fornecedor$)/.test(
          u.pathname,
        )
      )
        continue;
      if (!inspectedLinks.has(u.pathname)) {
        const r = await fetch(u.href, { redirect: 'manual' });
        await r.arrayBuffer();
        inspectedLinks.set(u.pathname, r.status);
      }
      assert.equal(
        inspectedLinks.get(u.pathname),
        200,
        row.id + ' public link',
      );
      publicLinks++;
    }
    checks.push(
      row.id + ': public navigation targets respond without redirects/errors',
    );
    const hydration = [];
    for (const width of [320, 375, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      const navigation = await page.goto(h.base + row.path, {
        waitUntil: 'networkidle',
      });
      assert.equal(navigation.status(), response.status, row.id);
      await page.locator('main h1').waitFor();
      assert.equal(
        (await page.locator('main h1').textContent()).trim(),
        initial.h1,
      );
      assert.equal(
        await page.locator('meta[name=robots]').getAttribute('content'),
        initial.robots,
      );
      assert.equal(
        await page.locator('link[rel=canonical]').count(),
        initial.canonical ? 1 : 0,
      );
      if (initial.canonical)
        assert.equal(
          await page.locator('link[rel=canonical]').getAttribute('href'),
          initial.canonical,
        );
      assert.equal(
        await page.locator('script[type="application/ld+json"]').count(),
        0,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      hydration.push({
        width,
        status: 'passed',
        initialContentPreserved: true,
        metadataPreserved: true,
        noOverflow: true,
      });
    }
    checks.push(row.id + ': hydration/mobile at 320/375/390/768 CSS pixels');
    rows.push({
      id: row.id,
      path: row.family === 'article' ? null : row.path,
      privatePathRedacted: row.family === 'article',
      environment: 'synthetic-loopback',
      initialHttp: response.status,
      robots: initial.robots,
      canonical: national ? 'loopback-only; not a production canonical' : null,
      publicSchemaCount: 0,
      inPilotSitemap: false,
      htmlSha256: bytesHash(html),
      publicLinkCount: publicLinks,
      hydration,
      contentRightsAndEntities: 'not-validated-for-publication',
      actualMedia: 'not-validated-for-publication',
      actualConversion: 'not-validated-for-publication',
    });
  }
  const comparisons = comparePilotTexts(texts);
  checks.push(
    'national sibling similarity analyzed using main text without layout controls',
  );
  const flagged = comparisons.filter((x) => x.reviewRequired);
  if (flagged.length) {
    for (const row of selected.filter((x) => x.family === 'national-guide')) {
      const text = await (await fetch(h.base + row.path)).text();
      assert(text.includes('Guia em preparação'));
    }
    checks.push(
      'flagged national siblings reviewed: repeated preparation template, not original approved content',
    );
  }
  assert.equal(errors.length, 0);
  checks.push(
    'no browser JavaScript errors across all selected exclusion scenarios',
  );
  assert.equal(selected.length, 6);
  assert.equal(rows.length, selected.length);
  checks.push('all six candidate destinations covered; none promoted to ready');
  await mkdir('docs/seo/evidencias-prompt15', { recursive: true });
  await writeFile(
    'docs/seo/evidencias-prompt15/qa.json',
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        synthetic: true,
        privatePathsFromAnnex: !!full,
        realApproval: false,
        realLaunch: false,
        externalRequestsPrevented: externalBlocked,
        passed: checks.length,
        checks,
        rows,
        nationalSiblingSimilarity: {
          method:
            'main text minus nav/header/footer/aside/form/controls/scripts/styles',
          pairs: comparisons,
          reviewConclusion: flagged.length
            ? 'Preparation templates share boilerplate; retained as blocked. No originality approval.'
            : 'No lexical alert at the internal threshold. No originality approval.',
        },
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify(
      {
        passed: checks.length,
        candidateDestinations: rows.length,
        privatePathsFromAnnex: !!full,
        ready: 0,
        flaggedSiblingPairs: flagged.length,
        realLaunch: false,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  await h.close();
}
