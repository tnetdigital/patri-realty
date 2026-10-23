import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import {
  discoveryCandidates,
  discoveryXml,
  robotsText,
} from '../server/discovery.mjs';
import { createLocalHarness } from './test-local-eligibility.mjs';
const checks = [];
const check = (name, fn) => {
  fn();
  checks.push(name);
};
const origin = 'https://example.org';
const valid = (path) => ({
  status: 200,
  publicRoute: true,
  privateRoute: false,
  noindex: false,
  redirect: null,
  canonical: origin + path,
});
const sample = {
  segmentos: ['teste', 'teste', '../../painel', 'a?token=x'],
  locais: [],
  fornecedores: [{ slug: 'real' }, { slug: 'x#secret' }],
};
const candidates = discoveryCandidates(sample, {
  materias: ['artigo'],
  revistas: [],
  categorias: [],
});
check('candidatos deduplicados e slugs seguros', () => {
  assert.equal(candidates.filter((x) => x === '/guia/teste').length, 1);
  assert(!candidates.some((x) => /[?#]|\.\./.test(x)));
  assert(!candidates.includes('/evento'));
});
for (const [name, patch] of [
  ['noindex', { noindex: true }],
  ['privado', { privateRoute: true }],
  ['not public', { publicRoute: false }],
  ['redirect', { status: 301, redirect: '/novo' }],
  ['404', { status: 404 }],
  ['canonical diferente', { canonical: origin + '/novo' }],
]) {
  const xml = await discoveryXml(origin, ['/teste'], (p) => ({
    ...valid(p),
    ...patch,
  }));
  check(name + ' excluded', () => assert(!xml.includes('<url>')));
}
const xml = await discoveryXml(
  origin,
  ['/teste', '/teste', '//evil.test', '/teste?x=1', '/teste#x'],
  valid,
);
check('canonical origin uniqueness no fabricated lastmod', () => {
  assert.equal((xml.match(/<loc>/g) || []).length, 1);
  assert(xml.includes(origin + '/teste'));
  assert(!xml.includes('lastmod'));
});
const escaped = await discoveryXml(origin, ['/a&b'], valid);
check('escape XML', () => assert(escaped.includes('/a&amp;b')));
await assert.rejects(() => discoveryXml('https://example.org/path', [], valid));
checks.push('origem com caminho rejeitada');
await assert.rejects(() =>
  discoveryXml(
    origin,
    Array.from({ length: 201 }, (_, i) => '/' + i),
    valid,
  ),
);
checks.push('budget never truncates inventory');
await assert.rejects(() =>
  discoveryXml(origin, ['/x'], (p) => ({ ...valid(p), status: 503 })),
);
checks.push('outage produces no partial sitemap');
check('preview robots omits sitemap', () =>
  assert.equal(robotsText(origin, true), 'User-agent: *\nDisallow: /\n'),
);
check('public robots permits crawlable noindex', () => {
  const r = robotsText(origin, false);
  assert(r.includes('Sitemap: ' + origin + '/sitemap.xml'));
  assert(r.includes('Disallow: /api/'));
  assert(!r.includes('Disallow: /guia'));
});
const h = await createLocalHarness();
try {
  const res = await fetch(h.base + '/sitemap.xml');
  const body = await res.text();
  assert.equal(res.status, 200, body);
  assert.match(res.headers.get('content-type'), /application\/xml/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  checks.push('HTTP XML UTF-8 e no-store');
  const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
  assert.equal(urls.length, new Set(urls).size);
  for (const url of urls) {
    const r = await fetch(url, { redirect: 'manual' });
    const html = await r.text();
    assert.equal(r.status, 200, url);
    assert(!/noindex/.test(r.headers.get('x-robots-tag') || ''), url);
    assert(html.includes('href="' + url + '"'), url);
  }
  checks.push('each sitemap URL returns 200 indexable self canonical');
  assert(body.includes('/guia/teste/sp/cidade-teste'));
  checks.push('eligible synthetic city included');
  await writeFile(h.reviewFile, '[]');
  const withoutReview = await (await fetch(h.base + '/sitemap.xml')).text();
  assert(!withoutReview.includes('/guia/teste/sp/cidade-teste'));
  checks.push('unapproved city excluded');
  h.state.sitemapSegments = [
    'teste',
    'administracao-condominial',
    'portaria-remota',
    'elevadores',
  ];
  const blocked = await (await fetch(h.base + '/sitemap.xml')).text();
  for (const s of [
    'administracao-condominial',
    'portaria-remota',
    'elevadores',
  ])
    assert(!blocked.includes('/guia/' + s));
  checks.push('three retained pilots excluded');
  h.state.sitemapSuppliers = [
    { slug: h.fixture.suppliers[0].slug },
    { slug: 'ausente' },
  ];
  const suppliers = await (await fetch(h.base + '/sitemap.xml')).text();
  assert(suppliers.includes('/fornecedor/' + h.fixture.suppliers[0].slug));
  assert(!suppliers.includes('/fornecedor/ausente'));
  checks.push('public profile included missing profile excluded');
  const article = {
    id: 'synthetic-p13',
    slug: 'editorial-qa',
    titulo: 'Synthetic article',
    resumo: 'QA',
    autor: 'Synthetic newsroom',
    tipo: 'editorial',
    status: 'publicada',
    publicada_em: '2026-01-01T00:00:00Z',
    imagem_capa: '',
    corpo: [{ tipo: 'paragrafo', texto: 'Synthetic QA claim.' }],
    categoria: 'Teste',
    categoria_slug: 'teste',
  };
  h.state.article = article;
  await h.approveArticle(article);
  const approved = await (await fetch(h.base + '/sitemap.xml')).text();
  assert(approved.includes('/materia/editorial-qa'));
  checks.push('sitemap editorial recebe manifesto aprovado vigente');
  await writeFile(h.editorialFile, '[]');
  const revoked = await (await fetch(h.base + '/sitemap.xml')).text();
  assert(!revoked.includes('/materia/editorial-qa'));
  checks.push('editorial revocation removes URL next request');
  await mkdir('docs/seo/evidencias-prompt13', { recursive: true });
  await writeFile(
    'docs/seo/evidencias-prompt13/sitemap-sintetico.xml',
    approved,
  );
  const standard = await (await fetch(h.base + '/robots.txt')).text();
  const bot = await (
    await fetch(h.base + '/robots.txt', {
      headers: { 'User-Agent': 'OAI-SearchBot' },
    })
  ).text();
  assert.equal(standard, bot);
  checks.push(
    'spoofed AI agent receives same response (not real crawler proof)',
  );
  await writeFile(
    'docs/seo/evidencias-prompt13/qa.json',
    JSON.stringify(
      { passed: checks.length, checks, syntheticUrls: urls },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify(
      { passed: checks.length, checks, syntheticUrls: urls },
      null,
      2,
    ),
  );
} finally {
  await h.close();
}
