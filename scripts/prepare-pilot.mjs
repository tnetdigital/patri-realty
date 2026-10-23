import { readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep, dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  editorialProjection,
  editorialHash,
  editorialReviewSchema,
} from '../src/seo/editorial.ts';
import {
  assessPilot,
  publicPilotProjection,
  emptyPilotChecks,
  emptyPilotCriteria,
  bytesHash,
  substantiveText,
  comparePilotTexts,
  PILOT_VERSION,
} from '../server/pilot.mjs';

// No environment/secrets, database, approval mutation, network or deployment.
const root = await realpath(process.cwd());
const privateSource = await realpath(
  resolve(process.argv[2] || '../patri-realty-private/prompt09'),
);
const privateOutput = resolve(
  process.argv[3] || '../patri-realty-private/prompt15',
);
const outside = (path) => {
  const rel = relative(root, path);
  return rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel);
};
if (!outside(privateSource) || !outside(privateOutput))
  throw Error('Private pilot material must stay outside public checkout');
await mkdir(privateOutput, { recursive: true });
if (!outside(await realpath(privateOutput)))
  throw Error('Private output resolves inside public checkout');
const now = new Date(),
  date = now.toISOString();
const evidenceIndex = [];
const source = async (id, file, visibility, scope) => {
  const bytes = await readFile(file);
  evidenceIndex.push({
    id,
    visibility,
    ref:
      visibility === 'private'
        ? relative(privateOutput, file)
        : relative(root, file).replaceAll('\\', '/'),
    sha256: bytesHash(bytes),
    checkedAt: date,
    scope,
  });
  return bytes;
};
await source(
  'matrix-pt05',
  resolve('docs/seo/matriz-mpi.csv'),
  'public',
  'Mapa de intenções; não aprovação ou prova de oferta.',
);
await source(
  'runtime-pt07',
  resolve('src/seo/national-pilot.ts'),
  'public',
  'Retenção nacional vigente; não removida pelo manifesto.',
);
await source(
  'editorial-summary-pt09',
  resolve('docs/seo/evidencias-prompt09/auditoria-resumo.json'),
  'public',
  'Auditoria anterior: três candidatas privadas sem aprovação.',
);
const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const baseRow = (id, family, path, intent) => ({
  id,
  matrixIds: [],
  family,
  path,
  intent,
  exposure: 'unconfirmed',
  contentHash: null,
  evidence: [],
  totalEligible: null,
  quality: { rubric: PILOT_VERSION, criteria: emptyPilotCriteria() },
  approval: {
    status: 'pending',
    origin: 'real',
    reviewer: null,
    versionHash: null,
    approvedAt: null,
    expiresAt: null,
  },
  publicNoindexJustification: null,
  checks: emptyPilotChecks(),
  canonicalPath: path,
  robotsExpectation: 'Sem liberação para indexação; prévia exige autenticação.',
  schemaExpectation: [],
  links: { required: [], approvedTargets: [], verified: false },
  cta: { kind: 'supplier-selection', target: null, verified: false },
  media: { count: null, state: 'pending', evidence: [] },
  blockers: [],
});
const items = [
  [
    'administracao-condominial',
    'MPI-001',
    'Comparar escopos e selecionar administradoras com oferta real e evidências.',
  ],
  [
    'portaria-remota',
    'MPI-003',
    'Comparar contingência e responsabilidades antes de selecionar portaria remota.',
  ],
  [
    'elevadores',
    'MPI-005',
    'Comparar inclusões e exclusões antes de selecionar manutenção de elevadores.',
  ],
].map(([slug, matrix, intent], i) => ({
  ...baseRow('NACIONAL-0' + (i + 1), 'national-guide', '/guia/' + slug, intent),
  matrixIds: [matrix],
  evidence: ['matrix-pt05', 'runtime-pt07'],
  robotsExpectation:
    'Noindex/fora do sitemap enquanto retido pelo PT07; resposta real depende do catálogo/backend.',
  schemaExpectation: [
    'Sem grafo enquanto noindex; CollectionPage/ItemList somente se futuramente elegível',
  ],
  links: { required: ['/guia'], approvedTargets: [], verified: false },
  blockers: ['real-offer-missing', 'national-brief-unapproved'],
}));
const names = JSON.parse(
  (
    await source(
      'private-inventory-pt09',
      join(privateSource, 'candidatos.json'),
      'private',
      'Inventário privado observado, sem criação ou aprovação de pautas.',
    )
  ).toString('utf8'),
);
if (
  !Array.isArray(names) ||
  names.length > 5 ||
  names.some(
    (x) => typeof x !== 'string' || !/^[a-z0-9-]+\.candidate\.json$/.test(x),
  )
)
  throw Error('Unexpected reviewed candidate inventory');
const documents = [];
const candidateAudit = [];
for (const [i, filename] of [...names].sort().entries()) {
  const name = filename.replace(/\.candidate\.json$/, '');
  const id = 'EDITORIAL-0' + (i + 1),
    file = join(privateSource, filename);
  const bytes = await source(
    'private-candidate-0' + (i + 1),
    file,
    'private',
    'Candidata PT09; apenas metadados e hashes no manifesto, original não alterado.',
  );
  const { article, review: raw } = JSON.parse(bytes.toString('utf8'));
  const review = editorialReviewSchema.parse(raw);
  if (article.slug !== name || review.slug !== name)
    throw Error('Candidate identity mismatch');
  const contentHash = await editorialHash(editorialProjection(article));
  candidateAudit.push({
    id,
    articleHashMatches: contentHash === review.articleHash,
    approvalStatus: review.approval.status,
    contentStatus: article.status,
    checks: review.checks,
    sourceCount: review.sources.length,
    mediaCount: review.media.length,
    sourceFileHash: bytesHash(bytes),
  });
  const row = baseRow(
    id,
    'article',
    '/materia/' + article.slug,
    'Informação editorial: ' + article.titulo,
  );
  Object.assign(row, {
    exposure: 'private',
    contentHash,
    evidence: ['editorial-summary-pt09', 'private-candidate-0' + (i + 1)],
    robotsExpectation:
      'Enquanto privada: 404/noindex,nofollow no público; na prévia, 401 sem autenticação.',
    schemaExpectation: [
      'Sem Article público antes de publicação e aprovação vigentes',
    ],
    cta: { kind: 'newsletter', target: null, verified: false },
    media: {
      count: review.media.length,
      state: 'pending',
      evidence: ['private-candidate-0' + (i + 1)],
    },
    blockers: [
      'editorial-review-pending',
      'authorship-and-rights-unconfirmed',
      ...(contentHash === review.articleHash
        ? []
        : ['source-version-mismatch']),
    ],
  });
  // Existing approval is observed, never promoted or written back. Pending remains pending.
  row.approval = {
    status: review.approval.status,
    origin: review.origin,
    reviewer: review.approval.reviewer,
    versionHash:
      review.approval.status === 'approved' ? review.articleHash : null,
    approvedAt: review.approval.approvedAt,
    expiresAt: review.approval.expiresAt,
  };
  items.push(row);
  documents.push({ id, text: substantiveText(article) });
}
const m = assessPilot(
  {
    version: PILOT_VERSION,
    sourceMode: 'real',
    preparedAt: date,
    baseCommit,
    origin: null,
    destination: { verified: false, evidence: [], validUntil: null },
    externalPublicationAuthorized: false,
    inventory: {
      suppliersVerified: false,
      supplierCount: null,
      localitiesVerified: false,
      localityCount: null,
    },
    evidenceIndex,
    items,
  },
  now,
);
// Private outputs never overwrite previous review material.
for (const [name, value] of [
  ['manifesto-piloto.json', m],
  ['auditoria-versoes.json', candidateAudit],
  [
    'similaridade-editorial.json',
    {
      method:
        'corpo-only, Unicode normalization, lexical 5-word shingles/Jaccard',
      thresholdForTriage: 0.65,
      humanOriginalityReview: 'pending',
      pairs: comparePilotTexts(documents),
    },
  ],
])
  await writeFile(
    join(privateOutput, name),
    JSON.stringify(value, null, 2) + '\n',
    { flag: 'wx' },
  );
const publicDir = resolve('docs/seo');
await mkdir(publicDir, { recursive: true });
await writeFile(
  join(publicDir, 'manifesto-piloto-pt15.json'),
  JSON.stringify(publicPilotProjection(m), null, 2) + '\n',
);
await mkdir(join(publicDir, 'evidencias-prompt15'), { recursive: true });
await writeFile(
  join(publicDir, 'evidencias-prompt15', 'similaridade-editorial-resumo.json'),
  JSON.stringify(
    {
      privateSource: true,
      rawTextPublished: false,
      method:
        'Corpo editorial sem layout, normalização Unicode, Jaccard de shingles de cinco palavras.',
      thresholdForTriage: 0.65,
      humanOriginalityReview: 'pending',
      pairs: comparePilotTexts(documents),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    {
      version: m.version,
      ...m.summary,
      privateAnnexWritten: true,
      approvalsChanged: false,
      networkRequests: 0,
    },
    null,
    2,
  ),
);
