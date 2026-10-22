import http from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

// Entirely synthetic transport; no database, account, or external write.
export async function createSeoHarness() {
  const article = (page = 1) => ({
    id: 'synthetic-' + page,
    slug: 'texto-' + page,
    titulo: 'Texto sintético ' + page,
    resumo: 'Descrição sintética para testes de metadata.',
    seo_titulo: '',
    seo_descricao: '',
    corpo: [],
    imagem_capa: '',
    categoria: 'Teste',
    categoria_slug: 'teste',
    publicada_em: null,
    tipo: 'editorial',
    tempo_leitura: 1,
  });
  let failed = false;
  const fixture = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    if (req.url === '/toggle-failure') {
      failed = !failed;
      res.end('ok');
      return;
    }
    if (failed) {
      res.writeHead(503).end('Synthetic outage');
      return;
    }
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = text ? JSON.parse(text) : {};
    const catalog = {
      segmentos: [
        { id: 's', slug: 'teste', nome: 'Teste & Segurança', quantidade: 26 },
      ],
      estados: [{ uf: 'SP', nome: 'São Paulo' }],
      cidades: [],
    };
    let data = {};
    if (req.url.includes('catalogo_guia')) data = catalog;
    else if (req.url.includes('buscar_fornecedores'))
      data = {
        items: [],
        total: 0,
        pagina: body.p_pagina,
        paginas: 0,
        not_found:
          body.p_segmento === 'ausente' || body.p_segmento === 'antigo',
      };
    else if (req.url.includes('redirecionamento_segmento'))
      data = body.slug === 'antigo' ? 'teste' : null;
    else if (req.url.includes('fornecedor_publico'))
      data = {
        fornecedor: null,
        redirect: body.p_slug === 'antigo' ? 'novo' : null,
      };
    else if (req.url.includes('conteudo_publico')) {
      if (body.kind === 'catalogo')
        data = {
          categorias: [{ id: 'c', nome: 'Teste', slug: 'teste' }],
          revistas: [],
        };
      else if (body.kind === 'materia')
        data = {
          item: body.slug_value === 'ausente' ? null : article(),
          not_found: body.slug_value === 'ausente',
        };
      else if (body.kind === 'lista')
        data = {
          items: body.page_number > 2 ? [] : [article(body.page_number)],
          total: 13,
          pagina: body.page_number,
          not_found: false,
        };
      else data = { items: [], materias: [], revistas: [], categorias: [] };
    } else if (req.url.includes('configuracoes'))
      data = [
        { valor: req.url.includes('documentos_versao') ? 'test-version' : {} },
      ];
    else if (req.url.includes('sitemap_publico'))
      data = { fornecedores: [], segmentos: [], locais: [] };
    res
      .writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify(data));
  });
  await new Promise((resolve) => fixture.listen(15184, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:15183';
  const child = spawn(process.execPath, ['server.mjs'], {
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      PORT: '15183',
      VITE_SITE_URL: base,
      VITE_SUPABASE_URL: 'http://127.0.0.1:15184',
      VITE_SUPABASE_ANON_KEY: 'synthetic-public-anon-key',
      PATRI_PREVIEW_MODE: 'false',
      PATRI_ALLOWED_HOSTS: '127.0.0.1:15183',
    },
  });
  let errors = '';
  child.stderr.on('data', (chunk) => (errors += chunk));
  const close = async () => {
    child.kill();
    await new Promise((resolve) => child.once('exit', resolve));
    await new Promise((resolve) => fixture.close(resolve));
  };
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/guia')).status === 200)
        return { base, fixture, child, close };
    } catch {}
    if (child.exitCode !== null) throw Error(errors);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await close();
  throw Error('Synthetic SSR server unavailable: ' + errors);
}

export async function runSeoChecks(harness) {
  const checks = [];
  const inspect = async (path, status, canonical, robots) => {
    const res = await fetch(harness.base + path, { redirect: 'manual' });
    const html = await res.text();
    assert.equal(res.status, status, path);
    if (canonical !== undefined)
      assert.equal(
        html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] || null,
        canonical,
        path,
      );
    if (robots) assert.ok(html.includes('content="' + robots + '"'), path);
    checks.push({ path, status: res.status, canonical: canonical ?? null });
    return { res, html };
  };
  const clean = await inspect(
    '/guia',
    200,
    harness.base + '/guia',
    'index,follow',
  );
  const tracked = await inspect(
    '/guia?utm_source=test&gclid=abc',
    200,
    harness.base + '/guia',
    'index,follow',
  );
  assert.equal(
    clean.html.match(/<title>(.*?)<\/title>/s)[1],
    tracked.html.match(/<title>(.*?)<\/title>/s)[1],
  );
  await inspect(
    '/guia?segmentos=teste,outro',
    200,
    harness.base + '/guia?segmentos=outro%2Cteste',
    'noindex,follow',
  );
  await inspect(
    '/busca?q=%3Cscript%3E',
    200,
    harness.base + '/busca?q=%3Cscript%3E',
    'noindex,follow',
  );
  for (const path of [
    '/guia/teste/sp/cidade/extra',
    '/materia/a/extra',
    '/fornecedor/a/extra',
    '/contato/extra',
    '/fornecedor/ausente',
    '/materia/ausente',
    '/guia/ausente',
  ])
    await inspect(path, 404, null, 'noindex,nofollow');
  const page = await inspect(
    '/materias?pagina=2&utm_medium=x',
    200,
    harness.base + '/materias?pagina=2',
    'index,follow',
  );
  assert.ok(page.html.includes('Texto sintético 2'));
  assert.ok(page.html.includes('href="/materias?pagina=1"'));
  await inspect('/materias?pagina=3', 404, null, 'noindex,nofollow');
  await inspect('/guia?pagina=2', 404, null, 'noindex,nofollow');
  await inspect('/guia?pagina=1.5', 400, null, 'noindex,nofollow');
  await inspect('/fornecedor/a%2Fb', 400, null, 'noindex,nofollow');
  const moved = await inspect('/guia/antigo', 301);
  assert.equal(moved.res.headers.get('location'), '/guia/teste');
  const slash = await inspect('/guia/', 301);
  assert.equal(slash.res.headers.get('location'), '/guia');
  await inspect(
    '/confirmar-email?token=synthetic',
    200,
    null,
    'noindex,nofollow',
  );
  const evilStatus = await new Promise((resolve, reject) => {
    http
      .get(
        harness.base + '/guia',
        { headers: { Host: 'evil.example' } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      )
      .on('error', reject);
  });
  assert.equal(evilStatus, 421);
  checks.push({ path: 'host não autorizado', status: evilStatus });
  await fetch('http://127.0.0.1:15184/toggle-failure');
  const down = await inspect('/materias?outage=1', 503, null);
  await inspect('/r/11111111-1111-1111-1111-111111111111', 503, null);
  assert.equal(down.res.headers.get('retry-after'), '60');
  assert.equal(down.res.headers.get('cache-control'), 'no-store');
  await fetch('http://127.0.0.1:15184/toggle-failure');
  return checks;
}

if (process.argv[1]?.endsWith('test-seo-contract.mjs')) {
  const harness = await createSeoHarness();
  try {
    const checks = await runSeoChecks(harness);
    console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
    if (process.argv.includes('--keep')) {
      console.log('Synthetic review server: ' + harness.base);
      await new Promise((resolve) => process.once('SIGINT', resolve));
    }
  } finally {
    await harness.close();
  }
}
