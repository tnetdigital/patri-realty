import { syntheticEditorialReview } from '../tests/fixtures/editorial-review.ts';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import assert from 'node:assert/strict';
import { localFixture } from '../tests/fixtures/local-eligibility.ts';
import { reviewFingerprint } from '../dist-server/entry-server.js';

export async function createLocalHarness() {
  const fixture = await localFixture(reviewFingerprint);
  const folder = await mkdtemp(join(tmpdir(), 'patri-mpi-qa-'));
  const reviewFile = join(folder, 'review.json');
  const editorialFile = join(folder, 'editorial.json');
  await writeFile(editorialFile, '[]');
  await writeFile(reviewFile, JSON.stringify([fixture.review]));
  const state = {
    article: null,
    publicCount: 3,
    stateOnly: false,
    wrongSegment: false,
    updated: false,
  };
  const current = () =>
    fixture.suppliers.slice(0, state.publicCount).map((s, i) => ({
      ...s,
      segmentos: state.wrongSegment && i === 0 ? [] : s.segmentos,
      cobertura:
        state.stateOnly && i === 0
          ? [{ ...s.cobertura[0], cidade_id: null }]
          : s.cobertura,
      atualizado_em:
        state.updated && i === 0 ? new Date().toISOString() : s.atualizado_em,
    }));
  const backend = http.createServer(async (req, res) => {
    if (req.url.startsWith('/synthetic-count?')) {
      const value = Number(
        new URL(req.url, 'http://fixture.invalid').searchParams.get('value'),
      );
      if (Number.isInteger(value) && value >= 0 && value <= 3)
        state.publicCount = value;
      res.end('Synthetic transport only');
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    let data = {};
    if (req.url.includes('catalogo_guia'))
      data = {
        segmentos: fixture.suppliers[0].segmentos,
        estados: [{ uf: 'SP', nome: 'São Paulo' }],
        cidades: [
          {
            id: 'synthetic-city',
            slug: 'cidade-teste',
            uf: 'SP',
            nome: 'Cidade sintética',
          },
        ],
      };
    else if (req.url.includes('buscar_fornecedores'))
      data = {
        items: current(),
        total: 999,
        pagina: 1,
        paginas: 1,
        not_found: false,
      };
    else if (req.url.includes('fornecedor_publico'))
      data = {
        fornecedor: current().find((s) => s.slug === body.p_slug) || null,
        redirect: null,
      };
    else if (req.url.includes('banners_publicos') && state.banners)
      data = state.banners;
    else if (req.url.includes('sitemap_publico'))
      data = {
        fornecedores: state.sitemapSuppliers || [],
        segmentos: state.sitemapSegments || ['teste'],
        locais: [{ segmento: 'teste', uf: 'SP', cidade: 'cidade-teste' }],
      };
    else if (req.url.includes('conteudo_publico'))
      data =
        body.kind === 'materia' && state.article
          ? { item: state.article }
          : {
              categorias: [],
              revistas: [],
              materias: [],
              items: [],
              total: 0,
            };
    else if (req.url.includes('configuracoes'))
      data = [
        {
          valor: req.url.includes('documentos_versao')
            ? 'synthetic-version'
            : {},
        },
      ];
    res
      .writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify(data));
  });
  await new Promise((resolve) => backend.listen(15187, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:15186';
  const child = spawn(process.execPath, ['server.mjs'], {
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      PORT: '15186',
      VITE_SITE_URL: base,
      VITE_SUPABASE_URL: 'http://127.0.0.1:15187',
      VITE_SUPABASE_ANON_KEY: 'synthetic-public-key',
      PATRI_PREVIEW_MODE: 'false',
      PATRI_LOCAL_REVIEW_FILE: reviewFile,
      PATRI_EDITORIAL_APPROVAL_FILE: editorialFile,
      PATRI_EDITORIAL_FIXTURES: '1',
      PATRI_ALLOWED_HOSTS: '127.0.0.1:15186',
    },
  });
  let errors = '';
  child.stderr.on('data', (chunk) => (errors += chunk));
  const close = async () => {
    child.kill();
    await new Promise((resolve) => child.once('exit', resolve));
    backend.closeAllConnections();
    await new Promise((resolve) => backend.close(resolve));
    const target = resolve(folder),
      within = relative(resolve(tmpdir()), target);
    if (!within || within.startsWith('..') || isAbsolute(within))
      throw Error('Destino temporário inválido.');
    await rm(target, { recursive: true });
  };
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/guia')).status === 200)
        return {
          base,
          state,
          fixture,
          reviewFile,
          editorialFile,
          approveArticle: async (a) => {
            state.article = a;
            await writeFile(
              editorialFile,
              JSON.stringify([await syntheticEditorialReview(a)]),
            );
          },
          close,
        };
    } catch {}
    if (child.exitCode !== null) throw Error(errors);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await close();
  throw Error('Servidor de QA indisponível: ' + errors);
}
export async function runLocalChecks(h) {
  const path = '/guia/teste/sp/cidade-teste',
    api = '/api/local-eligibility?segmento=teste&uf=SP&cidade=cidade-teste';
  const checks = [];
  const inspect = async (name, expected, count, score = 100) => {
    const response = await fetch(h.base + path);
    const html = await response.text();
    assert.equal(response.status, 200, name);
    assert.ok(
      html.includes(
        'content="' + (expected ? 'index,follow' : 'noindex,follow') + '"',
      ),
      name,
    );
    const a = await fetch(h.base + api);
    assert.equal(a.headers.get('cache-control'), 'private, no-store');
    const decision = await a.json();
    assert.equal(decision.indexable, expected, name);
    assert.equal(decision.eligibleSuppliers, count, name);
    assert.equal(decision.score, score, name);
    const sitemap = await (await fetch(h.base + '/sitemap.xml')).text();
    assert.equal(sitemap.includes(path), expected, name);
    const national = await (await fetch(h.base + '/guia/teste')).text();
    assert.equal(national.includes('href="' + path + '"'), expected, name);
    const linksResponse = await fetch(
      h.base + '/api/local-guides?segmento=teste',
    );
    assert.equal(
      linksResponse.headers.get('cache-control'),
      'private, no-store',
    );
    const apiLinks = await linksResponse.json();
    assert.equal(
      apiLinks.some((item) => item.path === path),
      expected,
      name,
    );
    if (!expected)
      assert.ok(html.includes('Consultar o guia nacional desta especialidade'));
    assert.equal(response.headers.get('cache-control'), 'no-store');
    checks.push({
      name,
      indexable: decision.indexable,
      count: decision.eligibleSuppliers,
      sitemap: expected,
      links: expected,
      apiLinks: expected,
    });
  };
  for (const count of [0, 1, 2, 3]) {
    h.state.publicCount = count;
    await inspect('oferta-' + count, count === 3, count);
  }
  h.state.publicCount = 2;
  await inspect('perda de oferta após página elegível', false, 2);
  h.state.publicCount = 3;
  h.state.stateOnly = true;
  await inspect('cobertura estadual não comprova município', false, 2);
  h.state.stateOnly = false;
  h.state.wrongSegment = true;
  await inspect('fornecedor fora do segmento', false, 2);
  h.state.wrongSegment = false;
  h.state.updated = true;
  await inspect('perfil alterado invalida evidência anterior', false, 2);
  h.state.updated = false;
  const changed = structuredClone(h.fixture.review);
  changed.content.context += ' alteração sem novo aceite';
  await writeFile(h.reviewFile, JSON.stringify([changed]));
  await inspect('conteúdo alterado exige novo aceite', false, 3);
  await writeFile(h.reviewFile, '[]');
  const unknown = await (await fetch(h.base + api)).json();
  assert.equal(unknown.score, null);
  assert.equal(unknown.indexable, false);
  checks.push({ name: 'sem revisão', indexable: false, score: null });
  await writeFile(h.reviewFile, JSON.stringify([h.fixture.review]));
  await inspect('revisão original restaurada no transporte sintético', true, 3);
  const weak = structuredClone(h.fixture.review);
  weak.criteria.utility.points = 0;
  weak.criteria.differentiation.points = 14;
  weak.approval.hash = await reviewFingerprint(weak);
  await writeFile(h.reviewFile, JSON.stringify([weak]));
  await inspect('três fornecedores não compensam score 74', false, 3, 74);
  const proofExpired = structuredClone(h.fixture.review);
  proofExpired.supplierProofs[0].expiresAt = new Date(
    Date.now() - 1,
  ).toISOString();
  proofExpired.approval.hash = await reviewFingerprint(proofExpired);
  await writeFile(h.reviewFile, JSON.stringify([proofExpired]));
  await inspect('prova municipal expirada não conta', false, 2);
  const expired = structuredClone(h.fixture.review);
  expired.approval.expiresAt = new Date(Date.now() - 1).toISOString();
  await writeFile(h.reviewFile, JSON.stringify([expired]));
  await inspect('aprovação expirada retira sitemap e links', false, 3);
  await writeFile(h.reviewFile, JSON.stringify([h.fixture.review]));
  const bad = await fetch(
    h.base + '/api/local-eligibility?segmento=teste&uf=SP&cidade=../../x',
  );
  assert.equal(bad.status, 400);
  checks.push({ name: 'parâmetros inválidos', status: bad.status });
  const robots = await (await fetch(h.base + '/robots.txt')).text();
  assert.equal(robots.includes('Disallow: /guia'), false);
  checks.push({ name: 'noindex local rastreável', robotsAllowsGuide: true });
  await writeFile(h.reviewFile, '{"private":"PRIVATE-REVIEW-CANARY"}');
  const invalid = await fetch(h.base + api);
  const invalidBody = await invalid.text();
  assert.equal(invalid.status, 503);
  assert.equal(invalidBody.includes('PRIVATE-REVIEW-CANARY'), false);
  checks.push({
    name: 'documento inválido falha fechado sem conteúdo privado',
    status: 503,
  });
  await writeFile(h.reviewFile, JSON.stringify([h.fixture.review]));
  return checks;
}
if (process.argv[1]?.endsWith('test-local-eligibility.mjs')) {
  const h = await createLocalHarness();
  try {
    const checks = await runLocalChecks(h);
    console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
  } finally {
    await h.close();
  }
}
