import { describe, it, expect, vi } from 'vitest';
import { today, previousMonth } from '../growth/model';
import {
  metricValue,
  metricWindow,
  parseMetrics,
  dailyCsv,
  parseEditorialMetrics,
} from './metrics';
import { reconcileMeasurement } from './reconcile';
import { measurementFixture } from '../../../tests/fixtures/measurement';
const from = '2026-10-01',
  to = '2026-10-20',
  now = new Date('2026-10-23T10:00:00Z');
const valid = () => ({
  bloqueado: false,
  atual: { visualizacao_perfil: 0 },
  anterior: { visualizacao_perfil: 10 },
  diario: [{ dia: to, tipo: 'visualizacao_perfil', quantidade: 0 }],
});
describe('measurement contract', () => {
  it('normalizes editorial counts and never uses a time proxy with zero openings', () => {
    const id = '11000000-0000-4000-8000-000000000001';
    const p = parseEditorialMetrics({
      items: [
        {
          id,
          titulo: 'Synthetic',
          leituras: 0,
          cliques_perfil: 0,
          tempo_medio_segundos: 120,
          private: 'hidden',
        },
      ],
      total: 1,
    });
    expect(p.items[0]).toMatchObject({
      aberturas: 0,
      cliques_perfil: 0,
      atividade_por_abertura: null,
    });
    expect(JSON.stringify(p)).not.toMatch(/tempo_medio|private/);
    expect(() =>
      parseEditorialMetrics({
        items: [{ id, titulo: 'Synthetic', leituras: -1 }],
        total: 1,
      }),
    ).toThrow();
  });
  it('uses the aggregation timezone at the UTC day boundary', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-23T01:00:00Z'));
      expect(today()).toBe('2026-10-22');
      expect(previousMonth()).toBe('2026-09-23');
    } finally {
      vi.useRealTimers();
    }
  });
  it('distinguishes missing data and explicit zero', () => {
    expect(metricValue({}, 'visualizacao_perfil')).toBeNull();
    expect(metricValue({ visualizacao_perfil: 0 }, 'visualizacao_perfil')).toBe(
      0,
    );
    expect(metricValue({ secret: 4 }, 'secret')).toBeNull();
  });
  it.each(['2026-02-30', '2026-13-01', '2026-10-2', 'email@example.com'])(
    'rejects invalid dates %s',
    (date) => expect(metricWindow(date, to)).toBe(false),
  );
  it('rejects inverted and excessive windows', () => {
    expect(metricWindow(to, from)).toBe(false);
    expect(metricWindow('2025-01-01', to)).toBe(false);
  });
  it('preserves zero and deduplicates daily observations', () => {
    const d = valid();
    d.diario.push(d.diario[0]);
    const p = parseMetrics(d, from, to);
    expect(p.diario).toHaveLength(1);
    expect(p.atual?.visualizacao_perfil).toBe(0);
    expect(p.queda_visitas).toBe(-100);
  });
  it('does not infer decline from absent counters', () =>
    expect(
      parseMetrics({ ...valid(), atual: {}, queda_visitas: -100 }, from, to)
        .queda_visitas,
    ).toBeNull());
  it.each([-1, NaN, 1.1, Number.MAX_SAFE_INTEGER + 1])(
    'rejects unsafe counts %s',
    (n) =>
      expect(() =>
        parseMetrics(
          { ...valid(), atual: { visualizacao_perfil: n } },
          from,
          to,
        ),
      ).toThrow(),
  );
  it('does not leak extra response fields', () => {
    const p = parseMetrics(
      {
        ...valid(),
        email: 'private',
        atualizado_em: '2026-10-20T10:00:00Z',
        atual: { visualizacao_perfil: 1, unknown: 2 },
      },
      from,
      to,
    );
    expect(JSON.stringify(p)).not.toMatch(/private|unknown|atualizado_em/);
  });
  it('rejects conflicting daily duplicates and mismatched periods', () => {
    const d = valid();
    d.diario.push({ ...d.diario[0], quantidade: 1 });
    expect(() => parseMetrics(d, from, to)).toThrow();
    expect(() => parseMetrics({ ...valid(), de: to }, from, to)).toThrow();
  });
  it('locked responses disclose no metrics', () =>
    expect(
      parseMetrics({ ...valid(), bloqueado: true }, from, to).atual,
    ).toBeNull());
  it('CSV contains no free text or formulas', () =>
    expect(
      dailyCsv([
        { dia: to, tipo: '=IMPORTXML("x")', quantidade: 1 },
        ...valid().diario,
      ]),
    ).toBe('\uFEFFdata;evento;quantidade\n2026-10-20;visualizacao_perfil;0'));
});
describe('cross-source reconciliation', () => {
  it('never merges incompatible timezone boundaries for a source', () => {
    const d = measurementFixture();
    d.sources.push({
      ...d.sources[0],
      evidenceId: 'another-export',
      timezone: 'America/Sao_Paulo',
    });
    expect(() => reconcileMeasurement(d, now)).toThrow('timezones');
    const g = measurementFixture();
    g.sources[1].timezone = 'UTC';
    expect(() => reconcileMeasurement(g, now)).toThrow('Pacific');
  });
  it('requires UF for city dimensions and refuses preview origins as real', () => {
    const d = measurementFixture();
    d.inventory.rows[0].city = 'cidade-teste';
    d.inventory.rows[0].uf = null;
    expect(() => reconcileMeasurement(d, now)).toThrow('UF');
    const other = measurementFixture();
    other.mode = 'real';
    expect(() => reconcileMeasurement(other, now)).toThrow('fixture');
  });
  it('keeps listing, submission, indexation and conversion denominators distinct', () => {
    const p = reconcileMeasurement(measurementFixture(), now);
    expect(p.overall).toMatchObject({
      eligibleUrls: 3,
      listedUrls: 1,
      submittedUrls: null,
      googleIndexedUrls: null,
      googleImpressionUrls: 1,
      googleClickUrls: 1,
      quotationUrls: null,
    });
    expect(p.audiences.aquisicao.eligibleUrls).toBe(1);
    expect(p.overall.totals['gsc-search'].clicks).toBe(2);
  });
  it('deduplicates identical rows without summing imports', () => {
    const d = measurementFixture();
    d.sources[1].rows.push(d.sources[1].rows[0]);
    const p = reconcileMeasurement(d, now);
    expect(p.quality.duplicatesRemoved).toBe(1);
    expect(p.overall.totals['gsc-search'].impressions).toBe(10);
  });
  it('rejects conflicting overlap', () => {
    const d = measurementFixture();
    d.sources[1].rows.push({ ...d.sources[1].rows[0], value: 99 });
    expect(() => reconcileMeasurement(d, now)).toThrow('Conflicting');
  });
  it('latest snapshot zero removes URL instead of unioning history', () => {
    const d = measurementFixture();
    d.sources[0].rows.push({
      ...d.sources[0].rows[0],
      date: '2026-10-19',
      value: 1,
    });
    d.sources[0].rows[0].value = 0;
    expect(reconcileMeasurement(d, now).overall.listedUrls).toBe(0);
  });
  it.each([
    'https://evil.example/fornecedor/teste',
    'https://patri.example/painel',
    'https://patri.example/fornecedor/teste?email=x',
    'https://patri.example/fornecedor/teste#token',
  ])('rejects unapproved/private URL %s', (url) => {
    const d = measurementFixture();
    d.inventory.rows[0].url = url;
    expect(() => reconcileMeasurement(d, now)).toThrow();
  });
  it('rejects PII and arbitrary dimension fields', () => {
    const d = measurementFixture();
    Object.assign(d.inventory.rows[0], { email: 'private' });
    expect(() => reconcileMeasurement(d, now)).toThrow();
  });
  it('rejects consented analytics represented as operations', () => {
    const d = measurementFixture();
    d.sources[1].source = 'events';
    d.sources[1].collection = 'operational';
    expect(() => reconcileMeasurement(d, now)).toThrow('collection');
  });
  it('does not accept revenue from GSC', () => {
    const d = measurementFixture();
    d.sources[1].rows[0].metric = 'revenue_cents';
    expect(() => reconcileMeasurement(d, now)).toThrow('Metric');
  });
  it('rejects future freshness and rows outside window', () => {
    const d = measurementFixture();
    d.sources[1].extractedAt = '2027-01-01T00:00:00Z';
    expect(() => reconcileMeasurement(d, now)).toThrow('Future');
    d.sources[1].extractedAt = '2026-10-21T10:00:00Z';
    d.sources[1].rows[0].date = '2026-09-01';
    expect(() => reconcileMeasurement(d, now)).toThrow('period');
  });
  it('flags observed rows outside inventory and ineligible URLs', () => {
    const d = measurementFixture();
    d.sources[1].rows.push({
      ...d.sources[1].rows[0],
      url: 'https://patri.example/materia/fora',
    });
    d.sources[1].rows.push({
      ...d.sources[1].rows[0],
      url: d.inventory.rows[3].url,
    });
    const p = reconcileMeasurement(d, now);
    expect(p.quality.outsideInventoryRows).toBe(1);
    expect(p.quality.ineligibleRows).toBe(1);
    expect(p.overall.totals['gsc-search'].impressions).toBe(10);
  });
});
