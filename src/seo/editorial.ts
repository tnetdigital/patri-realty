import { z } from 'zod';
import type { Article } from '../features/content/model';
const https = z
  .string()
  .url()
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === 'https:' && !u.username && !u.password && !u.hash;
    } catch {
      return false;
    }
  });
const source = z
  .object({
    url: https,
    checkedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    claim: z.string().min(3),
    block: z.number().int().min(0),
    limit: z.string().min(3),
  })
  .strict();
const media = z
  .object({
    url: https,
    origin: https,
    author: z.string().min(1),
    license: z.string().min(1),
    evidence: https,
    conditions: z.string().min(1),
    credit: z.string().min(1),
    alt: z.string().min(1),
    allowed: z.boolean(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const editorialReviewSchema = z
  .object({
    version: z.literal('patri-editorial-2026-10-22.09'),
    origin: z.enum(['real', 'fixture']),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    articleHash: z.string().regex(/^[a-f0-9]{64}$/),
    sources: z.array(source),
    media: z.array(media),
    metadata: z
      .object({ image: z.union([https, z.literal('')]), imageAlt: z.string() })
      .strict(),
    checks: z
      .object({
        materialClaimsReviewed: z.boolean(),
        authorshipConfirmed: z.boolean(),
        rightsConfirmed: z.boolean(),
        usefulAndDistinct: z.boolean(),
      })
      .strict(),
    approval: z
      .object({
        status: z.enum(['pending', 'approved', 'revoked']),
        reviewer: z.string().nullable(),
        approvedAt: z.string().datetime().nullable(),
        expiresAt: z.string().datetime().nullable(),
        hash: z.string().nullable(),
      })
      .strict(),
  })
  .strict();
export type EditorialReview = z.infer<typeof editorialReviewSchema>;
export function parseEditorialReviews(value: unknown) {
  const rows = z.array(editorialReviewSchema).parse(value);
  if (new Set(rows.map((r) => r.slug)).size !== rows.length)
    throw Error('Revisões duplicadas');
  return rows;
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, stable(v)]),
    );
  return value;
}
export async function editorialHash(value: unknown) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(stable(value))),
  );
  return [...new Uint8Array(digest)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
// Explicit projection: private fields returned by a future RPC never enter HTML/state.
export function editorialProjection(a: Article): Article {
  const result = Object.fromEntries(
    [
      'id',
      'titulo',
      'slug',
      'resumo',
      'corpo',
      'imagem_capa',
      'categoria_id',
      'tipo',
      'status',
      'publicada_em',
      'seo_titulo',
      'seo_descricao',
      'tempo_leitura',
      'atualizado_em',
      'categoria',
      'categoria_slug',
      'autor',
      'selo',
      'fornecedor',
    ]
      .filter((k) => Object.hasOwn(a, k))
      .map((k) => [k, a[k as keyof Article]]),
  ) as Article;
  result.corpo = (a.corpo || []).map((b) =>
    Object.fromEntries(
      ['tipo', 'texto', 'url', 'legenda', 'linhas']
        .filter((k) => Object.hasOwn(b, k))
        .map((k) => [k, b[k as keyof typeof b]]),
    ),
  ) as Article['corpo'];
  if (a.fornecedor)
    result.fornecedor = {
      nome: a.fornecedor.nome,
      slug: a.fornecedor.slug,
      descricao: a.fornecedor.descricao,
      logo: a.fornecedor.logo,
    };
  return result;
}
export async function editorialAllowed(
  a: Article,
  reviews: EditorialReview[] = [],
  now = Date.now(),
  fixtures = false,
) {
  if (
    a.status !== 'publicada' ||
    !a.publicada_em ||
    !Number.isFinite(Date.parse(a.publicada_em)) ||
    Date.parse(a.publicada_em) > now ||
    !a.autor?.trim() ||
    !Array.isArray(a.corpo)
  )
    return null;
  const payload = editorialProjection(a),
    ah = await editorialHash(payload);
  for (const r of reviews) {
    if (
      r.slug !== a.slug ||
      r.articleHash !== ah ||
      (!fixtures && r.origin !== 'real')
    )
      continue;
    if (
      !Object.values(r.checks).every(Boolean) ||
      r.approval.status !== 'approved' ||
      r.approval.reviewer !== 'Tércio' ||
      !r.approval.approvedAt ||
      Date.parse(r.approval.approvedAt) > now ||
      !r.approval.expiresAt ||
      Date.parse(r.approval.expiresAt) <= now
    )
      continue;
    const { approval: _approval, ...signed } = r;
    if (r.approval.hash !== (await editorialHash(signed))) continue;
    if (
      !r.sources.length ||
      r.sources.some(
        (s) =>
          Date.parse(s.checkedAt) > now ||
          Date.parse(s.expiresAt) <= now ||
          s.block >= a.corpo.length,
      )
    )
      continue;
    const images = [
      a.imagem_capa,
      ...a.corpo
        .filter((b) => b.tipo === 'imagem' || b.tipo === 'video')
        .map((b) => b.url || ''),
    ].filter(Boolean);
    if (images.some((url) => !r.media.some((m) => m.url === url && m.allowed)))
      continue;
    if (
      r.metadata.image &&
      (!r.metadata.imageAlt || !images.includes(r.metadata.image))
    )
      continue;
    if (
      a.corpo.some(
        (b) =>
          ['link', 'video', 'imagem'].includes(b.tipo) &&
          (!b.url || !https.safeParse(b.url).success),
      )
    )
      continue;
    return r;
  }
  return null;
}
export function articleMarkdown(a: Article) {
  const text = (s: string) => s.replace(/[\\`*_[\]<>#|]/g, (c) => '\\' + c);
  const target = (url: string) =>
    url.replace(/[\s()<>]/g, (c) => encodeURIComponent(c));
  const cover = a.imagem_capa
    ? '![' +
      text(
        a.media_credits?.find((m) => m.url === a.imagem_capa)?.alt || a.titulo,
      ) +
      '](' +
      target(a.imagem_capa) +
      ')'
    : '';
  const body = a.corpo.map((b) => {
    if (b.tipo === 'titulo') return '## ' + text(b.texto);
    if (b.tipo === 'lista')
      return b.texto
        .split('\n')
        .map((x) => '- ' + text(x))
        .join('\n');
    if (b.tipo === 'citacao') return '> ' + text(b.texto);
    if (b.tipo === 'imagem')
      return '![' + text(b.legenda || '') + '](' + target(b.url || '') + ')';
    if (b.tipo === 'link' || b.tipo === 'video')
      return (
        '[' + text(b.texto || 'Referência') + '](' + target(b.url || '') + ')'
      );
    if (b.tipo === 'tabela') {
      const rows = b.linhas || [];
      return (
        text(b.texto) +
        '\n' +
        rows
          .flatMap((r, i) => [
            r.map(text).join(' | '),
            ...(i === 0 ? [r.map(() => '---').join(' | ')] : []),
          ])
          .join('\n')
      );
    }
    return text(b.texto);
  });
  return (
    [
      '# ' + text(a.titulo),
      text(a.resumo),
      'Autoria: ' + text(a.autor || ''),
      'Publicado em: ' + a.publicada_em,
      a.tipo !== 'editorial' ? 'Conteúdo de marca' : '',
      cover,
      ...body,
      ...(a.public_sources || []).map(
        (s) =>
          text(s.claim) + ' — [' + text(s.limit) + '](' + target(s.url) + ')',
      ),
      ...(a.media_credits || []).map((m) => text(m.credit)),
    ]
      .filter(Boolean)
      .join('\n\n') + '\n'
  );
}
