import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createLocalHarness } from './test-local-eligibility.mjs';
import { syntheticEditorialReview } from '../tests/fixtures/editorial-review.ts';
import { editorialHash } from '../src/seo/editorial.ts';
const h = await createLocalHarness();
let browser;
const checks = [];
const article = {
  id: 'synthetic-p09',
  slug: 'editorial-qa',
  titulo: 'Matéria sintética </script>',
  resumo: 'Resposta sintética de QA',
  autor: 'Redação sintética',
  tipo: 'editorial',
  status: 'publicada',
  publicada_em: '2026-01-01T00:00:00Z',
  imagem_capa: '',
  corpo: [
    {
      tipo: 'paragrafo',
      texto:
        'Afirmação sintética com fonte. ' +
        'Parágrafo sintético para validar compressão. '.repeat(50),
    },
    {
      tipo: 'tabela',
      texto: 'Comparação',
      linhas: [
        ['Opção', 'Limite'],
        ['A', 'Sintético'],
      ],
    },
  ],
  categoria: 'Teste',
  categoria_slug: 'teste',
};
const path = '/materia/editorial-qa';
async function request(accept = 'text/html') {
  const res = await fetch(h.base + path, { headers: { Accept: accept } });
  return { res, body: await res.text() };
}
try {
  h.state.article = article;
  let r = await request();
  assert.equal(r.res.status, 404);
  assert.ok(!r.body.includes(article.titulo));
  checks.push({ name: 'sem aprovação', status: 404 });
  let api = await (
    await fetch(h.base + '/api/editorial-public?kind=materia&slug=editorial-qa')
  ).json();
  assert.equal(api.item, null);
  checks.push({ name: 'projeção pública nega rascunho', passed: true });
  await h.approveArticle(article);
  const html = await request(),
    md = await request('text/markdown');
  assert.equal(html.res.status, 200);
  assert.equal(md.res.status, 200);
  assert.ok(md.res.headers.get('content-type').startsWith('text/markdown'));
  assert.ok(md.res.headers.get('vary').includes('Accept'));
  assert.ok(md.res.headers.get('cache-control').includes('no-store'));
  assert.ok(html.body.includes('Resposta sintética de QA'));
  assert.ok(md.body.includes('Resposta sintética de QA'));
  assert.ok(md.body.includes('Comparação'));
  assert.ok(html.body.includes('Fontes e limites'));
  assert.ok(md.body.includes('https://example.com/synthetic-source'));
  assert.ok(!md.body.includes('<script>'));
  checks.push({ name: 'HTML/Markdown e fontes equivalentes', passed: true });
  assert.ok(
    (await request('text/markdown;q=0,text/html')).res.headers
      .get('content-type')
      .startsWith('text/html'),
  );
  checks.push({ name: 'q=0 não recebe Markdown', passed: true });
  const zipped = await fetch(h.base + path, {
    headers: { Accept: 'text/markdown', 'Accept-Encoding': 'gzip' },
  });
  assert.ok(zipped.headers.get('vary').includes('Accept'));
  assert.equal(zipped.headers.get('content-encoding'), 'gzip');
  checks.push({
    name: 'Vary preservado em negociação/compressão',
    passed: true,
  });
  article.imagem_capa = 'https://example.com/synthetic-media.jpg';
  const imageReview = await syntheticEditorialReview(article);
  imageReview.media = [
    {
      url: article.imagem_capa,
      origin: 'https://example.com/source',
      author: 'Autor sintético',
      license: 'Licença sintética de teste',
      evidence: 'https://example.com/permission',
      conditions: 'Somente QA',
      credit: 'Crédito sintético de QA',
      alt: 'Imagem sintética de QA',
      allowed: true,
      sha256: '0'.repeat(64),
    },
  ];
  imageReview.metadata = {
    image: article.imagem_capa,
    imageAlt: 'Imagem sintética de QA',
  };
  const { approval: _approval, ...imagePayload } = imageReview;
  imageReview.approval.hash = await editorialHash(imagePayload);
  await writeFile(h.editorialFile, JSON.stringify([imageReview]));
  const imageHtml = await request(),
    imageMd = await request('text/markdown');
  assert.equal(imageHtml.res.status, 200);
  assert.ok(
    imageHtml.body.includes(
      'property="og:image:alt" content="Imagem sintética de QA"',
    ),
  );
  assert.ok(imageHtml.body.includes('Crédito sintético de QA'));
  const listing = await (await fetch(h.base + '/materias')).text();
  assert.ok(listing.includes('Crédito sintético de QA'));
  assert.ok(imageMd.body.includes('synthetic-media.jpg'));
  checks.push({
    name: 'mídia autorizada sintética, crédito e OG/alt',
    passed: true,
  });
  imageReview.metadata.imageAlt = 'Metadado alterado';
  await writeFile(h.editorialFile, JSON.stringify([imageReview]));
  assert.equal((await request()).res.status, 404);
  imageReview.metadata.imageAlt = 'Imagem sintética de QA';
  await writeFile(h.editorialFile, JSON.stringify([imageReview]));
  checks.push({ name: 'metadado alterado perde aprovação', passed: true });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route('https://example.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhXQAAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(h.base + path);
  await page
    .getByRole('heading', { name: 'Fontes e limites da apuração' })
    .waitFor();
  assert.ok(
    (await page.locator('article.content-detail').innerText()).includes(
      'Afirmação sintética',
    ),
  );
  checks.push({ name: 'navegador usa projeção aprovada', passed: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  article.resumo = 'VERSÃO ALTERADA NÃO APROVADA';
  r = await request();
  assert.equal(r.res.status, 404);
  assert.ok(!r.body.includes(article.resumo));
  checks.push({ name: 'versão alterada perde aprovação HTML', status: 404 });
  r = await request('text/markdown');
  assert.equal(r.res.status, 404);
  assert.ok(!r.body.includes(article.resumo));
  checks.push({ name: 'versão alterada não vaza por Markdown', status: 404 });
  await page.reload();
  await page
    .getByRole('heading', { name: 'Publicação não encontrada' })
    .waitFor();
  assert.equal(
    await page.locator('script[type="application/ld+json"]').count(),
    0,
  );
  checks.push({ name: 'cliente também retira versão alterada', passed: true });
  await writeFile(h.editorialFile, '[]');
  assert.equal((await request()).res.status, 404);
  checks.push({ name: 'revogação remove acesso', status: 404 });
  assert.deepEqual(errors, []);
  await mkdir('docs/seo/evidencias-prompt09', { recursive: true });
  await writeFile(
    'docs/seo/evidencias-prompt09/qa.json',
    JSON.stringify({ synthetic: true, realApprovals: 0, checks }, null, 2),
  );
  console.log(
    checks.length + ' cenários editoriais aprovados; nenhuma aprovação real.',
  );
} finally {
  await browser?.close();
  await h.close();
}
