import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDirectoryRuntime } from '../features/directory/api';
import { decideSeo, type SeoInput } from './policy';

export function applyMetadata(seo: ReturnType<typeof decideSeo>) {
  document.title = seo.title;
  const tags = [
    ['name', 'description', seo.description],
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

export function usePageMetadata(options: Partial<SeoInput> = {}) {
  const runtime = useDirectoryRuntime();
  const loc = useLocation();
  const seo = decideSeo(loc.pathname + loc.search, { ...runtime, ...options });
  useEffect(
    () => applyMetadata(seo),
    [seo.title, seo.description, seo.robots, seo.canonical],
  );
}

export function PageMetadata(props: Partial<SeoInput>) {
  usePageMetadata(props);
  return null;
}
