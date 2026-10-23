import { readFile } from 'node:fs/promises';
import {
  measurementInput,
  reconcileMeasurement,
} from '../src/features/measurement/reconcile.ts';
import { writePrivateMeasurement } from './measurement-files.mjs';

// Read operations only: Sites.list and SearchAnalytics.query, never sitemap submit.
export async function exportGsc(
  input,
  { property, token, fetcher = fetch, now = new Date() },
) {
  reconcileMeasurement(input, now);
  const parsed = measurementInput.parse(input);
  if (!property || !token) throw Error('Missing private GSC configuration');
  const headers = {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  };
  const request = async (url, options = {}) => {
    const res = await fetcher(url, {
      ...options,
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw Error('GSC read unavailable');
    return res.json();
  };
  const sites = await request('https://www.googleapis.com/webmasters/v3/sites');
  if (
    !sites.siteEntry?.some(
      (s) =>
        s.siteUrl === property &&
        ['siteOwner', 'siteFullUser', 'siteRestrictedUser'].includes(
          s.permissionLevel,
        ),
    )
  )
    throw Error('Requested property not accessible');
  const host = new URL(parsed.origin).hostname;
  if (property.startsWith('sc-domain:')) {
    const domain = property.slice(10);
    if (!domain || !(host === domain || host.endsWith('.' + domain)))
      throw Error('Property origin mismatch');
  } else if (property !== parsed.origin + '/')
    throw Error('Use the exact origin URL-prefix property');
  const urls = new Set(
    parsed.inventory.rows.filter((r) => r.eligible).map((r) => r.url),
  );
  const rows = [];
  let omitted = 0,
    pages = 0,
    exhausted = false;
  // Explicit budget. Even exhaustion does not overcome Search Console internal top-row limits.
  for (let startRow = 0; startRow < 100000; startRow += 25000) {
    const data = await request(
      'https://www.googleapis.com/webmasters/v3/sites/' +
        encodeURIComponent(property) +
        '/searchAnalytics/query',
      {
        method: 'POST',
        body: JSON.stringify({
          startDate: parsed.from,
          endDate: parsed.to,
          dimensions: ['date', 'page'],
          type: 'web',
          dataState: 'final',
          rowLimit: 25000,
          startRow,
        }),
      },
    );
    if (data.rows !== undefined && !Array.isArray(data.rows))
      throw Error('Invalid GSC response');
    const page = data.rows || [];
    pages++;
    for (const r of page) {
      if (!Array.isArray(r.keys) || r.keys.length !== 2)
        throw Error('Unexpected GSC dimensions');
      const [date, url] = r.keys;
      if (!urls.has(url)) {
        omitted++;
        continue;
      }
      for (const metric of ['impressions', 'clicks']) {
        if (!Number.isSafeInteger(r[metric]) || r[metric] < 0)
          throw Error('Invalid GSC count');
        rows.push({ url, date, metric, value: r[metric] });
      }
    }
    if (page.length < 25000) {
      exhausted = true;
      break;
    }
  }
  const dates = rows.map((r) => r.date).sort();
  const batch = {
    source: 'gsc-search',
    evidenceId: 'gsc-web-' + now.toISOString().slice(0, 10),
    collection: 'platform',
    extractedAt: now.toISOString(),
    dataThrough: dates.at(-1) || null,
    timezone: 'America/Los_Angeles',
    coverage: 'partial',
    rows,
  };
  const result = {
    ...parsed,
    sources: [
      ...parsed.sources.filter((s) => s.source !== 'gsc-search'),
      batch,
    ],
  };
  reconcileMeasurement(result, now);
  return {
    input: result,
    audit: {
      pages,
      exhausted,
      budgetReached: !exhausted,
      omittedRows: omitted,
      coverage: 'partial',
      note: 'Search Analytics has internal top-row limits; web totals may overlap generative AI reports. No queries, raw referrers, position or credentials exported.',
    },
  };
}

if (process.argv[1]?.endsWith('gsc-read.mjs')) {
  try {
    const [inputFile, output, ...flags] = process.argv.slice(2);
    if (!inputFile || !output) throw Error('Missing paths');
    const input = measurementInput.parse(
      JSON.parse(await readFile(inputFile, 'utf8')),
    );
    reconcileMeasurement(input);
    const read = flags.includes('--read');
    const result = read
      ? await exportGsc(input, {
          property: process.env.PATRI_GSC_PROPERTY,
          token: process.env.PATRI_GSC_ACCESS_TOKEN,
        })
      : {
          mode: 'plan-only',
          origin: input.origin,
          period: { from: input.from, to: input.to },
          operations: [
            'GET Sites.list; verify exact selected property',
            'POST SearchAnalytics.query (read-only); date/page; web; final; 25000 rows/page; 4 pages maximum',
          ],
          requiredScope: 'https://www.googleapis.com/auth/webmasters.readonly',
          note: 'No request sent. Set private environment variables and use --read only with authorized account access. AI reports and inclusion controls require separate account inspection; no undocumented API inferred.',
        };
    await writePrivateMeasurement(output, result);
    console.log(
      read
        ? 'Read-only GSC export written privately.'
        : 'GSC read plan written; no external request sent.',
    );
  } catch {
    console.error(
      'GSC preparation/read failed. Verify private configuration, property, input and new output path. Credentials and API response bodies are not logged.',
    );
    process.exitCode = 1;
  }
}
