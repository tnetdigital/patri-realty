import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createLocalHarness } from './test-local-eligibility.mjs';

const h = await createLocalHarness();
let browser;
const examples = {},
  checks = [];
const read = (html) => {
  const scripts = [
    ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs),
  ];
  assert.ok(scripts.length <= 1, 'no máximo um grafo');
  return scripts[0] ? JSON.parse(scripts[0][1]) : null;
};
try {
  h.fixture.suppliers[0].servicos = [
    {
      id: 'service-1',
      titulo: 'Serviço sintético',
      descricao: 'Teste isolado de provider.',
      foto_url: '',
    },
  ];
  h.fixture.suppliers[0].nota = 4;
  h.fixture.suppliers[0].avaliacoes = 1;
  h.state.article = {
    id: 'synthetic-article',
    slug: 'schema-test',
    titulo: 'Título sintético </script> & São Paulo',
    resumo: 'Resumo público de QA',
    corpo: [],
    imagem_capa: '',
    categoria: 'Teste',
    categoria_slug: 'teste',
    publicada_em: '2026-01-01T12:00:00Z',
    atualizado_em: '2026-02-01T12:00:00Z',
    tipo: 'patrocinada',
    status: 'publicada',
    autor: 'Redação Patri Realty',
    tempo_leitura: 1,
  };
  await h.approveArticle(h.state.article);
  for (const [name, path] of Object.entries({
    home: '/',
    nacional: '/guia/teste',
    municipal_sintetica: '/guia/teste/sp/cidade-teste',
    perfil: '/fornecedor/synthetic-0',
    materia: '/materia/schema-test',
    privada: '/entrar',
    inexistente: '/fornecedor/ausente',
    filtros: '/guia?segmentos=teste,outro',
  })) {
    const res = await fetch(h.base + path),
      html = await res.text();
    const graph = read(html);
    examples[name] = graph;
    if (
      ['municipal_bloqueada', 'privada', 'inexistente', 'filtros'].includes(
        name,
      )
    )
      assert.equal(graph, null, name);
    else assert.ok(graph, name);
    if (name === 'nacional') {
      const list = graph['@graph'].find((n) => n['@type'] === 'ItemList');
      assert.equal(list.numberOfItems, 3);
      assert.equal(
        list.itemListElement[0].item.name,
        h.fixture.suppliers[0].nome_fantasia,
      );
      assert.ok(html.includes(h.fixture.suppliers[0].nome_fantasia));
    }
    if (name === 'perfil') {
      const service = graph['@graph'].find((n) => n['@type'] === 'Service');
      assert.equal(
        service.provider['@id'],
        h.base + '/fornecedor/synthetic-0#organization',
      );
      assert.ok(html.includes('Serviço sintético'));
      assert.ok(html.replace(/<[^>]*>/g, '').includes('4 / 5'));
      assert.ok(!JSON.stringify(graph).includes('AggregateRating'));
    }
    if (name === 'materia') {
      assert.ok(html.includes('Conteúdo de marca'));
      assert.ok(!html.includes('<script>alert'));
      assert.equal(
        graph['@graph'].find((n) => n['@type'] === 'Article').headline,
        h.state.article.titulo,
      );
    }
    checks.push({ name, path, status: res.status, graph: !!graph });
  }
  h.state.publicCount = 2;
  const blocked = read(
    await (await fetch(h.base + '/guia/teste/sp/cidade-teste')).text(),
  );
  assert.equal(blocked, null, 'municipal sem oferta perde o grafo');
  examples.municipal_bloqueada = blocked;
  checks.push({ name: 'municipal bloqueada por oferta', graph: false });
  h.state.publicCount = 3;
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const path of [
    '/guia/teste',
    '/fornecedor/synthetic-0',
    '/materia/schema-test',
  ]) {
    const html = await (await fetch(h.base + path)).text();
    const expected = read(html);
    await page.goto(h.base + path);
    await page.waitForFunction(() =>
      document.querySelector('script[data-patri="structured"]'),
    );
    const current = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    assert.equal(current.length, 1);
    assert.deepEqual(
      JSON.parse(current[0]),
      expected,
      'igualdade SSR/hidratação: ' + path,
    );
    checks.push({ browser: 'SSR/hidratação', path, passed: true });
  }
  // React Router navigation without a new document must discard Article entities.
  await page
    .getByRole('link', { name: 'Guia de fornecedores', exact: true })
    .first()
    .click();
  await page.waitForURL(h.base + '/guia');
  await page.waitForFunction(() => {
    const text = document.querySelector(
      'script[data-patri="structured"]',
    )?.textContent;
    return (
      text &&
      JSON.parse(text)['@graph'].some((n) => n['@type'] === 'CollectionPage') &&
      !text.includes('"@type":"Article"')
    );
  });
  checks.push({ browser: 'matéria → guia sem Article residual', passed: true });
  await page.goto(h.base + '/entrar');
  await page.waitForTimeout(500);
  assert.equal(
    await page.locator('script[type="application/ld+json"]').count(),
    0,
  );
  assert.deepEqual(errors, []);
  checks.push({
    browser: 'rota privada sem grafo e sem erro de execução',
    passed: true,
  });
  await mkdir('docs/seo/evidencias-prompt06', { recursive: true });
  await writeFile(
    'docs/seo/evidencias-prompt06/exemplos-sinteticos.json',
    JSON.stringify(
      {
        aviso:
          'Fixtures isoladas; não são empresas, matérias ou aprovações reais.',
        examples,
      },
      null,
      2,
    ),
  );
  await writeFile(
    'docs/seo/evidencias-prompt06/qa.json',
    JSON.stringify({ checks }, null, 2),
  );
  console.log(
    'Dados estruturados: ' +
      checks.length +
      ' cenários HTTP/navegador aprovados; fixtures isoladas.',
  );
} finally {
  await browser?.close();
  await h.close();
}
