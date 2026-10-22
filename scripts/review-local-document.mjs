import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import {
  parseLocalReviews,
  reviewFingerprint,
} from '../dist-server/entry-server.js';
const file = process.argv[2];
if (!file || !isAbsolute(file))
  throw Error('Informe o caminho absoluto do documento privado de revisão.');
const reviews = parseLocalReviews(JSON.parse(await readFile(file, 'utf8')));
const rows = await Promise.all(
  reviews.map(async (review) => ({
    location: review.location,
    revision: review.revision,
    version: review.version,
    approvalStatus: review.approval.status,
    calculatedHash: await reviewFingerprint(review),
    matchesApprovedVersion:
      review.approval.hash === (await reviewFingerprint(review)),
  })),
);
console.log(
  JSON.stringify(
    {
      note: 'Este comando não aprova conteúdo nem altera o arquivo. O hash vincula a versão; não autentica o revisor.',
      reviews: rows,
    },
    null,
    2,
  ),
);
