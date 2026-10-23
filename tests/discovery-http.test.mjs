import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { crawlDiscovery, discoveryLinks } from '../scripts/crawl-discovery.mjs';
test('crawler detects orphans, redirects, errors, disconnected clusters and noindex', async () => {
  const pages = {
    '/': '<a href="/guia">Guia</a><a href="/materia/quebrada">Erro</a><a href="/fornecedor/antigo">Alias</a>',
    '/guia': '<a href="/">Início</a>',
    '/materia/orfa': '<h1>Órfã</h1>',
    '/materia/rascunho':
      '<meta name="robots" content="noindex"><h1>Retida</h1>',
  };
  const server = http.createServer((req, res) => {
    if (req.url === '/fornecedor/antigo') {
      res.writeHead(301, { Location: '/fornecedor/atual' }).end();
      return;
    }
    res
      .writeHead(req.url in pages ? 200 : 404, { 'Content-Type': 'text/html' })
      .end(pages[req.url] || '404');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const report = await crawlDiscovery(base, [
      '/',
      '/guia',
      '/materia/orfa',
      '/materia/rascunho',
    ]);
    assert.deepEqual(report.orphans, ['/materia/orfa']);
    assert.equal(report.broken[0].path, '/materia/quebrada');
    assert.equal(report.redirects[0].path, '/fornecedor/antigo');
    assert.equal(report.clusters.length, 2);
    assert.equal(
      report.depths.find((x) => x.path === '/materia/orfa').depth,
      null,
    );
    assert.deepEqual(report.excludedInventory, ['/materia/rascunho']);
    const capped = await crawlDiscovery(base, ['/', '/guia'], { limit: 1 });
    assert.equal(capped.truncated, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test('only HTML anchors enter discovery; scripts, external URLs and tracking are excluded', () => {
  assert.deepEqual(
    discoveryLinks(
      '<script>"<a href="/materia/falso">falso</a>"</script><a href="https://externo.invalid/guia">E</a><a href="/materias?pagina=2#lista">P</a><a href="/guia?utm_source=x">T</a>',
      'https://patri.example',
    ),
    ['/materias?pagina=2'],
  );
});
