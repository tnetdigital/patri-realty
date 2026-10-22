import { gzipSync } from 'node:zlib';
import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, relative, isAbsolute, sep } from 'node:path';
import { loadEnv } from 'vite';
import {
  createPreviewGuard,
  PRIVATE_HEADERS,
} from './server/preview-access.mjs';
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const port = Number(env.PORT || 5175),
  base = env.VITE_SITE_URL || `http://127.0.0.1:${port}`;
const runtime = {
  source: env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY ? 'live' : 'demo',
  url: env.VITE_SUPABASE_URL || '',
  key: env.VITE_SUPABASE_ANON_KEY || '',
  siteUrl: base,
  hashRouting: false,
};
const previewMode =
  env.PATRI_PREVIEW_MODE === 'true' || runtime.source === 'demo';
const previewGuard = createPreviewGuard({
  enabled: previewMode,
  password: env.PREVIEW_ACCESS_PASSWORD,
});
const {
  render,
  sitemapData,
  contentSitemap,
  canonicalOrigin,
  localEligibility,
  parseLocalReviews,
  approvedLocalGuides,
  serializeStructured,
} = await import('./dist-server/entry-server.js');
if (runtime.source === 'live' && (!env.VITE_SITE_URL || !canonicalOrigin(base)))
  throw new Error(
    'VITE_SITE_URL deve ser uma origem HTTPS pública válida, sem caminho, query ou fragmento.',
  );
runtime.preview = previewMode;
const allowedHosts = new Set([
  new URL(base).host.toLowerCase(),
  ...(env.PATRI_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
]);

const ssrCache = new Map();
const template = await readFile('dist/index.html', 'utf8');
async function reviewedRuntime() {
  if (!env.PATRI_LOCAL_REVIEW_FILE) return { ...runtime, localReviews: [] };
  const file = await realpath(env.PATRI_LOCAL_REVIEW_FILE);
  const rel = relative(await realpath(process.cwd()), file);
  if (
    !isAbsolute(env.PATRI_LOCAL_REVIEW_FILE) ||
    (!(rel === '..' || rel.startsWith('..' + sep)) && !isAbsolute(rel))
  )
    throw Error(
      'A revisão municipal deve permanecer fora do repositório público.',
    );
  return {
    ...runtime,
    localReviews: parseLocalReviews(JSON.parse(await readFile(file, 'utf8'))),
  };
}
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c],
  );
http
  .createServer(async (req, res) => {
    const originalEnd = res.end.bind(res);
    res.end = (data, ...args) => {
      const type = String(res.getHeader('Content-Type') || '');
      if (
        !res.headersSent &&
        data &&
        /gzip/.test(req.headers['accept-encoding'] || '') &&
        /text|javascript|json|xml|svg/.test(type)
      ) {
        const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
        if (bytes.length > 1024) {
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Vary', 'Accept-Encoding');
          return originalEnd(gzipSync(bytes), ...args);
        }
      }
      return originalEnd(data, ...args);
    };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    if (!previewGuard(req, res)) return;
    try {
      if (!allowedHosts.has(String(req.headers.host || '').toLowerCase())) {
        res
          .writeHead(421, {
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex,nofollow',
          })
          .end('Host não autorizado.');
        return;
      }
      if (
        !req.url.startsWith('/') ||
        req.url.startsWith('//') ||
        /[\\\r\n]/.test(req.url)
      ) {
        res
          .writeHead(400, {
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex,nofollow',
          })
          .end('Endereço inválido.');
        return;
      }
      const u = new URL(req.url, base);
      if (
        u.pathname === '/api/local-eligibility' ||
        u.pathname === '/api/local-guides'
      ) {
        const segmento = u.searchParams.get('segmento') || '',
          uf = u.searchParams.get('uf') || '',
          cidade = u.searchParams.get('cidade') || '';
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Robots-Tag', 'noindex,nofollow');
        if (
          req.method !== 'GET' ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segmento) ||
          (u.pathname === '/api/local-eligibility' &&
            (!/^[A-Z]{2}$/.test(uf) ||
              !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cidade)))
        ) {
          res.writeHead(400).end('Seleção inválida.');
          return;
        }
        const r = await reviewedRuntime();
        const result =
          u.pathname === '/api/local-guides'
            ? await approvedLocalGuides(r, segmento)
            : await localEligibility(r, {
                segmento,
                uf,
                cidade,
                q: '',
                pagina: 1,
                ordem: 'relevancia',
              });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(result));
        return;
      }
      if (u.pathname === '/api/editorial-review') {
        if (!previewMode || !env.PATRI_EDITORIAL_REVIEW_FILE) {
          res.writeHead(404).end();
          return;
        }
        for (const [key, value] of Object.entries(PRIVATE_HEADERS))
          res.setHeader(key, value);
        try {
          const items = JSON.parse(
            await readFile(env.PATRI_EDITORIAL_REVIEW_FILE, 'utf8'),
          );
          if (!Array.isArray(items)) throw new Error('Invalid review data');
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
          });
          res.end(JSON.stringify(items));
        } catch {
          res.writeHead(503, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex,nofollow',
            'Retry-After': '60',
          });
          res.end('Revisão editorial indisponível.');
        }
        return;
      }
      if (!previewMode && u.pathname.startsWith('/previa-editorial')) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Página não encontrada.');
        return;
      }
      if (/^\/r\/[a-f0-9-]{36}$/.test(u.pathname)) {
        res.setHeader('X-Robots-Tag', 'noindex,nofollow');
        res.setHeader(
          'Cache-Control',
          previewMode ? PRIVATE_HEADERS['Cache-Control'] : 'no-store',
        );
        res.setHeader('Referrer-Policy', 'no-referrer');
        let target = null;
        if (runtime.source === 'live') {
          const response = await fetch(
            runtime.url + '/rest/v1/rpc/destino_banner',
            {
              method: 'POST',
              headers: {
                apikey: runtime.key,
                Authorization: 'Bearer ' + runtime.key,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ bid: u.pathname.slice(3) }),
              signal: AbortSignal.timeout(10000),
            },
          );
          if (!response.ok)
            throw new Error('Destino temporariamente indisponível.');
          target = await response.json();
        }
        if (typeof target === 'string' && /^https:\/\//.test(target)) {
          res.writeHead(302, { Location: target }).end();
        } else
          res
            .writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' })
            .end('Campanha indisponível.');
        return;
      }
      if (u.pathname.startsWith('/relatorio/'))
        res.setHeader('Referrer-Policy', 'no-referrer');
      if (u.pathname === '/robots.txt') {
        res.setHeader('Content-Type', 'text/plain');
        res.end(
          `User-agent: *\n${previewMode ? 'Disallow: /' : 'Allow: /\nDisallow: /painel\nDisallow: /admin\nDisallow: /busca'}\nSitemap: ${base}/sitemap.xml\n`,
        );
        return;
      }
      if (u.pathname === '/sitemap.xml') {
        const [d, editorial] = await Promise.all([
            sitemapData(await reviewedRuntime()),
            contentSitemap(runtime),
          ]),
          paths = previewMode
            ? []
            : [
                { path: '/' },
                { path: '/guia' },
                { path: '/materias' },
                { path: '/revista' },
                ...[
                  '/sobre-o-projeto',
                  '/para-fornecedores',
                  '/termos',
                  '/privacidade',
                  '/evento',
                  '/contato',
                  '/contrato-fornecedor',
                ].map((path) => ({ path })),
                ...editorial.materias.map((slug) => ({
                  path: '/materia/' + slug,
                })),
                ...editorial.revistas.map((slug) => ({
                  path: '/revista/' + slug,
                })),
                ...editorial.categorias.map((slug) => ({
                  path: '/materias/' + slug,
                })),
                ...d.segmentos.map((s) => ({ path: '/guia/' + s })),
                ...d.locais.map((x) => ({
                  path: `/guia/${x.segmento}/${x.uf.toLowerCase()}/${x.cidade}`,
                })),
                ...d.fornecedores.map((s) => ({
                  path: '/fornecedor/' + s.slug,
                })),
              ];
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader(
          'Cache-Control',
          previewMode ? PRIVATE_HEADERS['Cache-Control'] : 'no-store',
        );
        res.end(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((x) => `<url><loc>${esc(base + x.path)}</loc></url>`).join('')}</urlset>`,
        );
        return;
      }
      if (extname(u.pathname) && u.pathname !== '/') {
        const file = resolve('dist', '.' + decodeURIComponent(u.pathname));
        const assetRelativePath = relative(resolve('dist'), file);
        if (
          assetRelativePath.startsWith('..') ||
          isAbsolute(assetRelativePath)
        ) {
          res.writeHead(403).end();
          return;
        }
        try {
          const data = await readFile(file);
          res.setHeader(
            'Content-Type',
            {
              '.js': 'text/javascript',
              '.css': 'text/css',
              '.svg': 'image/svg+xml',
              '.jpg': 'image/jpeg',
              '.png': 'image/png',
              '.ico': 'image/x-icon',
              '.webp': 'image/webp',
            }[extname(file)] || 'application/octet-stream',
          );
          res.setHeader(
            'Cache-Control',
            previewMode
              ? PRIVATE_HEADERS['Cache-Control']
              : u.pathname.startsWith('/assets/')
                ? 'public,max-age=31536000,immutable'
                : 'public,max-age=3600',
          );
          res.end(data);
        } catch {
          res.writeHead(404).end();
        }
        return;
      }
      // Short bounded cache for anonymous guide HTML only. Profiles/reports/accounts remain fresh.
      const cacheKey = u.pathname + u.search;
      const cacheable =
        /^\/guia(?:\/|$)/.test(u.pathname) &&
        !/^\/guia\/[^/]+\/[a-z]{2}\/[^/]+/.test(u.pathname) &&
        !u.searchParams.has('cidade') &&
        !env.PATRI_LOCAL_REVIEW_FILE &&
        !req.headers.authorization &&
        !req.headers.cookie;
      const cached = cacheable ? ssrCache.get(cacheKey) : null;
      const result =
        cached && cached.expires > Date.now()
          ? cached.result
          : await render(cacheKey, await reviewedRuntime());
      if (cacheable && result.status === 200 && !cached) {
        if (ssrCache.size >= 20) ssrCache.delete(ssrCache.keys().next().value);
        ssrCache.set(cacheKey, { expires: Date.now() + 3000, result });
      }
      if (cached && cached.expires <= Date.now()) ssrCache.delete(cacheKey);
      if (result.redirect) {
        res
          .writeHead(301, {
            Location: result.redirect,
          })
          .end();
        return;
      }
      const state = JSON.stringify(result.state).replace(/</g, '\\u003c');
      // Only the existing public runtime (including the anonymous key), never server secrets.
      const publicRuntime = JSON.stringify(runtime).replace(/</g, '\\u003c');
      let html = template
        .replace(/<title>.*?<\/title>/s, `<title>${esc(result.title)}</title>`)
        .replace(
          /<meta\s+(?:name="(?:description|robots|twitter:card)"|property="og:[^"]+")[^>]*>/g,
          '',
        )
        .replace(/<link\s+rel="canonical"[^>]*>/g, '');
      html = html
        .replace(
          '</head>',
          `${result.structured ? `<script type="application/ld+json">${serializeStructured(result.structured)}</script>` : ''}<meta name="description" content="${esc(result.description)}"><meta property="og:title" content="${esc(result.title)}"><meta property="og:description" content="${esc(result.description)}"><meta property="og:image" content="${esc(base + '/og/patri-realty.png')}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(result.canonical || '')}"><meta property="og:locale" content="pt_BR"><meta name="twitter:card" content="summary_large_image"><meta name="robots" content="${result.robots}">${result.canonical ? `<link rel="canonical" href="${esc(result.canonical)}">` : ''}</head>`,
        )
        .replace(
          '<div id="root"></div>',
          `<div id="root">${result.html}</div><script>window.__PATRI_STATE__=${state};window.__PATRI_RUNTIME__=${publicRuntime}</script>`,
        );
      res.statusCode = result.status;
      res.setHeader('X-Robots-Tag', result.robots);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Cache-Control',
        previewMode ? PRIVATE_HEADERS['Cache-Control'] : 'no-store',
      );
      res.end(html);
    } catch (e) {
      console.error(e.message);
      res
        .writeHead(503, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex,nofollow',
          'Retry-After': '60',
        })
        .end('O guia está temporariamente indisponível. Tente novamente.');
    }
  })
  .listen(port, '0.0.0.0', () =>
    console.log('Patri SSR disponível na porta ' + port),
  );
