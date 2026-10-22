import {gzipSync} from 'node:zlib';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { loadEnv } from 'vite';
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
const { render, sitemapData, contentSitemap } =
  await import('./dist-server/entry-server.js');
const ssrCache=new Map();
const template = await readFile('dist/index.html', 'utf8');
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
    const originalEnd=res.end.bind(res);
    res.end=(data,...args)=>{const type=String(res.getHeader('Content-Type')||'');if(!res.headersSent && data && /gzip/.test(req.headers['accept-encoding']||'') && /text|javascript|json|xml|svg/.test(type)){const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);if(bytes.length>1024){res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');return originalEnd(gzipSync(bytes),...args)}}return originalEnd(data,...args)};
    res.setHeader('X-Content-Type-Options' , 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    try {
      const u = new URL(req.url, base);
      if (/^\/r\/[a-f0-9-]{36}$/.test(u.pathname)) {
        res.setHeader('Cache-Control', 'no-store');
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
          if (response.ok) target = await response.json();
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
          `User-agent: *\n${runtime.source === 'demo' ? 'Disallow: /' : 'Allow: /\nDisallow: /painel\nDisallow: /admin\nDisallow: /busca'}\nSitemap: ${base}/sitemap.xml\n`,
        );
        return;
      }
      if (u.pathname === '/sitemap.xml') {
        const [d, editorial] = await Promise.all([
            sitemapData(runtime),
            contentSitemap(runtime),
          ]),
          paths =
            runtime.source === 'demo'
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
                    '/evento','/contato','/contrato-fornecedor',
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
        res.setHeader('Cache-Control', 'no-store');
        res.end(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((x) => `<url><loc>${esc(base + x.path)}</loc></url>`).join('')}</urlset>`,
        );
        return;
      }
      if (extname(u.pathname) && u.pathname !== '/') {
        const file = resolve('dist', '.' + decodeURIComponent(u.pathname));
        if (!file.startsWith(resolve('dist') + '/')) {
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
          res.setHeader('Cache-Control',u.pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'public,max-age=3600');
          res.end(data);
        } catch {
          res.writeHead(404).end();
        }
        return;
      }
      // Short bounded cache for anonymous guide HTML only. Profiles/reports/accounts remain fresh.
      const cacheKey=u.pathname+u.search;
      const cacheable=/^\/guia(?:\/|$)/.test(u.pathname) && !req.headers.authorization && !req.headers.cookie;
      const cached=cacheable?ssrCache.get(cacheKey):null;
      const result=cached && cached.expires>Date.now()?cached.result:await render(cacheKey,runtime);
      if(cacheable && result.status===200 && !cached){if(ssrCache.size>=20)ssrCache.delete(ssrCache.keys().next().value);ssrCache.set(cacheKey,{expires:Date.now()+3000,result})}
      if(cached && cached.expires<=Date.now())ssrCache.delete(cacheKey);
      if (result.redirect) {
        res
          .writeHead(301, {
            Location: result.redirect.startsWith('/')
              ? result.redirect
              : '/fornecedor/' + encodeURIComponent(result.redirect),
          })
          .end();
        return;
      }
      const state = JSON.stringify(result.state).replace(/</g, '\\u003c');
      let html = template
        .replace(/<title>.*?<\/title>/s, `<title>${esc(result.title)}</title>`)
        .replace(/<meta\s+name="(description|robots)"[^>]*>/g, '');
      html = html
        .replace(
          '</head>',
          `${result.structured ? `<script type="application/ld+json">${JSON.stringify(result.structured).replace(/</g, '\\u003c')}</script>` : ''}<meta name="description" content="${esc(result.description)}"><meta property="og:title" content="${esc(result.title)}"><meta property="og:description" content="${esc(result.description)}"><meta property="og:image" content="${esc(base+'/og/patri-realty.png')}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(base+u.pathname)}"><meta property="og:locale" content="pt_BR"><meta name="twitter:card" content="summary_large_image"><meta name="robots" content="${result.noindex ? 'noindex,follow' : 'index,follow'}"><link rel="canonical" href="${esc(base + u.pathname + u.search)}"></head>`,
        )
        .replace(
          '<div id="root"></div>',
          `<div id="root">${result.html}</div><script>window.__PATRI_STATE__=${state}</script>`,
        );
      res.statusCode=result.status;
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.setHeader('Cache-Control','no-store');
      res.end(html);
    } catch (e) {
      console.error(e.message);
      res
        .writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end('O guia está temporariamente indisponível. Tente novamente.');
    }
  })
  .listen(port, '0.0.0.0', () =>
    console.log('Patri SSR disponível na porta ' + port),
  );
