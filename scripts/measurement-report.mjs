import { readFile } from 'node:fs/promises';
import { reconcileMeasurement } from '../src/features/measurement/reconcile.ts';
import { writePrivateMeasurement } from './measurement-files.mjs';
try {
  const [input, output] = process.argv.slice(2);
  if (!input || !output)
    throw Error(
      'Usage: npm run report:measurement -- INPUT.json OUTPUT.json (outside repository)',
    );
  const parsed = JSON.parse(await readFile(input, 'utf8'));
  const report = reconcileMeasurement(parsed.version ? parsed : parsed.input);
  await writePrivateMeasurement(output, report);
  console.log(
    'Measurement report written; inspect source coverage and provenance before interpreting.',
  );
} catch {
  console.error(
    'Measurement report failed: check the documented input contract, dates, conflicts and output location. No private values are logged.',
  );
  process.exitCode = 1;
}
