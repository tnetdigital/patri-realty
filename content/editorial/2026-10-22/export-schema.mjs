/** Gera somente dados estruturados para integração futura. Não publica. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = dirname(fileURLToPath(import.meta.url));
const [siteArgument, publicationArgument] = process.argv.slice(2);
if (!siteArgument || !publicationArgument) {
  throw new Error(
    'Informe a URL HTTPS real do site e a data ISO real da publicação.',
  );
}
const site = new URL(siteArgument);
if (
  site.protocol !== 'https:' ||
  /localhost|example\.(com|org)|appdeploy\.ai$/.test(site.hostname) ||
  site.hash ||
  site.search ||
  site.username ||
  site.password
) {
  throw new Error(
    'Use o domínio HTTPS definitivo, sem credenciais, hash ou parâmetros.',
  );
}
const published = new Date(publicationArgument);
if (Number.isNaN(published.valueOf()) || published > new Date()) {
  throw new Error(
    'Informe uma data de publicação válida, que não esteja no futuro.',
  );
}
const articles = JSON.parse(
  readFileSync(join(directory, 'articles.json'), 'utf8'),
);
const destination = join(directory, 'production-schema');
mkdirSync(destination, { recursive: true });
for (const article of articles) {
  const url = new URL(`/materia/${article.slug}`, site).href;
  const graph = [
    {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: article.title,
      description: article.description,
      inLanguage: 'pt-BR',
      mainEntityOfPage: url,
      datePublished: published.toISOString(),
      author: { '@type': 'Organization', name: article.author },
      publisher: {
        '@type': 'Organization',
        name: 'Patri Realty',
        url: site.origin,
      },
      image: { '@id': `${url}#image` },
      keywords: article.keywords,
      citation: article.sources.map((source) => source.url),
      about: article.geoEntities.map((entity) => ({
        '@type': 'Place',
        name: entity.name,
      })),
    },
    {
      '@type': 'ImageObject',
      '@id': `${url}#image`,
      contentUrl: article.image.url,
      caption: article.image.caption,
      creditText: `${article.image.photographer} / Wikimedia Commons`,
      creator: { '@type': 'Person', name: article.image.photographer },
      ...(article.image.licenseUrl
        ? { license: article.image.licenseUrl }
        : {}),
      acquireLicensePage: article.image.source,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: site.origin },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Matérias',
          item: new URL('/materias', site).href,
        },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    },
    {
      '@type': 'DefinedTermSet',
      name: `Verbetes: ${article.title}`,
      hasDefinedTerm: article.glossary.map((term) => ({
        '@type': 'DefinedTerm',
        name: term.term,
        description: term.definition,
      })),
    },
  ];
  if (article.slug === 'guia-michelin-hoteis-restaurantes-selecao') {
    graph.push({
      '@type': 'ItemList',
      name: 'Curadoria editorial sem ordem de preferência',
      itemListOrder: 'https://schema.org/ItemListUnordered',
      itemListElement: article.related.map((slug) => ({
        '@type': 'ListItem',
        item: new URL(`/materia/${slug}`, site).href,
      })),
    });
  }
  writeFileSync(
    join(destination, `${article.slug}.jsonld`),
    `${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)}\n`,
  );
}
console.log('12 JSON-LD gerados para integração. Não foram publicados.');
