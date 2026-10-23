import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createLocalHarness } from './test-local-eligibility.mjs';
import { createSeoHarness } from './test-seo-contract.mjs';
import { crawlDiscovery, discoveryLinks } from './crawl-discovery.mjs';
const folder = 'docs/seo/evidencias-prompt10';
await mkdir(folder, { recursive: true });
const checks = [];
const h = await createLocalHarness();
let browser;
try {
  const article = {
    id: 'synthetic-p10',
    slug: 'interlinking-qa',
    titulo: 'Relações sintéticas de QA',
    resumo: 'Fixture sem aprovação real',
    autor: 'Redação sintética',
    tipo: 'fornecedor',
    status: 'publicada',
    publicada_em: '2026-01-01T00:00:00Z',
    imagem_capa: '',
    corpo: [
      {
        tipo: 'paragrafo',
        texto: 'Conteúdo sintético associado a fornecedor sintético.',
      },
    ],
    categoria: 'Teste',
    categoria_slug: 'teste',
    fornecedor: {
      nome: 'Empresa sintética 0',
      slug: 'synthetic-0',
      descricao: 'QA',
      logo: '',
    },
  };
  await h.approveArticle(article);
  const inventory = [
    '/',
    '/guia',
    '/guia/teste',
    '/guia/teste/sp/cidade-teste',
    ...h.fixture.suppliers.map((s) => '/fornecedor/' + s.slug),
    '/materias',
    '/materia/interlinking-qa',
  ];
  const report = await crawlDiscovery(h.base, inventory);
  await writeFile(
    folder + '/grafo-sintetico.json',
    JSON.stringify(
      { ...report, fixture: true, productionValidated: false },
      null,
      2,
    ) + '\n',
  );
  assert.equal(report.truncated, false);
  assert.deepEqual(report.broken, []);
  assert.deepEqual(report.orphans, []);
  assert.deepEqual(report.redirects, []);
  checks.push({
    name: 'rastreamento HTML sem JS: sem órfãs, erros ou redirects no lote sintético',
    passed: true,
    pages: report.pages.length,
  });
  const html = async (path) => (await fetch(h.base + path)).text();
  let links = discoveryLinks(await html('/fornecedor/synthetic-0'), h.base);
  assert.ok(links.includes('/guia/teste'));
  assert.ok(links.includes('/fornecedor/synthetic-1'));
  assert.ok(links.includes('/materia/interlinking-qa'));
  checks.push({
    name: 'perfil: segmento, fornecedor relacionado e matéria no HTML inicial',
    passed: true,
  });
  links = discoveryLinks(await html('/guia/teste'), h.base);
  assert.ok(links.includes('/materia/interlinking-qa'));
  checks.push({
    name: 'guia: matéria com associação editorial explícita',
    passed: true,
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto(h.base + '/guia/teste');
  await page
    .getByRole('link', { name: 'Relações sintéticas de QA', exact: true })
    .click();
  await page
    .getByRole('link', {
      name: 'Conhecer Empresa sintética 0 no guia',
      exact: true,
    })
    .click();
  assert.ok(page.url().endsWith('/fornecedor/synthetic-0'));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  checks.push({
    name: 'navegação guia → matéria → perfil com JS desativado em 375px',
    passed: true,
  });
  const originalSegments = h.fixture.suppliers[1].segmentos;
  h.fixture.suppliers[1].segmentos = [];
  links = discoveryLinks(await html('/fornecedor/synthetic-0'), h.base);
  assert.ok(!links.includes('/fornecedor/synthetic-1'));
  links = discoveryLinks(await html('/guia/teste'), h.base);
  assert.ok(!links.includes('/fornecedor/synthetic-1'));
  checks.push({
    name: 'perfil incompleto não entra em cards ou recomendações',
    passed: true,
  });
  h.fixture.suppliers[1].segmentos = originalSegments;
  h.state.publicCount = 1;
  links = discoveryLinks(await html('/fornecedor/synthetic-0'), h.base);
  assert.ok(!links.includes('/fornecedor/synthetic-1'));
  checks.push({
    name: 'retirada de fornecedor remove recomendação SSR',
    passed: true,
  });
  links = discoveryLinks(await html('/guia/teste'), h.base);
  assert.ok(!links.includes('/guia/teste/sp/cidade-teste'));
  checks.push({
    name: 'perda da oferta municipal remove descoberta local',
    passed: true,
  });
  h.state.publicCount = 0;
  links = discoveryLinks(await html('/materia/interlinking-qa'), h.base);
  assert.ok(!links.includes('/fornecedor/synthetic-0'));
  checks.push({
    name: 'matéria deixa de apontar para perfil retirado',
    passed: true,
  });
  await writeFile(h.editorialFile, '[]');
  assert.equal((await fetch(h.base + '/materia/interlinking-qa')).status, 404);
  checks.push({
    name: 'revogação editorial continua bloqueando publicação',
    passed: true,
  });
} finally {
  await browser?.close();
  await h.close();
}
const seo = await createSeoHarness();
try {
  const root = await (await fetch(seo.base + '/materias')).text();
  assert.ok(discoveryLinks(root, seo.base).includes('/materias?pagina=2'));
  const second = await (await fetch(seo.base + '/materias?pagina=2')).text();
  assert.ok(discoveryLinks(second, seo.base).includes('/materia/texto-13'));
  checks.push({
    name: 'paginação editorial descobre o 13º item sem JS',
    passed: true,
  });
} finally {
  await seo.close();
}
assert.deepEqual(
  discoveryLinks(
    '<a href="/demonstracao">D</a><a href="/guia?utm_source=x">U</a><a href="/guia?uf=SP">F</a><a href="/materias?pagina=2">P</a>',
    'http://localhost',
  ),
  ['/materias?pagina=2'],
);
checks.push({
  name: 'grafo exclui demonstração, rastreamento e filtros funcionais',
  passed: true,
});
await writeFile(
  folder + '/qa.json',
  JSON.stringify(
    {
      fixture: true,
      productionValidated: false,
      passed: checks.length,
      checks,
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
