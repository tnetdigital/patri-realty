import { profileEssentials } from './seo/profile';
export { serializeStructured } from './seo/structured';
export { nationalPilotBlocked } from './seo/national-pilot';
import { graphFromCache } from './seo/structured-cache';
import {
  institutionalMeta,
  publicDocumentVersion,
  documentVersionKey,
  legalIdentity,
  legalKey,
} from './features/privacy/legal';
import { contentPublic, contentKey } from './features/content/api';
import type { Article, Magazine } from './features/content/model';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
  dehydrate,
} from '@tanstack/react-query';
import { PassThrough } from 'node:stream';
import App from './pages/App';
import { AuthProvider } from './features/auth/context';
import {
  DirectoryContext,
  directoryCatalog,
  searchDirectory,
  publicProfile,
  sitemapData,
  catalogKey,
  searchKey,
  profileKey,
  localEligibility,
  eligibilityKey,
  approvedLocalGuides,
  localGuidesKey,
  type DirectoryRuntime,
} from './features/directory/api';
import { filtersFromRoute } from './features/directory/model';
import { decideSeo, directoryMetadata, contentMetadata } from './seo/policy';
import { localLocation, type LocalEligibility } from './seo/eligibility';
export { decideSeo, canonicalOrigin } from './seo/policy';
export { parseLocalReviews, reviewFingerprint } from './seo/eligibility';
export {
  localEligibility,
  approvedLocalGuides,
} from './features/directory/api';
export async function render(url: string, r: DirectoryRuntime) {
  const u = new URL(url, r.siteUrl),
    client = new QueryClient(),
    f = filtersFromRoute(u.pathname, u.search);
  let title = 'Patri Realty — conexões para condomínios',
    description = 'Encontre fornecedores por especialidade e região.',
    status = 200,
    redirect: string | null = null;
  const route = decideSeo(url, r);
  let pageItems: number | undefined;
  let eligibility: LocalEligibility | undefined;
  status = route.status === 301 ? 200 : route.status;
  redirect = route.redirect;
  if (status === 200 && /^\/(guia|busca)(\/|$)/.test(u.pathname)) {
    const [catalog, result] = await Promise.all([
      client.fetchQuery({
        queryKey: catalogKey(r, f.uf),
        queryFn: () => directoryCatalog(r, f.uf),
      }),
      client.fetchQuery({
        queryKey: searchKey(r, f),
        queryFn: () => searchDirectory(r, f),
      }),
    ]);
    ({ title, description } = directoryMetadata(f, catalog));
    if (localLocation(f)) {
      const gate = await client.fetchQuery<LocalEligibility>({
        queryKey: eligibilityKey(r, f),
        queryFn: () => localEligibility(r, f),
      });
      eligibility = gate;
      if (gate.content) ({ title, description } = gate.content);
    }
    if (f.segmento && !f.segmento.includes(',') && !f.uf && !f.q)
      await client.fetchQuery({
        queryKey: localGuidesKey(r, f.segmento),
        queryFn: () => approvedLocalGuides(r, f.segmento),
      });
    pageItems = result.items.length;
    if (result.redirect) redirect = result.redirect;
    else if (result.not_found) status = 404;
  }
  if (status === 200 && /^\/fornecedor\/[^/]+$/.test(u.pathname)) {
    const slug = decodeURIComponent(u.pathname.split('/')[2] || ''),
      data = await client.fetchQuery({
        queryKey: profileKey(r, slug),
        queryFn: () => publicProfile(r, slug),
      });
    redirect = data.redirect;
    if (data.fornecedor && profileEssentials(data.fornecedor)) {
      title =
        data.fornecedor.nome_fantasia +
        ' — ' +
        (data.fornecedor.segmentos[0]?.nome || 'Fornecedor');
      description = data.fornecedor.descricao_curta;
      await client.fetchQuery({
        queryKey: contentKey(r, 'fornecedor', slug),
        queryFn: () => contentPublic(r, 'fornecedor', slug),
      });
    } else if (!redirect) {
      status = 404;
      title = 'Empresa não encontrada | Patri Realty';
    }
  }
  const institutional = institutionalMeta[u.pathname];
  if (institutional) {
    title = institutional.title + ' | Patri Realty';
    description = institutional.description;
  }
  if (
    ['/termos', '/privacidade', '/contrato-fornecedor'].includes(u.pathname)
  ) {
    await client.fetchQuery({
      queryKey: documentVersionKey(r),
      queryFn: () => publicDocumentVersion(r),
    });
    await client.fetchQuery({
      queryKey: legalKey(r),
      queryFn: () => legalIdentity(r),
    });
  }
  if (
    status === 200 &&
    (u.pathname === '/' ||
      /^\/(materias|materia|revista)(\/|$)/.test(u.pathname))
  ) {
    const parts = u.pathname.split('/').filter(Boolean),
      issue = parts[0] === 'revista',
      detail = (parts[0] === 'materia' || issue) && !!parts[1],
      kind = detail
        ? issue
          ? 'revista'
          : 'materia'
        : issue
          ? 'catalogo'
          : 'lista',
      slug = detail ? decodeURIComponent(parts[1]) : '',
      category =
        parts[0] === 'materias' && parts[1] ? decodeURIComponent(parts[1]) : '',
      page = Math.max(
        1,
        Math.min(10000, Number(u.searchParams.get('pagina')) || 1),
      );
    const [data] = await Promise.all([
      client.fetchQuery({
        queryKey: contentKey(r, kind, slug, category, page),
        queryFn: () => contentPublic(r, kind, slug, category, page),
      }),
      client.fetchQuery({
        queryKey: contentKey(r, 'catalogo'),
        queryFn: () => contentPublic(r, 'catalogo'),
      }),
    ]);
    if (data.redirect) redirect = data.redirect;
    if (!detail && !issue && u.pathname !== '/') pageItems = data.items?.length;
    if ((detail && !data.item && !redirect) || data.not_found) status = 404;
    if (detail && data.item) {
      const item = data.item as Article | Magazine;
      ({ title, description } = contentMetadata({
        path: u.pathname,
        title:
          'seo_titulo' in item && item.seo_titulo
            ? item.seo_titulo
            : item.titulo,
        description:
          'seo_descricao' in item && item.seo_descricao
            ? item.seo_descricao
            : 'resumo' in item
              ? item.resumo
              : undefined,
        edition: 'edicao' in item ? item.edicao : undefined,
      }));
    } else if (u.pathname !== '/') {
      ({ title, description } = contentMetadata({
        path: u.pathname,
        category,
      }));
    }
  }
  const html = await new Promise<string>((resolve, reject) => {
    const output = new PassThrough();
    let content = '';
    output.on('data', (chunk) => (content += chunk));
    output.on('end', () => resolve(content));
    const stream = renderToPipeableStream(
      <QueryClientProvider client={client}>
        <DirectoryContext.Provider value={r}>
          <StaticRouter location={url}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </StaticRouter>
        </DirectoryContext.Provider>
      </QueryClientProvider>,
      {
        onAllReady() {
          stream.pipe(output);
        },
        onError: reject,
      },
    );
    setTimeout(() => stream.abort(), 15000).unref();
  });
  const finalSeo = decideSeo(url, {
    ...r,
    title,
    description,
    status,
    pageItems,
    localEligibility: eligibility,
    redirect:
      redirect &&
      u.pathname.startsWith('/fornecedor/') &&
      !redirect.startsWith('/')
        ? '/fornecedor/' + encodeURIComponent(redirect)
        : redirect,
  });
  return {
    html,
    structured: graphFromCache(url, r, client, finalSeo),
    state: dehydrate(client),
    ...finalSeo,
  };
}
export { sitemapData };

export async function contentSitemap(
  r: DirectoryRuntime,
): Promise<{ materias: string[]; revistas: string[]; categorias: string[] }> {
  if (r.source === 'demo')
    return { materias: [], revistas: [], categorias: [] };
  return (await contentPublic(r, 'sitemap')) as unknown as {
    materias: string[];
    revistas: string[];
    categorias: string[];
  };
}
