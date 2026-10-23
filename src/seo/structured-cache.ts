import type { QueryClient } from '@tanstack/react-query';
import {
  searchKey,
  profileKey,
  type DirectoryRuntime,
} from '../features/directory/api';
import { contentKey } from '../features/content/api';
import {
  filtersFromRoute,
  type SearchResult,
  type ProfileResult,
} from '../features/directory/model';
import type { Article, PublicResult } from '../features/content/model';
import { buildGraph } from './structured';
import type { decideSeo } from './policy';

export function graphFromCache(
  path: string,
  r: DirectoryRuntime,
  client: QueryClient,
  seo: ReturnType<typeof decideSeo>,
) {
  if (
    r.source !== 'live' ||
    r.preview ||
    r.hashRouting ||
    seo.status !== 200 ||
    seo.privateRoute ||
    seo.robots.includes('noindex')
  )
    return null;
  const u = new URL(path, r.siteUrl),
    f = filtersFromRoute(u.pathname, u.search);
  const parts = u.pathname.split('/').filter(Boolean);
  const slug = decodeURIComponent(parts[1] || '');
  const listing = /^\/(guia|busca)(\/|$)/.test(u.pathname);
  const suppliers = listing
    ? client.getQueryData<SearchResult>(searchKey(r, f))?.items
    : undefined;
  const supplier =
    parts[0] === 'fornecedor'
      ? client.getQueryData<ProfileResult>(profileKey(r, slug))?.fornecedor
      : undefined;
  const article =
    parts[0] === 'materia'
      ? (client.getQueryData<PublicResult>(
          contentKey(r, 'materia', slug, '', f.pagina),
        )?.item as Article | undefined)
      : undefined;
  return buildGraph({
    origin: r.siteUrl,
    canonical: seo.canonical,
    title: seo.title,
    description: seo.description,
    enabled:
      r.source === 'live' &&
      !r.preview &&
      !r.hashRouting &&
      seo.status === 200 &&
      !seo.privateRoute &&
      !seo.robots.includes('noindex'),
    suppliers,
    supplier,
    article,
    breadcrumbs: supplier
      ? [
          { name: 'Início', path: '/' },
          { name: 'Guia de fornecedores', path: '/guia' },
          { name: supplier.nome_fantasia, path: seo.canonical || u.pathname },
        ]
      : listing
        ? [
            { name: 'Início', path: '/' },
            { name: 'Guia de fornecedores', path: '/guia' },
            ...(parts[1]
              ? [{ name: seo.title, path: seo.canonical || '/guia' }]
              : []),
          ]
        : undefined,
  });
}
