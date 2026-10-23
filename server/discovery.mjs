// Pilot budget is deliberately below the protocol limits. Never truncate silently.
export const DISCOVERY_BUDGET = 200;
const xmlEscape = (s) =>
  s.replace(
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
export function discoveryCandidates(d, editorial) {
  const slug = (s) =>
    typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  return [
    ...new Set([
      '/',
      '/guia',
      '/materias',
      '/revista',
      '/sobre-o-projeto',
      '/para-fornecedores',
      '/termos',
      '/privacidade',
      '/contato',
      '/contrato-fornecedor',
      ...editorial.materias.filter(slug).map((s) => '/materia/' + s),
      ...editorial.revistas.filter(slug).map((s) => '/revista/' + s),
      ...editorial.categorias.filter(slug).map((s) => '/materias/' + s),
      ...d.segmentos.filter(slug).map((s) => '/guia/' + s),
      ...d.locais
        .filter(
          (x) => slug(x.segmento) && slug(x.cidade) && /^[a-z]{2}$/i.test(x.uf),
        )
        .map((x) => `/guia/${x.segmento}/${x.uf.toLowerCase()}/${x.cidade}`),
      ...d.fornecedores
        .filter((x) => slug(x.slug))
        .map((x) => '/fornecedor/' + x.slug),
    ]),
  ];
}
export async function discoveryXml(origin, paths, evaluate) {
  const base = new URL(origin);
  if (
    base.origin !== origin ||
    base.username ||
    base.password ||
    !(
      base.protocol === 'https:' ||
      (base.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(base.hostname))
    )
  )
    throw Error('Invalid sitemap origin');
  const candidates = [...new Set(paths)];
  if (candidates.length > DISCOVERY_BUDGET)
    throw Error(
      'Discovery pilot budget exceeded; prepare reviewed inventory before scaling',
    );
  const urls = [];
  for (const path of candidates) {
    if (
      !path.startsWith('/') ||
      path.startsWith('//') ||
      /[?#\\\s]/.test(path) ||
      /%(?:2f|5c|0[0-9a-f])/i.test(path)
    )
      continue;
    const decision = await evaluate(path);
    if (decision.status >= 500) throw Error('Discovery dependency unavailable');
    if (
      decision.status === 200 &&
      decision.publicRoute &&
      !decision.privateRoute &&
      !decision.noindex &&
      !decision.redirect &&
      decision.canonical === origin + path
    )
      urls.push(origin + path);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${xmlEscape(url)}</loc></url>`).join('')}</urlset>`;
  if (urls.length > 50000 || Buffer.byteLength(xml) > 50 * 1024 * 1024)
    throw Error('Sitemap protocol limit exceeded');
  return xml;
}
export function robotsText(origin, preview) {
  if (preview) return 'User-agent: *\nDisallow: /\n';
  // No new training policy is inferred. Existing wildcard access is preserved.
  return `User-agent: *\nAllow: /\n${['/painel', '/admin', '/busca', '/api/', '/entrar', '/cadastrar', '/recuperar-senha', '/redefinir-senha', '/confirmar-email', '/area', '/conta', '/assumir/', '/convite/', '/relatorio/', '/r/', '/newsletter/', '/previa-editorial', '/demonstracao'].map((p) => 'Disallow: ' + p).join('\n')}\nSitemap: ${origin}/sitemap.xml\n`;
}
