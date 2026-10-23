import { safeHttps } from '../features/directory/model';
import { useQueryClient } from '@tanstack/react-query';
import { graphFromCache } from './structured-cache';
import { serializeStructured } from './structured';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDirectoryRuntime } from '../features/directory/api';
import { decideSeo, type SeoInput } from './policy';

export function applyMetadata(
  seo: ReturnType<typeof decideSeo>,
  graph: unknown = null,
  image?: { url?: string; alt?: string },
) {
  document
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((node) => node.remove());
  if (graph) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.patri = 'structured';
    script.textContent = serializeStructured(graph);
    document.head.appendChild(script);
  }
  document.title = seo.title;
  const article = (graph as { '@graph'?: { '@type'?: string }[] } | null)?.[
    '@graph'
  ]?.some((n) => n['@type'] === 'Article');
  const tags = [
    ['property', 'og:type', article ? 'article' : 'website'],
    ['name', 'description', seo.description],
    [
      'property',
      'og:image',
      safeHttps(image?.url || '') ||
        (seo.origin ? seo.origin + '/og/patri-realty.png' : ''),
    ],
    ['property', 'og:image:alt', image?.alt || 'Patri Realty'],
    ['name', 'robots', seo.robots],
    ['property', 'og:title', seo.title],
    ['property', 'og:description', seo.description],
    ['property', 'og:url', seo.canonical],
  ];
  for (const [attribute, name, content] of tags) {
    const matches = [
      ...document.head.querySelectorAll(`meta[${attribute}="${name}"]`),
    ];
    const node = matches.shift() || document.createElement('meta');
    for (const duplicate of matches) duplicate.remove();
    if (!content) {
      node.remove();
      continue;
    }
    node.setAttribute(attribute!, name!);
    node.setAttribute('content', content);
    document.head.appendChild(node);
  }
  const links = [...document.head.querySelectorAll('link[rel="canonical"]')];
  const canonical = links.shift() || document.createElement('link');
  for (const duplicate of links) duplicate.remove();
  if (seo.canonical) {
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', seo.canonical);
    document.head.appendChild(canonical);
  } else canonical.remove();
}

export function usePageMetadata(
  options: Partial<SeoInput> & {
    socialImage?: string;
    socialImageAlt?: string;
  } = {},
) {
  const client = useQueryClient();
  const runtime = useDirectoryRuntime();
  const loc = useLocation();
  const seo = decideSeo(loc.pathname + loc.search, { ...runtime, ...options });
  const graph = serializeStructured(
    graphFromCache(
      loc.pathname + loc.search,
      { ...runtime, ...options },
      client,
      seo,
    ),
  );
  useEffect(
    () =>
      applyMetadata(seo, JSON.parse(graph), {
        url: options.socialImage,
        alt: options.socialImageAlt,
      }),
    [
      seo.title,
      seo.description,
      seo.robots,
      seo.canonical,
      graph,
      options.socialImage,
      options.socialImageAlt,
    ],
  );
}

export function PageMetadata(props: Partial<SeoInput>) {
  usePageMetadata(props);
  return null;
}
