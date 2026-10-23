import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
const publicPath =
  /^(?:\/(?:guia(?:\/[^/]+(?:\/[a-z]{2}\/[^/]+)?)?|fornecedor\/[^/]+|materias(?:\/[^/]+)?|materia\/[^/]+|revista(?:\/[^/]+)?)|\/)$/;
export function discoveryLinks(html, base) {
  const links = new Set();
  const clean = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  for (const match of clean.matchAll(
    /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
  )) {
    const u = new URL(match[1].replaceAll('&amp;', '&'), base);
    if (u.origin !== new URL(base).origin || !publicPath.test(u.pathname))
      continue;
    // Functional filters are navigation, but not recommended indexing inventory.
    if ([...u.searchParams.keys()].some((k) => k !== 'pagina')) continue;
    u.hash = '';
    links.add(u.pathname + u.search);
  }
  return [...links];
}
export async function crawlDiscovery(base, inventory, { limit = 200 } = {}) {
  const origin = new URL(base).origin;
  const queue = ['/'],
    pages = new Map();
  async function visit(path) {
    const res = await fetch(origin + path, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const robots =
      html.match(
        /<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']*)/i,
      )?.[1] || '';
    const links = res.status === 200 ? discoveryLinks(html, origin + path) : [];
    const record = {
      path,
      status: res.status,
      noindex:
        /noindex/i.test(robots) ||
        /noindex/i.test(res.headers.get('x-robots-tag') || ''),
      redirect: res.headers.get('location'),
      links,
    };
    pages.set(path, record);
    return record;
  }
  while (queue.length && pages.size < limit) {
    const path = queue.shift();
    if (pages.has(path)) continue;
    const p = await visit(path);
    queue.push(...p.links.filter((x) => !pages.has(x)));
  }
  const reached = new Set(pages.keys());
  queue.push(...inventory.filter((path) => !pages.has(path)));
  while (queue.length && pages.size < limit) {
    const path = queue.shift();
    if (pages.has(path)) continue;
    const p = await visit(path);
    queue.push(...p.links.filter((x) => !pages.has(x)));
  }
  const depths = { '/': 0 },
    bfs = ['/'];
  while (bfs.length) {
    const path = bfs.shift();
    for (const target of pages.get(path)?.links || []) {
      if (!(target in depths)) {
        depths[target] = depths[path] + 1;
        bfs.push(target);
      }
    }
  }
  const eligible = inventory.filter(
    (p) => pages.get(p)?.status === 200 && !pages.get(p)?.noindex,
  );
  const remaining = new Set(eligible),
    clusters = [];
  while (remaining.size) {
    const group = [],
      work = [remaining.values().next().value];
    while (work.length) {
      const p = work.pop();
      if (!remaining.delete(p)) continue;
      group.push(p);
      for (const other of remaining)
        if (
          pages.get(p)?.links.includes(other) ||
          pages.get(other)?.links.includes(p)
        )
          work.push(other);
    }
    clusters.push(group);
  }
  return {
    generatedAt: new Date().toISOString(),
    base: origin,
    limit,
    truncated: queue.length > 0 || inventory.some((x) => !pages.has(x)),
    inventory,
    eligible,
    orphans: eligible.filter((p) => !reached.has(p)),
    broken: [...pages.values()].filter((p) => p.status >= 400),
    redirects: [...pages.values()].filter(
      (p) => p.status >= 300 && p.status < 400,
    ),
    depths: eligible.map((path) => ({ path, depth: depths[path] ?? null })),
    overThreeClicks: eligible.filter((p) => depths[p] > 3),
    clusters,
    excludedInventory: inventory.filter((p) => !eligible.includes(p)),
    pages: [...pages.values()],
  };
}
export async function sitemapInventory(base) {
  const origin = new URL(base).origin;
  const response = await fetch(origin + '/sitemap.xml', {
    redirect: 'manual',
    signal: AbortSignal.timeout(10000),
  });
  const xml = await response.text();
  if (response.status !== 200 || !/<urlset\b/.test(xml))
    throw new Error(
      'Sitemap público indisponível ou protegido. Não contornar a proteção.',
    );
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => {
      const u = new URL(m[1].replaceAll('&amp;', '&'));
      return u.origin === origin && publicPath.test(u.pathname)
        ? u.pathname + u.search
        : null;
    })
    .filter(Boolean);
  if (!paths.length)
    throw new Error(
      'Inventário público vazio; auditoria não pode declarar aceite.',
    );
  return [...new Set(paths)];
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [base, input, output] = process.argv.slice(2);
  if (!base || !input || !output)
    throw new Error(
      'Uso: node scripts/crawl-discovery.mjs BASE INVENTARIO.json RELATORIO.json',
    );
  const inventory =
    input === '-'
      ? await sitemapInventory(base)
      : JSON.parse(await readFile(input, 'utf8'));
  if (
    !Array.isArray(inventory) ||
    !inventory.length ||
    inventory.some(
      (x) =>
        typeof x !== 'string' ||
        !x.startsWith('/') ||
        x.startsWith('//') ||
        !publicPath.test(x.split('?')[0]),
    )
  )
    throw new Error('Inventário inválido');
  const report = await crawlDiscovery(base, inventory);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      pages: report.pages.length,
      orphans: report.orphans.length,
      broken: report.broken.length,
      truncated: report.truncated,
    }),
  );
  if (
    report.truncated ||
    report.orphans.length ||
    report.broken.length ||
    report.redirects.length
  )
    process.exitCode = 1;
}
