import { realpath, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, basename } from 'node:path';
// Real exports stay outside the public checkout. Parent must already exist.
export async function writePrivateMeasurement(path, value) {
  const parent = await realpath(dirname(resolve(path)));
  const root = await realpath(process.cwd());
  const rel = relative(root, parent);
  if (!(
    rel === '..' ||
    rel.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) ||
    isAbsolute(rel)
  ))
    throw Error('Use an output directory outside the repository');
  const target = resolve(parent, basename(path));
  // No overwrite or following symlinks to an existing destination.
  await writeFile(target, JSON.stringify(value, null, 2) + '\n', {
    encoding: 'utf8',
    flag: 'wx',
  });
}
