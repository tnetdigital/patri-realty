import { it, expect } from 'vitest';
import {
  editorialAllowed,
  editorialHash,
  editorialProjection,
  articleMarkdown,
  parseEditorialReviews,
} from './editorial';
import type { Article } from '../features/content/model';
import { syntheticEditorialReview } from '../../tests/fixtures/editorial-review';
const article = () =>
  ({
    id: 'qa',
    slug: 'qa',
    titulo: 'Título sintético',
    resumo: 'Resposta inicial',
    autor: 'Redação QA',
    status: 'publicada',
    tipo: 'editorial',
    publicada_em: '2026-01-01T00:00:00Z',
    imagem_capa: '',
    corpo: [
      { tipo: 'paragrafo', texto: 'Conteúdo sintético; não é notícia real.' },
    ],
  }) as Article;
it('nega tudo sem aprovação real e recusa fixture no modo normal', async () => {
  const a = article(),
    r = await syntheticEditorialReview(a);
  expect(await editorialAllowed(a)).toBeNull();
  expect(await editorialAllowed(a, [r])).toBeNull();
  expect(await editorialAllowed(a, [r], Date.now(), true)).not.toBeNull();
});
it.each(['titulo', 'resumo', 'seo_titulo', 'autor', 'publicada_em'])(
  'mudança em %s invalida aprovação',
  async (key) => {
    const a = article(),
      r = await syntheticEditorialReview(a);
    const changed = {
      ...a,
      [key]: key === 'publicada_em' ? '2026-02-01T00:00:00Z' : 'Alterado',
    };
    expect(await editorialAllowed(changed, [r], Date.now(), true)).toBeNull();
  },
);
it.each(['pending', 'revoked'])('não aceita aprovação %s', async (status) => {
  const a = article(),
    r = await syntheticEditorialReview(a);
  r.approval.status = status as 'pending' | 'revoked';
  expect(await editorialAllowed(a, [r], Date.now(), true)).toBeNull();
});
it('fontes, mídia, metadados e checks integram o hash aprovado', async () => {
  const a = article();
  for (const change of [
    (r: Awaited<ReturnType<typeof syntheticEditorialReview>>) =>
      (r.sources[0].limit = 'alterado'),
    (r: Awaited<ReturnType<typeof syntheticEditorialReview>>) =>
      (r.metadata.imageAlt = 'alterado'),
    (r: Awaited<ReturnType<typeof syntheticEditorialReview>>) =>
      (r.checks.rightsConfirmed = false),
    (r: Awaited<ReturnType<typeof syntheticEditorialReview>>) =>
      r.media.push({
        url: 'https://example.com/qa.jpg',
        origin: 'https://example.com/origin',
        author: 'Sintético',
        license: 'QA',
        evidence: 'https://example.com/proof',
        conditions: 'Somente QA',
        credit: 'Crédito sintético',
        alt: 'Imagem sintética',
        allowed: true,
        sha256: '0'.repeat(64),
      }),
  ]) {
    const r = await syntheticEditorialReview(a);
    change(r);
    expect(await editorialAllowed(a, [r], Date.now(), true)).toBeNull();
  }
});
it('recusa fonte vencida, publicação futura e aprovador desconhecido', async () => {
  const a = article(),
    r = await syntheticEditorialReview(a);
  expect(
    await editorialAllowed(
      { ...a, publicada_em: '2999-01-01T00:00:00Z' },
      [r],
      Date.now(),
      true,
    ),
  ).toBeNull();
  r.approval.reviewer = 'Outro';
  expect(await editorialAllowed(a, [r], Date.now(), true)).toBeNull();
  r.approval.reviewer = 'Tércio';
  r.sources[0].expiresAt = '2020-01-01T00:00:00Z';
  const { approval, ...payload } = r;
  approval.hash = await editorialHash(payload);
  expect(await editorialAllowed(a, [r], Date.now(), true)).toBeNull();
});
it('capa sem prova de reprodução bloqueia a matéria', async () => {
  const a = { ...article(), imagem_capa: 'https://example.com/image.jpg' },
    r = await syntheticEditorialReview(a);
  expect(await editorialAllowed(a, [r], Date.now(), true)).toBeNull();
});
it('allowlist não expõe campos privados e parser recusa revisões duplicadas', async () => {
  const a = article(),
    r = await syntheticEditorialReview(a);
  expect(
    JSON.stringify(
      editorialProjection({ ...a, segredo: 'privado' } as Article),
    ),
  ).not.toContain('privado');
  expect(() => parseEditorialReviews([r, r])).toThrow();
});
it('Markdown mantém título, texto, autoria e fontes, escapando HTML', () => {
  const a = {
    ...article(),
    titulo: 'Título <script>',
    public_sources: [
      {
        url: 'https://example.com',
        claim: 'Afirmação',
        block: 0,
        limit: 'Limite',
        checkedAt: '2026-01-01T00:00:00Z',
      },
    ],
  };
  const md = articleMarkdown(a);
  expect(md).toContain('Autoria: Redação QA');
  expect(md).toContain('Conteúdo sintético');
  expect(md).toContain('https://example.com');
  expect(md).not.toContain('<script>');
});
