import { filtersFromRoute, directoryPath } from '../features/directory/model';
import { nationalPilotBlocked } from './national-pilot';
import { institutionalMeta } from '../features/privacy/legal';
import { directoryTexts } from '../features/directory/texts';
import type { DirectoryCatalog, Filters } from '../features/directory/model';
import {
  localLocation,
  locationKey,
  freshEligibility,
  type LocalEligibility,
} from './eligibility';

export const SEO_POLICY_VERSION = '2026-10-22.03';
const tracking = /^(utm_.+|gclid|dclid|fbclid|msclkid|gbraid|wbraid|_ga)$/i;
const publicRoutes = [
  /^\/$/,
  /^\/guia(?:\/[^/]+(?:\/[a-z]{2}\/[^/]+)?)?$/,
  /^\/busca$/,
  /^\/fornecedor\/[^/]+$/,
  /^\/materias(?:\/[^/]+)?$/,
  /^\/materia\/[^/]+$/,
  /^\/revista(?:\/[^/]+)?$/,
];
const privateRoutes = [
  /^\/(entrar|cadastrar|recuperar-senha|redefinir-senha|confirmar-email|area|conta|conta-removida)$/,
  /^\/(painel|admin)(?:\/.*)?$/,
  /^\/(assumir|convite|relatorio|r)\/[^/]+$/,
  /^\/newsletter\/[^/]+\/[^/]+$/,
  /^\/previa-editorial(?:\/[^/]+)?$/,
  /^\/demonstracao(?:-[a-z]+)?(?:\/.*)?$/,
];

export function publicRedirect(candidate?: string | null): string | null {
  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    /[\\\r\n#]|%(?:0[0-9a-f]|1[0-9a-f]|7f|2f|5c)/i.test(candidate) ||
    !publicRoutes.some((re) => re.test(candidate.split('?')[0]))
  )
    return null;
  return candidate;
}

export function canonicalOrigin(value: string): string | null {
  try {
    const u = new URL(value);
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname);
    if (
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      u.pathname !== '/' ||
      !(u.protocol === 'https:' || (local && u.protocol === 'http:')) ||
      /(?:^|\.)appdeploy\.ai$|(?:^|\.)vercel\.app$/.test(u.hostname)
    )
      return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function directoryMetadata(f: Filters, catalog?: DirectoryCatalog) {
  const labels = f.segmento
    .split(',')
    .filter(Boolean)
    .map((slug) => catalog?.segmentos.find((s) => s.slug === slug)?.nome)
    .filter(Boolean);
  const name =
    labels.length > 1
      ? labels.slice(0, 2).join(' + ') +
        (labels.length > 2 ? ` e mais ${labels.length - 2}` : '')
      : labels[0];
  const title = [
    f.q ? `${directoryTexts.results}: ${f.q}` : name || directoryTexts.title,
    f.cidade
      ? catalog?.cidades.find((c) => c.slug === f.cidade)?.nome || f.cidade
      : f.uf,
  ]
    .filter(Boolean)
    .join(' — ');
  return { title, description: title + '. ' + directoryTexts.intro };
}

export function contentMetadata(input: {
  path: string;
  category?: string;
  title?: string;
  description?: string;
  edition?: string;
}) {
  return {
    title:
      input.title ||
      (input.path.startsWith('/revista')
        ? 'Revista Patri Realty'
        : 'Matérias' + (input.category ? ' — ' + input.category : '')),
    description:
      input.description ||
      (input.edition
        ? 'Revista Patri Realty, edição ' + input.edition
        : 'Conhecimento e perspectivas para a gestão condominial.'),
  };
}

export type SeoInput = {
  siteUrl: string;
  source: 'live' | 'demo';
  hashRouting?: boolean;
  preview?: boolean;
  title?: string;
  description?: string;
  status?: number;
  noindex?: boolean;
  pending?: boolean;
  pageItems?: number;
  redirect?: string | null;
  localEligibility?: LocalEligibility;
};

export function decideSeo(address: string, input: SeoInput) {
  const origin = canonicalOrigin(input.siteUrl);
  let u: URL;
  let malformed = false;
  try {
    if (
      !address.startsWith('/') ||
      address.startsWith('//') ||
      /[\\\r\n]/.test(address)
    )
      throw Error();
    u = new URL(address, 'https://route.invalid');
    const parts = u.pathname.split('/').map((part) => {
      const value = decodeURIComponent(part).normalize('NFC');
      if (/[\/\\\u0000-\u001f\u007f]/.test(value)) throw Error();
      return encodeURIComponent(value);
    });
    u.pathname = parts.join('/');
  } catch {
    malformed = true;
    u = new URL('/invalid', 'https://route.invalid');
  }
  const originalPath = u.pathname;
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
  const path = u.pathname;
  const privateRoute = privateRoutes.some((re) => re.test(path));
  const publicRoute =
    publicRoutes.some((re) => re.test(path)) || !!institutionalMeta[path];
  const parameters = new URLSearchParams();
  for (const [key, value] of u.searchParams)
    if (!tracking.test(key)) parameters.append(key, value);
  const page = parameters.get('pagina');
  const paginationValid =
    !page || (/^[1-9]\d*$/.test(page) && Number(page) <= 10000);
  if (page === '1') parameters.delete('pagina');
  if (parameters.get('ordem') === 'relevancia') parameters.delete('ordem');
  const listing = /^\/(guia(?:\/.*)?|busca|materias(?:\/[^/]+)?)$/.test(path);
  let normalizedPath = path;
  if (/^\/(guia|busca)(\/|$)/.test(path) && publicRoute && paginationValid) {
    const route = directoryPath(filtersFromRoute(path, parameters.toString()));
    const normalized = new URL(route, 'https://route.invalid');
    normalizedPath = normalized.pathname;
    // Keep unknown parameters: their equivalence to this hub has not been established.
    const known = new Set([
      'q',
      'segmento',
      'segmentos',
      'uf',
      'cidade',
      'pagina',
      'ordem',
    ]);
    for (const [key, value] of parameters)
      if (!known.has(key)) normalized.searchParams.append(key, value);
    for (const key of [...new Set(parameters.keys())]) parameters.delete(key);
    for (const [key, value] of normalized.searchParams)
      parameters.append(key, value);
  }
  parameters.sort();
  const normalizedUrl =
    normalizedPath + (parameters.size ? '?' + parameters.toString() : '');
  const filtered =
    [...parameters.keys()].some((key) => key !== 'pagina' || !listing) ||
    path === '/busca';
  let status =
    malformed || !paginationValid
      ? 400
      : !publicRoute && !privateRoute
        ? 404
        : input.status || 200;
  if (input.redirect && !publicRedirect(input.redirect)) status = 503;
  if (
    status === 200 &&
    listing &&
    Number(page || 1) > 1 &&
    input.pageItems === 0
  )
    status = 404;
  const defaultMeta = institutionalMeta[path] || {
    title: 'Patri Realty — conexões para condomínios',
    description: 'Encontre fornecedores por especialidade e região.',
  };
  let title = input.title || defaultMeta.title;
  let description = input.description || defaultMeta.description;
  if (status === 404) {
    title = 'Página não encontrada';
    description =
      'O endereço não está disponível. Explore o guia e as publicações da Patri Realty.';
  }
  if (status >= 500) {
    title = 'Temporariamente indisponível';
    description = 'Tente novamente em alguns instantes.';
  }
  if (status === 400) {
    title = 'Endereço inválido';
    description = 'Confira o endereço e os parâmetros informados.';
  }
  if (Number(page || 1) > 1 && listing && status === 200)
    title += ' — página ' + page;
  if (!title.endsWith(' | Patri Realty')) title += ' | Patri Realty';
  const excluded =
    privateRoute ||
    status !== 200 ||
    input.source === 'demo' ||
    input.hashRouting ||
    input.preview ||
    !origin;
  const municipal = localLocation(filtersFromRoute(path, u.search));
  const gateBlocked =
    !!municipal &&
    (!freshEligibility(input.localEligibility) ||
      !input.localEligibility?.location ||
      locationKey(input.localEligibility.location) !== locationKey(municipal));
  const noindex = !!(
    excluded ||
    filtered ||
    input.noindex ||
    input.pending ||
    gateBlocked ||
    nationalPilotBlocked(path)
  );
  const canonical = excluded ? null : origin + normalizedUrl;
  let redirect: string | null = null;
  if (input.redirect && status === 200) {
    redirect = publicRedirect(input.redirect);
  }
  if (!redirect && status === 200 && !privateRoute && originalPath !== path)
    redirect = path + u.search;
  return {
    version: SEO_POLICY_VERSION,
    status: redirect ? 301 : status,
    title,
    description,
    canonical,
    robots: noindex
      ? privateRoute || status !== 200
        ? 'noindex,nofollow'
        : 'noindex,follow'
      : 'index,follow',
    noindex,
    normalizedUrl,
    redirect,
    privateRoute,
    publicRoute,
    origin,
  };
}
