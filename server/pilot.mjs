import { createHash } from 'node:crypto';
import { z } from 'zod';
import { QUALITY_WEIGHTS } from '../src/seo/eligibility.ts';
import { nationalPilotBlocked } from '../src/seo/national-pilot.ts';

export const PILOT_VERSION = 'patri-pilot-15.1';
export const pilotWeights = QUALITY_WEIGHTS;
export const pilotChecks = [
  'content',
  'facts',
  'entities',
  'rights',
  'http',
  'hydration',
  'metadata',
  'sitemap',
  'links',
  'mobile',
  'media',
  'conversion',
  'runtimeEligibility',
  'backendExposure',
  'observability',
  'rollback',
];
const id = z.string().regex(/^[a-z0-9-]+$/i);
const hash = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .nullable();
const state = z.enum(['passed', 'failed', 'not-run', 'not-applicable']);
const stamp = z.string().datetime({ offset: true });
const scoreCriteria = z
  .object(
    Object.fromEntries(
      Object.entries(pilotWeights).map(([key, max]) => [
        key,
        z
          .object({
            points: z.number().int().min(0).max(max).nullable(),
            evidence: z.array(id),
          })
          .strict(),
      ]),
    ),
  )
  .strict();
const checkMap = z
  .object(
    Object.fromEntries(
      pilotChecks.map((key) => [
        key,
        z.object({ state, evidence: z.array(id) }).strict(),
      ]),
    ),
  )
  .strict();
export const pilotSchema = z
  .object({
    version: z.literal(PILOT_VERSION),
    sourceMode: z.enum(['real', 'synthetic']),
    preparedAt: stamp,
    baseCommit: z.string().regex(/^[a-f0-9]{40}$/),
    origin: z
      .string()
      .url()
      .refine((value) => {
        try {
          const u = new URL(value);
          return (
            u.protocol === 'https:' &&
            u.origin === value &&
            !u.username &&
            !u.password
          );
        } catch {
          return false;
        }
      }, 'Use only an HTTPS origin without credentials, path, query or fragment')
      .nullable(),
    destination: z
      .object({
        verified: z.boolean(),
        evidence: z.array(id),
        validUntil: stamp.nullable(),
      })
      .strict(),
    externalPublicationAuthorized: z.literal(false),
    inventory: z
      .object({
        suppliersVerified: z.boolean(),
        supplierCount: z.number().int().nonnegative().nullable(),
        localitiesVerified: z.boolean(),
        localityCount: z.number().int().nonnegative().nullable(),
      })
      .strict(),
    evidenceIndex: z.array(
      z
        .object({
          id,
          visibility: z.enum(['public', 'private']),
          ref: z.string(),
          sha256: hash,
          checkedAt: stamp,
          scope: z.string(),
        })
        .strict(),
    ),
    items: z
      .array(
        z
          .object({
            id,
            matrixIds: z.array(id),
            family: z.enum([
              'national-guide',
              'profile',
              'article',
              'local-guide',
            ]),
            path: z
              .string()
              .regex(
                /^\/(guia|fornecedor|materia)\/[a-z0-9-]+(?:\/[a-z]{2}\/[a-z0-9-]+)?$/,
              ),
            intent: z.string().min(10),
            exposure: z.enum(['private', 'unconfirmed', 'public-verified']),
            contentHash: hash,
            evidence: z.array(id),
            totalEligible: z.number().int().nonnegative().nullable(),
            quality: z
              .object({
                rubric: z.literal(PILOT_VERSION),
                criteria: scoreCriteria,
              })
              .strict(),
            approval: z
              .object({
                status: z.enum(['pending', 'approved', 'revoked']),
                origin: z.enum(['real', 'fixture']),
                reviewer: z.string().nullable(),
                versionHash: hash,
                approvedAt: stamp.nullable(),
                expiresAt: stamp.nullable(),
              })
              .strict(),
            publicNoindexJustification: z.string().nullable(),
            checks: checkMap,
            canonicalPath: z.string(),
            robotsExpectation: z.string(),
            schemaExpectation: z.array(z.string()),
            links: z
              .object({
                required: z.array(z.string()),
                approvedTargets: z.array(z.string()),
                verified: z.boolean(),
              })
              .strict(),
            cta: z
              .object({
                kind: z.enum(['supplier-selection', 'quotation', 'newsletter']),
                target: z.string().nullable(),
                verified: z.boolean(),
              })
              .strict(),
            media: z
              .object({
                count: z.number().int().nonnegative().nullable(),
                state: z.enum(['pending', 'verified', 'not-required']),
                evidence: z.array(id),
              })
              .strict(),
            blockers: z.array(id),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();

export const emptyPilotCriteria = () =>
  Object.fromEntries(
    Object.keys(pilotWeights).map((key) => [
      key,
      { points: null, evidence: [] },
    ]),
  );
export const emptyPilotChecks = () =>
  Object.fromEntries(
    pilotChecks.map((key) => [key, { state: 'not-run', evidence: [] }]),
  );
export const bytesHash = (value) =>
  createHash('sha256').update(value).digest('hex');

export function reassessPilot(manifest, now = new Date()) {
  if (manifest.redacted || manifest.privateAnnexRequired)
    throw Error(
      'Use the full private manifest, never the redacted publication copy',
    );
  const raw = structuredClone(manifest);
  delete raw.summary;
  raw.items = raw.items.map((row) => {
    delete row.decision;
    delete row.canonical;
    delete row.quality.score;
    return row;
  });
  return assessPilot(raw, now);
}

// Offline preflight only. A manifest never changes SSR, an approval file or a deployment.
export function assessPilot(raw, now = new Date()) {
  const m = pilotSchema.parse(raw);
  if (Date.parse(m.preparedAt) > now.getTime())
    throw Error('Future preparation timestamp');
  const seen = new Set();
  const evidenceIds = new Set(m.evidenceIndex.map((x) => x.id));
  if (evidenceIds.size !== m.evidenceIndex.length)
    throw Error('Duplicate evidence identity');
  for (const ref of m.destination.evidence)
    if (!evidenceIds.has(ref)) throw Error('Unresolved destination evidence');
  const items = m.items.map((row) => {
    if (seen.has(row.id) || seen.has(row.path))
      throw Error('Duplicate pilot identity or URL');
    seen.add(row.id);
    seen.add(row.path);
    if (row.canonicalPath !== row.path) throw Error('Canonical path mismatch');
    const routePatterns = {
      'national-guide': /^\/guia\/[a-z0-9-]+$/,
      profile: /^\/fornecedor\/[a-z0-9-]+$/,
      article: /^\/materia\/[a-z0-9-]+$/,
      'local-guide': /^\/guia\/[a-z0-9-]+\/[a-z]{2}\/[a-z0-9-]+$/,
    };
    if (!routePatterns[row.family].test(row.path))
      throw Error('Route family mismatch');
    for (const ref of [
      ...row.evidence,
      ...row.media.evidence,
      ...Object.values(row.checks).flatMap((c) => c.evidence),
      ...Object.values(row.quality.criteria).flatMap((c) => c.evidence),
    ])
      if (!evidenceIds.has(ref)) throw Error('Unresolved evidence reference');
    const values = Object.values(row.quality.criteria);
    const score = values.every(
      (c) => c.points !== null && c.evidence.length > 0,
    )
      ? values.reduce((sum, c) => sum + c.points, 0)
      : null;
    const blockers = [...row.blockers];
    if (m.sourceMode !== 'real' || row.approval.origin !== 'real')
      blockers.push('synthetic-not-publishable');
    const origin = m.origin && new URL(m.origin);
    if (
      !origin ||
      origin.protocol !== 'https:' ||
      origin.origin !== m.origin ||
      /(?:^|\.)(?:localhost|example|invalid|test|appdeploy\.ai|vercel\.app)$/.test(
        origin.hostname,
      ) ||
      /^127\.|^\[/.test(origin.hostname)
    )
      blockers.push('canonical-origin-unverified');
    if (
      !m.destination.verified ||
      !m.destination.evidence.length ||
      !m.destination.validUntil ||
      Date.parse(m.destination.validUntil) <= now.getTime()
    )
      blockers.push('destination-unverified');
    if (
      !row.contentHash ||
      row.approval.status !== 'approved' ||
      row.approval.reviewer !== 'Tércio' ||
      row.approval.versionHash !== row.contentHash ||
      !row.approval.approvedAt ||
      Date.parse(row.approval.approvedAt) > now.getTime() ||
      !row.approval.expiresAt ||
      Date.parse(row.approval.expiresAt) <= now.getTime()
    )
      blockers.push('approval-missing-or-stale');
    if (score === null) blockers.push('quality-not-assessed');
    else if (score < 75) blockers.push('quality-below-indexing-baseline');
    for (const name of pilotChecks) {
      const c = row.checks[name];
      if (c.state !== 'passed' || !c.evidence.length)
        blockers.push('qa-' + name);
    }
    if (!row.evidence.length) blockers.push('evidence-missing');
    if (!row.links.verified || !row.cta.verified)
      blockers.push('links-or-cta-unverified');
    if (
      row.media.state === 'pending' ||
      (row.media.state === 'verified' && !row.media.evidence.length)
    )
      blockers.push('media-unverified');
    if (
      row.family === 'national-guide' &&
      (row.totalEligible === null || row.totalEligible < 1)
    )
      blockers.push('real-offer-unverified');
    if (row.family !== 'article' && !m.inventory.suppliersVerified)
      blockers.push('supplier-inventory-unverified');
    if (row.family === 'local-guide' && !m.inventory.localitiesVerified)
      blockers.push('municipal-evidence-unverified');
    if (
      row.family === 'local-guide' &&
      (row.totalEligible === null || row.totalEligible < 3)
    )
      blockers.push('municipal-minimum-not-proven');
    // These exact routes are still retained by the runtime approved in PT07.
    if (nationalPilotBlocked(row.path))
      blockers.push('national-runtime-retained');
    let decision =
      row.exposure === 'private'
        ? 'rascunho-privado'
        : blockers.length
          ? 'bloqueada'
          : 'pronta';
    if (
      decision === 'bloqueada' &&
      row.exposure === 'public-verified' &&
      row.publicNoindexJustification &&
      score !== null &&
      score >= 60 &&
      score < 75 &&
      blockers.every((b) => b === 'quality-below-indexing-baseline')
    )
      decision = 'noindex-publica-justificada';
    return {
      ...row,
      quality: { ...row.quality, score },
      decision,
      blockers: [...new Set(blockers)],
      canonical: m.origin ? m.origin + row.path : null,
    };
  });
  return {
    ...m,
    items,
    summary: {
      candidates: items.length,
      ready: items.filter((x) => x.decision === 'pronta').length,
      publicNoindex: items.filter(
        (x) => x.decision === 'noindex-publica-justificada',
      ).length,
      privateDrafts: items.filter((x) => x.decision === 'rascunho-privado')
        .length,
      blocked: items.filter((x) => x.decision === 'bloqueada').length,
      publicationExecuted: false,
    },
  };
}

export function publicPilotProjection(assessed) {
  const items = assessed.items.map((row) =>
    row.exposure !== 'private'
      ? row
      : {
          id: row.id,
          matrixIds: row.matrixIds,
          family: row.family,
          path: null,
          intent:
            'Retomar candidata editorial privada do PT09, após revisão factual, de autoria e direitos.',
          exposure: 'private',
          contentHash: null,
          evidence: ['private-pt15-annex'],
          totalEligible: null,
          quality: {
            rubric: PILOT_VERSION,
            criteria: emptyPilotCriteria(),
            score: null,
          },
          approval: {
            status: row.approval.status,
            origin: row.approval.origin,
            reviewer: null,
            versionHash: null,
            approvedAt: null,
            expiresAt: null,
          },
          publicNoindexJustification: null,
          checks: emptyPilotChecks(),
          canonicalPath: null,
          robotsExpectation:
            'Enquanto não aprovada: 404/noindex no público; prévia exige autenticação.',
          schemaExpectation: ['Sem grafo público enquanto privada'],
          links: { required: [], approvedTargets: [], verified: false },
          cta: { kind: 'newsletter', target: null, verified: false },
          media: {
            count: row.media.count,
            state: 'pending',
            evidence: ['private-pt15-annex'],
          },
          blockers: row.blockers,
          decision: 'rascunho-privado',
          canonical: null,
        },
  );
  return {
    ...assessed,
    redacted: true,
    privateAnnexRequired: true,
    evidenceIndex: assessed.evidenceIndex.map((e) =>
      e.visibility === 'public'
        ? e
        : {
            id: e.id,
            visibility: 'private',
            ref: null,
            sha256: null,
            checkedAt: e.checkedAt,
            scope: 'Referência restrita disponível no anexo privado PT15.',
          },
    ),
    items,
  };
}

export function substantiveText(article) {
  const pieces = [];
  const visit = (value) => {
    if (typeof value === 'string') pieces.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object')
      for (const key of ['texto', 'titulo', 'pergunta', 'resposta', 'linhas'])
        if (key in value) visit(value[key]);
  };
  // Source body only: no global header, navigation, footer, author/card or SEO fields.
  visit(article.corpo || []);
  return pieces
    .join(' ')
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function comparePilotTexts(docs) {
  const shingle = (text) => {
    const words = text.split(/\s+/).filter(Boolean);
    return {
      words: words.length,
      grams: new Set(
        Array.from({ length: Math.max(0, words.length - 4) }, (_, i) =>
          words.slice(i, i + 5).join(' '),
        ),
      ),
    };
  };
  const rows = docs.map((d) => ({ id: d.id, ...shingle(d.text) }));
  const pairs = [];
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i],
        b = rows[j];
      const intersection = [...a.grams].filter((x) => b.grams.has(x)).length;
      const union = new Set([...a.grams, ...b.grams]).size;
      const similarity = union ? intersection / union : null;
      pairs.push({
        left: a.id,
        right: b.id,
        leftWords: a.words,
        rightWords: b.words,
        jaccard5:
          similarity === null ? null : Math.round(similarity * 10000) / 10000,
        reviewRequired: similarity === null || similarity >= 0.65,
        interpretation:
          'Triagem lexical interna; não comprova originalidade, utilidade ou aprovação humana.',
      });
    }
  return pairs;
}
