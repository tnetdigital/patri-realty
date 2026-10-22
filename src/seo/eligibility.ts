import { z } from 'zod';
import type { PublicSupplier, Filters } from '../features/directory/model';

export const QUALITY_VERSION = 'patri-local-2026-10-22.04';
export const QUALITY_WEIGHTS = {
  utility: 20,
  differentiation: 20,
  accuracy: 15,
  editorial: 10,
  technical: 10,
  interlinking: 10,
  conversion: 10,
  media: 5,
} as const;
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const reference = z
  .string()
  .url()
  .refine((value) => {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.search &&
      !u.hash
    );
  }, 'Use uma referência pública HTTPS, sem credenciais.');
const date = z.string().datetime({ offset: true });
const criterion = z.object({
  points: z.number().int().nonnegative(),
  evidence: z.array(reference).min(1).max(10),
});
export const localReviewSchema = z.object({
  version: z.literal(QUALITY_VERSION),
  origin: z.enum(['real', 'fixture']),
  revision: z.string().min(1).max(100),
  location: z.object({
    segment: slug,
    uf: z.string().regex(/^[A-Z]{2}$/),
    city: slug,
    cityId: z.string().min(1).max(80),
  }),
  content: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(350),
    intro: z.string().min(1).max(10000),
    context: z.string().min(1).max(10000),
    checklist: z.array(z.string().min(1).max(2000)).min(1).max(20),
  }),
  criteria: z.object({
    utility: criterion,
    differentiation: criterion,
    accuracy: criterion,
    editorial: criterion,
    technical: criterion,
    interlinking: criterion,
    conversion: criterion,
    media: criterion,
  }),
  checks: z.object({
    uniqueUseful: z.boolean(),
    truthful: z.boolean(),
    rights: z.boolean(),
    technical: z.boolean(),
    ctaFunctional: z.boolean(),
    publicExposure: z.boolean(),
  }),
  supplierProofs: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        slug,
        businessKey: z.string().trim().min(1).max(100),
        real: z.boolean(),
        reference,
        municipalReference: reference,
        profileVersion: date,
        verifiedAt: date,
        expiresAt: date,
      }),
    )
    .max(50),
  approval: z.object({
    status: z.enum(['approved', 'pending', 'revoked']),
    reviewer: z.string().trim().min(1).max(120).nullable(),
    approvedAt: date.nullable(),
    expiresAt: date.nullable(),
    hash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
  }),
});
export type LocalReview = z.infer<typeof localReviewSchema>;
export type LocalLocation = LocalReview['location'];
export type LocalEligibility = {
  location: Pick<LocalLocation, 'segment' | 'uf' | 'city'>;
  version: string;
  indexable: boolean;
  reasons: string[];
  blockers: string[];
  eligibleSuppliers: number;
  eligibleIds: string[];
  evidence: string[];
  score: number | null;
  confidence: 'verified' | 'unknown';
  evaluatedAt: number;
  recheckAt: number;
  fallback: string;
  outcome:
    | 'blocked'
    | 'private-draft'
    | 'public-noindex'
    | 'publish'
    | 'anchor-candidate';
  content: LocalReview['content'] | null;
};
export function parseLocalReviews(value: unknown): LocalReview[] {
  const parsed = z.array(localReviewSchema).max(50).parse(value);
  const seen = new Set<string>();
  for (const review of parsed) {
    const key = locationKey(review.location);
    if (seen.has(key)) throw Error('Revisão local duplicada.');
    seen.add(key);
  }
  return parsed;
}
export const locationKey = (
  x: Pick<LocalLocation, 'segment' | 'uf' | 'city'>,
) => [x.segment, x.uf, x.city].join('/');
export function localLocation(
  f: Filters,
): Pick<LocalLocation, 'segment' | 'uf' | 'city'> | null {
  return f.segmento && !f.segmento.includes(',') && f.uf && f.cidade
    ? { segment: f.segmento, uf: f.uf, city: f.cidade }
    : null;
}
export async function reviewFingerprint(review: LocalReview): Promise<string> {
  const { approval: _approval, ...payload } = localReviewSchema.parse(review);
  const hash = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return [...new Uint8Array(hash)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
const current = (start: string | null, end: string | null, now: number) =>
  typeof start === 'string' &&
  typeof end === 'string' &&
  Number.isFinite(Date.parse(start)) &&
  Date.parse(start) <= now &&
  Date.parse(end) > now &&
  Date.parse(end) > Date.parse(start);
export const freshEligibility = (
  gate: LocalEligibility | undefined,
  now = Date.now(),
) =>
  gate?.indexable === true &&
  gate.version === QUALITY_VERSION &&
  gate.eligibleSuppliers >= 3 &&
  typeof gate.score === 'number' &&
  gate.score >= 75 &&
  gate.blockers?.length === 0 &&
  gate.evaluatedAt <= now &&
  gate.recheckAt > now;

// A human supplies evidence-backed ratings; this computes neither editorial quality nor approval.
export async function evaluateLocalEligibility(input: {
  source: 'live' | 'demo';
  location: Pick<LocalLocation, 'segment' | 'uf' | 'city'>;
  review?: LocalReview;
  suppliers: PublicSupplier[];
  now?: number;
}): Promise<LocalEligibility> {
  const now = input.now ?? Date.now(),
    blocks = new Set<string>(),
    evidence = new Set<string>();
  const fallback = '/guia/' + encodeURIComponent(input.location.segment);
  let score: number | null = null,
    displayContent: LocalReview['content'] | null = null;
  let recheckAt = now + 15000;
  const businesses = new Set<string>(),
    ids = new Set<string>(),
    eligibleIds: string[] = [];
  const review = input.review;
  if (input.source !== 'live') blocks.add('demonstration');
  if (!review) blocks.add('review-missing');
  let approved = false;
  if (review) {
    const valid = localReviewSchema.safeParse(review);
    if (!valid.success) blocks.add('review-invalid');
    else {
      if (review.origin !== 'real') blocks.add('fixture');
      if (locationKey(review.location) !== locationKey(input.location))
        blocks.add('location-mismatch');
      let ratingsValid = true,
        total = 0;
      for (const [key, max] of Object.entries(QUALITY_WEIGHTS)) {
        const rating = review.criteria[key as keyof typeof QUALITY_WEIGHTS];
        if (rating.points > max) ratingsValid = false;
        total += rating.points;
        rating.evidence.forEach((ref) => evidence.add(ref));
      }
      if (ratingsValid) score = total;
      else blocks.add('ratings-invalid');
      if (Object.values(review.checks).some((value) => !value))
        blocks.add('absolute-quality-block');
      approved =
        review.approval.status === 'approved' &&
        !!review.approval.reviewer &&
        current(review.approval.approvedAt, review.approval.expiresAt, now) &&
        review.approval.hash === (await reviewFingerprint(review));
      if (!approved) blocks.add('approval-missing-stale-or-revoked');
      if (review.approval.expiresAt)
        recheckAt = Math.min(recheckAt, Date.parse(review.approval.expiresAt));
      const proofIds = new Set<string>();
      const duplicatedIds = new Set<string>();
      for (const proof of review.supplierProofs) {
        if (proofIds.has(proof.id)) duplicatedIds.add(proof.id);
        proofIds.add(proof.id);
      }
      for (const supplier of input.suppliers) {
        if (
          input.source !== 'live' ||
          review.origin !== 'real' ||
          locationKey(review.location) !== locationKey(input.location)
        )
          continue;
        if (ids.has(supplier.id)) continue;
        ids.add(supplier.id);
        const proof = review.supplierProofs.find(
          (p) => p.id === supplier.id && p.slug === supplier.slug,
        );
        if (
          !proof ||
          duplicatedIds.has(supplier.id) ||
          !proof.real ||
          !current(proof.verifiedAt, proof.expiresAt, now) ||
          Date.parse(proof.profileVersion) > Date.parse(proof.verifiedAt) ||
          proof.profileVersion !== supplier.atualizado_em ||
          !supplier.segmentos.some((s) => s.slug === input.location.segment) ||
          !supplier.cobertura.some(
            (c) =>
              c.uf === input.location.uf &&
              c.cidade_id === review.location.cityId &&
              c.cidade_slug === input.location.city,
          )
        )
          continue;
        // Distinct legal/economic identity, not a new count for another profile or branch.
        const businessKey = proof.businessKey.trim().toLowerCase();
        if (businesses.has(businessKey)) continue;
        businesses.add(businessKey);
        eligibleIds.push(supplier.id);
        evidence.add(proof.reference);
        evidence.add(proof.municipalReference);
        recheckAt = Math.min(recheckAt, Date.parse(proof.expiresAt));
      }
      if (
        input.source === 'live' &&
        locationKey(review.location) === locationKey(input.location) &&
        approved &&
        review.origin === 'real' &&
        review.checks.publicExposure &&
        review.checks.rights &&
        Object.values(review.checks).every(Boolean) &&
        score !== null &&
        score >= 60
      )
        displayContent = review.content;
    }
  }
  if (eligibleIds.length < 3)
    blocks.add('fewer-than-three-confirmed-suppliers');
  if (score === null || score < 75) blocks.add('quality-below-75-or-unknown');
  const indexable = blocks.size === 0;
  return {
    location: input.location,
    version: QUALITY_VERSION,
    indexable,
    blockers: [...blocks],
    reasons: [...blocks],
    eligibleSuppliers: eligibleIds.length,
    eligibleIds,
    evidence: approved && review?.checks.publicExposure ? [...evidence] : [],
    score,
    confidence:
      review && approved && eligibleIds.length >= 3 ? 'verified' : 'unknown',
    evaluatedAt: now,
    recheckAt: Math.max(now, recheckAt),
    fallback,
    outcome: indexable
      ? score! >= 90
        ? 'anchor-candidate'
        : 'publish'
      : displayContent
        ? 'public-noindex'
        : score !== null && score < 60
          ? 'blocked'
          : 'private-draft',
    content: displayContent,
  };
}
