import { it, expect } from 'vitest';
import { localFixture } from '../../tests/fixtures/local-eligibility';
import {
  evaluateLocalEligibility,
  reviewFingerprint,
  parseLocalReviews,
  freshEligibility,
  QUALITY_WEIGHTS,
} from './eligibility';
import { decideSeo } from './policy';
const live = { source: 'live' as const, siteUrl: 'https://patri.example' };
it('permite preparar revisão pendente sem inventar aprovador ou data de aceite', async () => {
  const f = await localFixture(reviewFingerprint);
  f.review.approval = {
    status: 'pending',
    reviewer: null,
    approvedAt: null,
    expiresAt: null,
    hash: null,
  };
  expect(parseLocalReviews([f.review])).toHaveLength(1);
  expect(await reviewFingerprint(f.review)).toHaveLength(64);
  const gate = await evaluateLocalEligibility({ ...f, source: 'live' });
  expect(gate.indexable).toBe(false);
  expect(gate.content).toBe(null);
  expect(gate.evidence).toEqual([]);
});
it.each([0, 1, 2, 3])(
  'gate municipal com %i identidades distintas',
  async (count) => {
    const fixture = await localFixture(reviewFingerprint, count);
    const gate = await evaluateLocalEligibility({ ...fixture, source: 'live' });
    expect(gate.eligibleSuppliers).toBe(count);
    expect(gate.indexable).toBe(count >= 3);
    expect(
      decideSeo('/guia/teste/sp/cidade-teste', {
        ...live,
        localEligibility: gate,
      }).noindex,
    ).toBe(count < 3);
  },
);
it('duplicatas de perfil não aumentam contagem', async () => {
  const f = await localFixture(reviewFingerprint, 2);
  f.suppliers.push(f.suppliers[0], f.suppliers[1]);
  expect(
    (await evaluateLocalEligibility({ ...f, source: 'live' }))
      .eligibleSuppliers,
  ).toBe(2);
});
it.each(['demo', 'fixture'])(
  'dados %s não contam como oferta real',
  async (mode) => {
    const f = await localFixture(reviewFingerprint);
    if (mode === 'fixture') f.review.origin = 'fixture';
    f.review.approval.hash = await reviewFingerprint(f.review);
    const gate = await evaluateLocalEligibility({
      ...f,
      source: mode === 'demo' ? 'demo' : 'live',
    });
    expect(gate.eligibleSuppliers).toBe(0);
    expect(gate.indexable).toBe(false);
  },
);
it('provas conflitantes para a mesma identidade não aumentam contagem', async () => {
  const f = await localFixture(reviewFingerprint);
  f.review.supplierProofs.push({
    ...f.review.supplierProofs[0],
    businessKey: 'another-identity',
  });
  f.review.approval.hash = await reviewFingerprint(f.review);
  expect(
    (await evaluateLocalEligibility({ ...f, source: 'live' }))
      .eligibleSuppliers,
  ).toBe(2);
});
it('filiais da mesma identidade econômica não viram três fornecedores', async () => {
  const f = await localFixture(reviewFingerprint);
  f.review.supplierProofs.forEach((p) => (p.businessKey = 'same-business'));
  f.review.approval.hash = await reviewFingerprint(f.review);
  expect(
    (await evaluateLocalEligibility({ ...f, source: 'live' }))
      .eligibleSuppliers,
  ).toBe(1);
});
it.each([
  'segment',
  'state-only',
  'municipality',
  'suspended',
  'updated',
  'expired',
  'not-real',
])('exclui oferta não comprovada: %s', async (mode) => {
  const f = await localFixture(reviewFingerprint);
  if (mode === 'segment') f.suppliers[0].segmentos = [];
  if (mode === 'state-only')
    f.suppliers[0].cobertura[0].cidade_id = null as unknown as string;
  if (mode === 'municipality') f.suppliers[0].cobertura[0].cidade_id = 'other';
  if (mode === 'suspended') f.suppliers.shift(); // A suspended supplier disappears from the fresh public projection.
  if (mode === 'updated')
    f.suppliers[0].atualizado_em = new Date(f.now - 1000).toISOString();
  if (mode === 'expired')
    f.review.supplierProofs[0].expiresAt = new Date(f.now - 1).toISOString();
  if (mode === 'not-real') f.review.supplierProofs[0].real = false;
  f.review.approval.hash = await reviewFingerprint(f.review);
  const gate = await evaluateLocalEligibility({ ...f, source: 'live' });
  expect(gate.eligibleSuppliers).toBe(2);
  expect(gate.indexable).toBe(false);
});
it.each([59, 60, 74, 75, 89, 90, 100])(
  'aplica score revisado %i sem confundir nota com evidência',
  async (score) => {
    const f = await localFixture(reviewFingerprint);
    let rest = score;
    for (const [key, max] of Object.entries(QUALITY_WEIGHTS)) {
      f.review.criteria[key as keyof typeof QUALITY_WEIGHTS].points = Math.min(
        rest,
        max,
      );
      rest -= Math.min(rest, max);
    }
    f.review.approval.hash = await reviewFingerprint(f.review);
    const gate = await evaluateLocalEligibility({ ...f, source: 'live' });
    expect(gate.score).toBe(score);
    expect(gate.indexable).toBe(score >= 75);
    expect(!!gate.content).toBe(score >= 60);
  },
);
it.each([
  'utility',
  'rights',
  'cta',
  'approval',
  'content-change',
  'fixture',
  'demo',
  'other-city',
  'expired-review',
])('nota 100 não compensa bloqueio absoluto %s', async (mode) => {
  const f = await localFixture(reviewFingerprint);
  if (mode === 'utility') f.review.checks.uniqueUseful = false;
  if (mode === 'rights') f.review.checks.rights = false;
  if (mode === 'cta') f.review.checks.ctaFunctional = false;
  if (mode === 'fixture') f.review.origin = 'fixture';
  if (mode === 'approval') f.review.approval.status = 'revoked';
  if (mode === 'expired-review')
    f.review.approval.expiresAt = new Date(f.now - 1).toISOString();
  if (mode === 'other-city') f.location = { ...f.location, city: 'other-city' };
  f.review.approval.hash = await reviewFingerprint(f.review);
  if (mode === 'content-change')
    f.review.content.context += ' editado depois do aceite';
  const gate = await evaluateLocalEligibility({
    ...f,
    source: mode === 'demo' ? 'demo' : 'live',
  });
  expect(gate.indexable).toBe(false);
  if (mode !== 'other-city') expect(gate.content).toBe(null);
});
it('ausência de evidência é desconhecido, não zero oferta nem nota fabricada', async () => {
  const f = await localFixture(reviewFingerprint);
  const gate = await evaluateLocalEligibility({
    source: 'live',
    location: f.location,
    suppliers: f.suppliers,
  });
  expect(gate.score).toBe(null);
  expect(gate.confidence).toBe('unknown');
  expect(gate.indexable).toBe(false);
});
it('rejeita revisão malformada e duplicada', async () => {
  const f = await localFixture(reviewFingerprint);
  expect(() => parseLocalReviews([{ ...f.review, version: 'old' }])).toThrow();
  expect(() => parseLocalReviews([f.review, f.review])).toThrow();
});
it('score inválido, expiração e decisão de outra cidade nunca abrem indexação', async () => {
  const f = await localFixture(reviewFingerprint);
  let gate = await evaluateLocalEligibility({ ...f, source: 'live' });
  expect(freshEligibility(gate, gate.recheckAt)).toBe(false);
  expect(
    decideSeo('/guia/teste/sp/outra', { ...live, localEligibility: gate })
      .noindex,
  ).toBe(true);
  f.review.criteria.utility.points = 21;
  f.review.approval.hash = await reviewFingerprint(f.review);
  gate = await evaluateLocalEligibility({ ...f, source: 'live' });
  expect(gate.score).toBe(null);
  expect(gate.indexable).toBe(false);
});
