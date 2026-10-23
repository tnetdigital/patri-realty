import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assessPilot,
  reassessPilot,
  publicPilotProjection,
  pilotWeights,
  substantiveText,
  comparePilotTexts,
} from '../server/pilot.mjs';
const published = JSON.parse(
  await readFile(resolve('docs/seo/manifesto-piloto-pt15.json'), 'utf8'),
);
// Self-contained synthetic negative tests: no private files or approvals required.
const seed = structuredClone(published);
delete seed.redacted;
delete seed.privateAnnexRequired;
delete seed.summary;
seed.sourceMode = 'synthetic';
seed.preparedAt = '2026-01-01T00:00:00Z';
seed.evidenceIndex = seed.evidenceIndex.map((e) => ({
  ...e,
  ref: e.ref || 'synthetic-private-reference',
}));
for (const row of seed.items) {
  delete row.decision;
  delete row.canonical;
  delete row.quality.score;
  if (row.exposure === 'private') {
    row.path = '/materia/synthetic-' + row.id.toLowerCase();
    row.canonicalPath = row.path;
    row.evidence = ['editorial-summary-pt09'];
    row.media.evidence = ['editorial-summary-pt09'];
    row.approval.origin = 'fixture';
  }
}
const m = assessPilot(seed);
const input = () => {
  const d = structuredClone(m);
  delete d.summary;
  for (const row of d.items) {
    delete row.decision;
    delete row.canonical;
    delete row.quality.score;
  }
  return d;
};
test('published preparation and synthetic reconstruction have no approved launch destinations', () => {
  const d = reassessPilot(m);
  assert.equal(published.summary.ready, 0);
  assert.equal(d.summary.ready, 0);
  assert.equal(d.summary.blocked, 3);
  assert.equal(d.summary.privateDrafts, 3);
  assert.equal(d.inventory.supplierCount, null);
  assert.equal(d.summary.publicationExecuted, false);
});
test('private publication copy cannot serve as authoritative manifest', () =>
  assert.throws(() => reassessPilot(publicPilotProjection(m)), /full private/));
test('derived ready labels are recomputed rather than trusted', () => {
  const d = structuredClone(m);
  d.items[0].decision = 'pronta';
  d.summary.ready = 6;
  assert.equal(reassessPilot(d).summary.ready, 0);
});
test('unassessed quality remains null rather than zero or default 75', () =>
  assert(m.items.every((x) => x.quality.score === null)));
test('rubric has 100 possible internal points', () =>
  assert.equal(
    Object.values(pilotWeights).reduce((a, b) => a + b, 0),
    100,
  ));
test('points without evidence never produce a quality score', () => {
  const d = input();
  for (const key of Object.keys(pilotWeights))
    d.items[0].quality.criteria[key].points = pilotWeights[key];
  assert.equal(assessPilot(d).items[0].quality.score, null);
});
test('points cannot exceed their criterion weight', () => {
  const d = input();
  d.items[0].quality.criteria.utility.points = 21;
  assert.throws(() => assessPilot(d));
});
test('technical checks do not fabricate score or approval', () => {
  const d = input();
  for (const c of Object.values(d.items[0].checks)) {
    c.state = 'passed';
    c.evidence = ['matrix-pt05'];
  }
  const row = assessPilot(d).items[0];
  assert.equal(row.decision, 'bloqueada');
  assert.equal(row.quality.score, null);
  assert.equal(row.approval.status, 'pending');
});
test('synthetic artifacts cannot become real approval', () => {
  const d = input();
  d.sourceMode = 'synthetic';
  assert(
    assessPilot(d).items.every((x) =>
      x.blockers.includes('synthetic-not-publishable'),
    ),
  );
});
test('runtime retained national routes stay blocked', () =>
  assert(
    m.items
      .filter((x) => x.family === 'national-guide')
      .every((x) => x.blockers.includes('national-runtime-retained')),
  ));
test('duplicate URLs and identities fail closed', () => {
  const d = input();
  d.items.push(structuredClone(d.items[0]));
  assert.throws(() => assessPilot(d), /Duplicate/);
});
test('incorrect canonical or family rejected', () => {
  const d = input();
  d.items[0].canonicalPath = '/guia/outro';
  assert.throws(() => assessPilot(d), /Canonical/);
  d.items[0].canonicalPath = d.items[0].path;
  d.items[0].family = 'profile';
  assert.throws(() => assessPilot(d), /family/);
});
test('origin cannot contain credentials, paths or query tokens', () => {
  for (const origin of [
    'https://user:secret@patri.example',
    'https://patri.example/path',
    'https://patri.example?token=private',
  ]) {
    const d = input();
    d.origin = origin;
    assert.throws(() => assessPilot(d));
  }
});
test('evidence references must resolve', () => {
  const d = input();
  d.items[0].evidence = ['invented-proof'];
  assert.throws(() => assessPilot(d), /Unresolved/);
});
test('this preparation contract cannot authorize external publication', () => {
  const d = input();
  d.externalPublicationAuthorized = true;
  assert.throws(() => assessPilot(d));
});
test('private projection does not leak names, paths, hashes, sources or a canary', () => {
  const d = structuredClone(m);
  const r = d.items.find((x) => x.exposure === 'private');
  r.intent = 'PRIVATE-CANARY';
  r.path = '/materia/private-secret';
  r.contentHash = 'c'.repeat(64);
  const p = publicPilotProjection(d);
  const json = JSON.stringify(p);
  assert(!json.includes('PRIVATE-CANARY'));
  assert(!json.includes('private-secret'));
  assert(!json.includes('c'.repeat(64)));
  assert(
    p.evidenceIndex
      .filter((x) => x.visibility === 'private')
      .every((x) => x.ref === null && x.sha256 === null),
  );
});
test('source body excludes layout and SEO fields from similarity', () => {
  const text = substantiveText({
    titulo: 'hidden-title',
    nav: 'hidden-nav',
    seo_descricao: 'hidden-meta',
    corpo: [
      {
        tipo: 'paragrafo',
        texto: 'Texto útil real',
        url: 'https://hidden.test',
      },
      { tipo: 'tabela', linhas: [['Critério', 'Escopo']] },
    ],
  });
  assert(!text.includes('hidden'));
  assert(text.includes('texto util real criterio escopo'));
});
test('identical body with changed city is flagged for review, never auto-approved', () => {
  const text = Array.from({ length: 40 }, (_, i) => 'palavra' + i).join(' ');
  const pair = comparePilotTexts([
    { id: 'A', text: text + ' cidade a' },
    { id: 'B', text: text + ' cidade b' },
  ])[0];
  assert(pair.reviewRequired);
  assert(pair.jaccard5 > 0.8);
  assert(!Object.hasOwn(pair, 'originalityApproved'));
});
test('too-short or empty content is insufficient evidence of uniqueness', () =>
  assert(
    comparePilotTexts([
      { id: 'A', text: '' },
      { id: 'B', text: 'curto' },
    ])[0].reviewRequired,
  ));
