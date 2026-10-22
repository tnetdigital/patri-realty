import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const tracked = execFileSync('git', ['ls-files', '--cached', '-z'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean);
if (
  tracked.some(
    (path) =>
      path.startsWith('content/editorial/') ||
      path === 'src/data/editorial-drafts.json' ||
      path === 'backend/private-preview.generated.ts',
  )
) {
  throw new Error(
    'Material de revisão não pode estar na árvore pública versionada.',
  );
}
async function walk(root) {
  return (await readdir(root, { withFileTypes: true })).flatMap((item) =>
    item.isDirectory() ? [root + '/' + item.name] : [],
  );
}
const dirs = ['src'];
for (let i = 0; i < dirs.length; i++) dirs.push(...(await walk(dirs[i])));
for (const dir of dirs) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    if (!file.isFile() || !/\.(ts|tsx|json)$/.test(file.name)) continue;
    const body = await readFile(dir + '/' + file.name, 'utf8');
    if (/import\s+.*editorial-drafts|from\s+['"].*private-preview/.test(body))
      throw new Error('Import público de fonte privada.');
  }
}
console.log('Árvore pública sem arquivos ou imports dos rascunhos.');
