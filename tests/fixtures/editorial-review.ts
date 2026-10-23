// Test-only simulated approval. Never use this as evidence or in production.
import {
  editorialHash,
  editorialProjection,
  type EditorialReview,
} from '../../src/seo/editorial.ts';
import type { Article } from '../../src/features/content/model.ts';
export async function syntheticEditorialReview(
  a: Article,
): Promise<EditorialReview> {
  const now = Date.now();
  if (!a.corpo.length)
    a.corpo = [
      {
        tipo: 'paragrafo',
        texto: 'Conteúdo exclusivamente sintético para QA.',
      },
    ];
  const r: EditorialReview = {
    version: 'patri-editorial-2026-10-22.09',
    origin: 'fixture',
    slug: a.slug,
    articleHash: await editorialHash(editorialProjection(a)),
    sources: [
      {
        url: 'https://example.com/synthetic-source',
        claim: 'Afirmação sintética',
        block: 0,
        checkedAt: new Date(now - 60000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
        limit: 'Somente transporte sintético; não é apuração real.',
      },
    ],
    media: [],
    metadata: { image: '', imageAlt: '' },
    checks: {
      materialClaimsReviewed: true,
      authorshipConfirmed: true,
      rightsConfirmed: true,
      usefulAndDistinct: true,
    },
    approval: {
      status: 'approved',
      reviewer: 'Tércio',
      approvedAt: new Date(now - 60000).toISOString(),
      expiresAt: new Date(now + 86400000).toISOString(),
      hash: null,
    },
  };
  const { approval: _approval, ...signed } = r;
  r.approval.hash = await editorialHash(signed);
  return r;
}
