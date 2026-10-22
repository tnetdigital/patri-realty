import type { PublicSupplier } from '../features/directory/model';
import type { Article } from '../features/content/model';
import { canonicalOrigin } from './policy';

type Node = Record<string, unknown>;
export type GraphInput = {
  origin: string;
  canonical: string | null;
  title: string;
  description: string;
  enabled: boolean;
  suppliers?: PublicSupplier[];
  supplier?: PublicSupplier | null;
  article?: Article | null;
  breadcrumbs?: { name: string; path: string }[];
};
export function serializeStructured(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
const ref = (id: string) => ({ '@id': id });
function date(value?: string | null) {
  return value &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    Date.parse(value) <= Date.now()
    ? value
    : undefined;
}
export function buildGraph(input: GraphInput) {
  const origin = canonicalOrigin(input.origin);
  if (!input.enabled || !origin || !input.canonical) return null;
  let url: URL;
  try {
    url = new URL(input.canonical);
  } catch {
    return null;
  }
  if (url.origin !== origin || url.username || url.password || url.hash)
    return null;
  const page = url.href,
    platform = origin + '/#organization',
    website = origin + '/#website';
  const graph: Node[] = [
    {
      '@type': 'Organization',
      '@id': platform,
      name: 'Patri Realty',
      url: origin + '/',
    },
    {
      '@type': 'WebSite',
      '@id': website,
      name: 'Patri Realty',
      url: origin + '/',
      publisher: ref(platform),
      inLanguage: 'pt-BR',
    },
  ];
  const collection = /^\/(guia|busca)(\/|$)/.test(url.pathname);
  const webpage: Node = {
    '@type': collection ? 'CollectionPage' : 'WebPage',
    '@id': page + '#webpage',
    url: page,
    name: input.title,
    description: input.description,
    isPartOf: ref(website),
    inLanguage: 'pt-BR',
  };
  graph.push(webpage);
  if (input.breadcrumbs?.length) {
    const crumbs = input.breadcrumbs.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      item: new URL(b.path, origin).href,
    }));
    webpage.breadcrumb = ref(page + '#breadcrumb');
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': page + '#breadcrumb',
      itemListElement: crumbs,
    });
  }
  if (collection && input.suppliers) {
    const items = input.suppliers.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Organization',
        '@id':
          origin +
          '/fornecedor/' +
          encodeURIComponent(s.slug) +
          '#organization',
        name: s.nome_fantasia,
        url: origin + '/fornecedor/' + encodeURIComponent(s.slug),
      },
    }));
    webpage.mainEntity = ref(page + '#itemlist');
    graph.push({
      '@type': 'ItemList',
      '@id': page + '#itemlist',
      numberOfItems: items.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: items,
    });
  }
  const s = input.supplier;
  if (s) {
    const supplierUrl = origin + '/fornecedor/' + encodeURIComponent(s.slug),
      id = supplierUrl + '#organization';
    const company: Node = {
      '@type': 'Organization',
      '@id': id,
      name: s.nome_fantasia,
      description: s.descricao_curta,
      url: supplierUrl,
    };
    // The public DTO proves neither a local establishment nor rating provenance.
    // Do not promote coverage/address strings or aggregates to unsupported claims.
    graph.push(company);
    webpage.mainEntity = ref(id);
    for (const service of s.servicos) {
      if (!service.id || !service.titulo) continue;
      graph.push({
        '@type': 'Service',
        '@id': supplierUrl + '#service-' + encodeURIComponent(service.id),
        name: service.titulo,
        description: service.descricao,
        provider: ref(id),
        mainEntityOfPage: ref(page + '#webpage'),
      });
    }
  }
  const a = input.article;
  if (a && a.status === 'publicada' && date(a.publicada_em)) {
    const articleId =
      origin + '/materia/' + encodeURIComponent(a.slug) + '#article';
    const authorName = a.autor?.trim();
    const authorId =
      !authorName || authorName === 'Redação Patri Realty'
        ? origin + '/#editorial'
        : origin + '/materia/' + encodeURIComponent(a.slug) + '#author';
    graph.push({
      '@type':
        !authorName || authorName === 'Redação Patri Realty'
          ? 'Organization'
          : 'Person',
      '@id': authorId,
      name: authorName || 'Redação Patri Realty',
    });
    graph.push({
      '@type': 'Article',
      '@id': articleId,
      headline: a.titulo,
      description: a.resumo,
      mainEntityOfPage: ref(page + '#webpage'),
      author: ref(authorId),
      publisher: ref(platform),
      datePublished: date(a.publicada_em),
      // Updated timestamps may represent moderation rather than visible revisions.
      ...(a.tipo !== 'editorial' ? { genre: 'Conteúdo de marca' } : {}),
    });
    webpage.mainEntity = ref(articleId);
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
