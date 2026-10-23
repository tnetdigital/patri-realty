import { readFile, writeFile, realpath, mkdir } from 'node:fs/promises';
import { relative, isAbsolute, dirname, join, sep } from 'node:path';
import {
  editorialProjection,
  editorialHash,
  editorialReviewSchema,
} from '../src/seo/editorial.ts';
const input = process.argv[2];
if (!input || !isAbsolute(input))
  throw Error('Informe o caminho absoluto de um candidato privado.');
const file = await realpath(input),
  root = await realpath(process.cwd()),
  within = relative(root, file);
if (
  !within ||
  (!(within === '..' || within.startsWith('..' + sep)) && !isAbsolute(within))
)
  throw Error('O candidato deve ficar fora do repositório.');
const candidate = JSON.parse(await readFile(file, 'utf8'));
const review = editorialReviewSchema.parse(candidate.review);
const articleHash = await editorialHash(editorialProjection(candidate.article));
if (process.argv.includes('--prepare')) {
  if (review.approval.status !== 'pending')
    throw Error('Não sobrescrever aprovação ou revogação; crie outra revisão.');
  review.articleHash = articleHash;
  review.approval = {
    status: 'pending',
    reviewer: null,
    approvedAt: null,
    expiresAt: null,
    hash: null,
  };
  candidate.review = review;
  const history = join(dirname(file), 'history');
  await mkdir(history, { recursive: true });
  await writeFile(
    join(history, Date.now() + '-' + articleHash + '.json'),
    JSON.stringify(candidate, null, 2),
    { flag: 'wx' },
  );
  await writeFile(file, JSON.stringify(candidate, null, 2));
}
const { approval: _approval, ...payload } = candidate.review;
console.log(
  JSON.stringify(
    {
      slug: review.slug,
      articleHash,
      reviewHash: await editorialHash(payload),
      status: review.approval.status,
      approvalGranted: false,
    },
    null,
    2,
  ),
);
