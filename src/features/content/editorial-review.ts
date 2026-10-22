// Only types and a protected loader belong in the public application.
export type EditorialArticle = {
  slug: string;
  category: string;
  title: string;
  seoTitle: string;
  description: string;
  answer: string;
  sections: { heading: string; paragraphs: string[] }[];
  faq: { question: string; answer: string }[];
  glossary: { term: string; definition: string }[];
  sources: { label: string; url: string }[];
  keywords: string[];
  socialCaption: string;
  status: string;
  author: string;
  verifiedAt: string;
  related: string[];
  intent: string;
  geoEntities: { name: string; country: string }[];
  image: {
    url: string;
    source: string;
    alt: string;
    caption: string;
    photographer: string;
    license: string;
    licenseUrl?: string;
    originalDate: string;
    changes: string;
  };
};

declare global {
  interface Window {
    __PATRI_EDITORIAL_REVIEW__?: EditorialArticle[];
  }
}

export async function loadEditorialReview(signal: AbortSignal) {
  if (window.__PATRI_EDITORIAL_REVIEW__) {
    return window.__PATRI_EDITORIAL_REVIEW__;
  }
  const response = await fetch('/api/editorial-review', {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });
  if (!response.ok)
    throw new Error('A revisão exige acesso à prévia protegida.');
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Revisão editorial indisponível.');
  return data as EditorialArticle[];
}
