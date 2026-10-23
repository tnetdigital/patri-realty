import { z } from 'zod';
import { validDay } from './metrics.ts';

const day = z.string().refine(validDay);
const timestamp = z.string().datetime({ offset: true });
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
const uuid = z.string().uuid();
const metricsBySource = {
  sitemap: ['listed'],
  submission: ['submitted'],
  'gsc-index': ['indexed'],
  'gsc-search': ['impressions', 'clicks'],
  'gsc-ai': ['impressions'],
  'bing-search': ['impressions', 'clicks'],
  'bing-ai': ['citations'],
  events: [
    'profile_views',
    'article_views',
    'contact_clicks',
    'quotation_receipts',
  ],
  operations: [
    'quotations_registered',
    'suppliers_registered',
    'suppliers_approved',
    'payments_confirmed',
    'revenue_cents',
  ],
} as const;
const source = z.enum([
  'sitemap',
  'submission',
  'gsc-index',
  'gsc-search',
  'gsc-ai',
  'bing-search',
  'bing-ai',
  'events',
  'operations',
]);
const metric = z.enum([
  'listed',
  'submitted',
  'indexed',
  'impressions',
  'clicks',
  'citations',
  'profile_views',
  'article_views',
  'contact_clicks',
  'quotation_receipts',
  'quotations_registered',
  'suppliers_registered',
  'suppliers_approved',
  'payments_confirmed',
  'revenue_cents',
]);
export const measurementInput = z
  .object({
    version: z.literal('patri-measurement-14.1'),
    mode: z.enum(['real', 'synthetic']),
    origin: z.string().url(),
    from: day,
    to: day,
    inventory: z
      .object({
        assessedAt: timestamp,
        evidenceId: slug,
        complete: z.boolean(),
        rows: z.array(
          z
            .object({
              url: z.string().url(),
              eligible: z.boolean(),
              audience: z.enum(['procura', 'aquisicao', 'leitores']),
              segment: slug.nullable(),
              supplier: uuid.nullable(),
              uf: z
                .string()
                .regex(/^[A-Z]{2}$/)
                .nullable(),
              city: slug.nullable(),
              cluster: slug.nullable(),
            })
            .strict(),
        ),
      })
      .strict(),
    sources: z.array(
      z
        .object({
          source,
          evidenceId: slug,
          extractedAt: timestamp,
          dataThrough: day.nullable(),
          collection: z.enum(['platform', 'consented', 'operational']),
          timezone: z.enum([
            'America/Sao_Paulo',
            'America/Los_Angeles',
            'UTC',
            'source-unspecified',
          ]),
          coverage: z.enum(['complete', 'partial']),
          rows: z.array(
            z
              .object({
                url: z.string().url(),
                date: day,
                metric,
                value: z
                  .number()
                  .int()
                  .nonnegative()
                  .max(Number.MAX_SAFE_INTEGER),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();
export type MeasurementInput = z.infer<typeof measurementInput>;
type SourceName = MeasurementInput['sources'][number]['source'];

function family(path: string) {
  if (/^\/fornecedor\//.test(path)) return 'perfil';
  if (/^\/materia\//.test(path)) return 'materia';
  if (/^\/guia\/[^/]+\/[a-z]{2}\//.test(path)) return 'guia-local';
  if (/^\/guia\/[^/]+$/.test(path)) return 'guia-nacional';
  return 'hub-institucional';
}

export function reconcileMeasurement(raw: unknown, now = new Date()) {
  const input = measurementInput.parse(raw);
  const origin = new URL(input.origin);
  if (
    origin.origin !== input.origin ||
    origin.protocol !== 'https:' ||
    (input.mode === 'real' &&
      /^(localhost|127\.0\.0\.1)$/.test(origin.hostname))
  )
    throw Error('Invalid measurement origin');
  if (
    input.mode === 'real' &&
    /(?:^|\.)(?:appdeploy\.ai|vercel\.app|example|invalid)$/.test(
      origin.hostname,
    )
  )
    throw Error(
      'Preview or fixture origins are not real measurement properties',
    );
  if (input.from > input.to || input.to > now.toISOString().slice(0, 10))
    throw Error('Invalid measurement period');
  const checkTime = (value: string) => {
    if (Date.parse(value) > now.getTime())
      throw Error('Future provenance timestamp');
  };
  checkTime(input.inventory.assessedAt);
  const safeUrl = (value: string) => {
    const u = new URL(value);
    if (
      u.origin !== input.origin ||
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      u.href !== value ||
      !/^\/(?:$|guia(?:\/[a-z0-9-]+(?:\/[a-z]{2}\/[a-z0-9-]+)?)?$|fornecedor\/[a-z0-9-]+$|materia\/[a-z0-9-]+$|materias(?:\/[a-z0-9-]+)?$|revista(?:\/[a-z0-9-]+)?$|sobre-o-projeto$|para-fornecedores$|termos$|privacidade$|contato$|contrato-fornecedor$)/.test(
        u.pathname,
      )
    )
      throw Error(
        'Only public canonical URLs without query or tokens are accepted',
      );
  };
  const inventory = new Map<
    string,
    MeasurementInput['inventory']['rows'][number]
  >();
  for (const row of input.inventory.rows) {
    safeUrl(row.url);
    if (row.city && !row.uf) throw Error('City dimension requires UF');
    const existing = inventory.get(row.url);
    if (existing && JSON.stringify(existing) !== JSON.stringify(row))
      throw Error('Conflicting inventory dimensions');
    inventory.set(row.url, row);
  }
  const provenance: Omit<MeasurementInput['sources'][number], 'rows'>[] = [];
  const observations = new Map<
    string,
    {
      source: SourceName;
      url: string;
      date: string;
      metric: string;
      value: number;
    }
  >();
  let duplicates = 0,
    outsideInventory = 0;
  const seenEvidence = new Set<string>();
  const sourceZones = new Map<SourceName, string>();
  for (const batch of input.sources) {
    if (
      sourceZones.has(batch.source) &&
      sourceZones.get(batch.source) !== batch.timezone
    )
      throw Error('Mixed timezones for the same source');
    sourceZones.set(batch.source, batch.timezone);
    if (
      ['gsc-search', 'gsc-ai'].includes(batch.source) &&
      batch.timezone !== 'America/Los_Angeles'
    )
      throw Error('GSC traffic requires Pacific date boundaries');
    if (
      batch.collection !==
      (batch.source === 'events'
        ? 'consented'
        : batch.source === 'operations'
          ? 'operational'
          : 'platform')
    )
      throw Error('Invalid collection basis');
    checkTime(batch.extractedAt);
    if (
      batch.dataThrough &&
      (batch.dataThrough > input.to ||
        batch.dataThrough > batch.extractedAt.slice(0, 10))
    )
      throw Error('Invalid source data-through date');
    const evidenceKey = batch.source + ':' + batch.evidenceId;
    if (seenEvidence.has(evidenceKey))
      throw Error('Repeated evidence identifier');
    seenEvidence.add(evidenceKey);
    const { rows, ...meta } = batch;
    provenance.push(meta);
    for (const row of rows) {
      safeUrl(row.url);
      if (
        row.date < input.from ||
        row.date > input.to ||
        !batch.dataThrough ||
        row.date > batch.dataThrough
      )
        throw Error('Row outside declared period/freshness');
      if (
        !(metricsBySource[batch.source] as readonly string[]).includes(
          row.metric,
        )
      )
        throw Error('Metric not supported by declared source');
      if (
        ['listed', 'submitted', 'indexed'].includes(row.metric) &&
        row.value > 1
      )
        throw Error('URL snapshot is a boolean observation');
      if (!inventory.has(row.url)) {
        outsideInventory++;
        continue;
      }
      const key = [batch.source, row.url, row.date, row.metric].join('|');
      const existing = observations.get(key);
      if (existing) {
        if (existing.value !== row.value)
          throw Error('Conflicting overlapping observations');
        duplicates++;
      } else observations.set(key, { ...row, source: batch.source });
    }
  }
  const rows = [...observations.values()];
  const eligible = [...inventory.values()].filter((r) => r.eligible);
  const grouped = (selected: typeof eligible) => {
    const urls = new Set(selected.map((r) => r.url));
    const visible = rows.filter((r) => urls.has(r.url));
    const observedUrls = (s: SourceName, m: string) => {
      const values = visible.filter((r) => r.source === s && r.metric === m);
      if (!values.length) return null;
      // Snapshot changes must not be unioned over time: use latest observation per URL.
      const latest = new Map<string, (typeof values)[number]>();
      for (const r of values)
        if (!latest.has(r.url) || latest.get(r.url)!.date < r.date)
          latest.set(r.url, r);
      return [...latest.values()].filter((r) => r.value > 0).length;
    };
    const positiveUrls = (s: SourceName, m: string) =>
      visible.some((r) => r.source === s && r.metric === m)
        ? new Set(
            visible
              .filter((r) => r.source === s && r.metric === m && r.value > 0)
              .map((r) => r.url),
          ).size
        : null;
    const totals = Object.fromEntries(
      Object.entries(metricsBySource).map(([s, metrics]) => [
        s,
        Object.fromEntries(
          metrics.map((m) => {
            if (['listed', 'submitted', 'indexed'].includes(m))
              return [m, observedUrls(s as SourceName, m)];
            const values = visible.filter(
              (r) => r.source === s && r.metric === m,
            );
            const total = values.reduce((sum, r) => sum + r.value, 0);
            if (!Number.isSafeInteger(total)) throw Error('Unsafe aggregate');
            return [m, values.length ? total : null];
          }),
        ),
      ]),
    );
    return {
      eligibleUrls: urls.size,
      listedUrls: observedUrls('sitemap', 'listed'),
      submittedUrls: observedUrls('submission', 'submitted'),
      googleIndexedUrls: observedUrls('gsc-index', 'indexed'),
      googleImpressionUrls: positiveUrls('gsc-search', 'impressions'),
      googleClickUrls: positiveUrls('gsc-search', 'clicks'),
      quotationUrls: positiveUrls('operations', 'quotations_registered'),
      totals,
    };
  };
  const groupBy = (
    key: 'family' | 'segment' | 'supplier' | 'uf' | 'city' | 'cluster',
  ) => {
    const groups = new Map<string, typeof eligible>();
    for (const row of eligible) {
      const value =
        key === 'family'
          ? family(new URL(row.url).pathname)
          : key === 'city' && row.city
            ? row.uf!.toLowerCase() + '/' + row.city
            : row[key] || '__unavailable__';
      groups.set(value, [...(groups.get(value) || []), row]);
    }
    return Object.fromEntries(
      [...groups].map(([key, group]) => [key, grouped(group)]),
    );
  };
  return {
    version: input.version,
    mode: input.mode,
    generatedAt: now.toISOString(),
    origin: input.origin,
    period: { from: input.from, to: input.to },
    inventory: {
      assessedAt: input.inventory.assessedAt,
      evidenceId: input.inventory.evidenceId,
      complete: input.inventory.complete,
    },
    provenance,
    quality: {
      duplicatesRemoved: duplicates,
      outsideInventoryRows: outsideInventory,
      ineligibleRows: rows.filter((r) => !inventory.get(r.url)?.eligible)
        .length,
    },
    interpretation:
      'Observed counts within the current eligible cohort; null means unavailable. Partial exports are lower bounds. Source timezones remain distinct. URL association is not attribution or proof of causality. Revenue is confirmed operational revenue, not revenue attributed to SEO.',
    overall: grouped(eligible),
    audiences: Object.fromEntries(
      ['procura', 'aquisicao', 'leitores'].map((a) => [
        a,
        grouped(eligible.filter((r) => r.audience === a)),
      ]),
    ),
    dimensions: Object.fromEntries(
      ['family', 'segment', 'supplier', 'uf', 'city', 'cluster'].map((d) => [
        d,
        groupBy(d as Parameters<typeof groupBy>[0]),
      ]),
    ),
  };
}
