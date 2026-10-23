import type { Metrics } from '../growth/model';

export const measurementGroups = {
  procura: {
    label: 'Procura de fornecedores',
    events: [
      'visualizacao_perfil',
      'busca',
      'clique_whatsapp',
      'clique_telefone',
      'clique_site',
      'clique_instagram',
      'orcamento_enviado',
    ],
    note: 'Cliques indicam intenção. Confirmações de pedido são eventos opcionais após o recibo, não o total operacional de orçamentos nem vendas.',
  },
  aquisicao: {
    label: 'Aquisição de fornecedores',
    events: [],
    note: 'Cadastros, fornecedores aprovados, assinaturas e receita ainda não estão integrados a este relatório. Conta criada, e-mail confirmado e pagamento recebido são etapas distintas.',
  },
  leitores: {
    label: 'Leitores',
    events: ['visualizacao_materia', 'tempo_materia', 'clique_perfil_materia'],
    note: 'Abertura de matéria não confirma leitura completa. Eventos de tempo são intervalos de atividade visível; não representam leitores únicos nem duração média.',
  },
  publicidade: {
    label: 'Publicidade',
    events: ['impressao_banner', 'clique_banner'],
    note: 'Contagens comerciais existentes, separadas da aquisição orgânica. Impressões e cliques não confirmam venda ou retorno financeiro.',
  },
} as const;
export type MeasurementGroup = keyof typeof measurementGroups;
export const metricEvents = [
  ...measurementGroups.procura.events,
  ...measurementGroups.leitores.events,
  'impressao_banner',
  'clique_banner',
];
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export function validDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function metricWindow(from: string, to: string) {
  return (
    validDay(from) &&
    validDay(to) &&
    from <= to &&
    Date.parse(to) - Date.parse(from) <= 365 * 86400000
  );
}
export function metricValue(
  values: Record<string, number> | null | undefined,
  name: string,
): number | null {
  const value = values?.[name];
  return metricEvents.includes(name) &&
    Number.isSafeInteger(value) &&
    Number(value) >= 0
    ? value!
    : null;
}
// Return only known aggregate fields; never spread raw operational/API objects.
export function parseMetrics(
  input: unknown,
  from: string,
  to: string,
): Metrics {
  if (!metricWindow(from, to))
    throw Error('Selecione datas válidas com intervalo de até 365 dias.');
  if (!isObject(input) || typeof input.bloqueado !== 'boolean')
    throw Error('Resposta de métricas inválida. Atualize a consulta.');
  const d = input;
  if (d.bloqueado)
    return { bloqueado: true, atual: null, anterior: null, diario: [] };
  const validRecord = (
    value: unknown,
  ): value is Record<string, number> | null =>
    value === null || (isObject(value) && Object.values(value).every(isCount));
  if (
    !validRecord(d.atual) ||
    !validRecord(d.anterior) ||
    !Array.isArray(d.diario)
  )
    throw Error('Resposta de métricas inválida. Atualize a consulta.');
  if (
    (d.de !== undefined && d.de !== from) ||
    (d.ate !== undefined && d.ate !== to)
  )
    throw Error('Período de métricas divergente.');
  const daily = new Map<string, Metrics['diario'][number]>();
  for (const row of d.diario) {
    if (
      !isObject(row) ||
      typeof row.dia !== 'string' ||
      !validDay(row.dia) ||
      typeof row.tipo !== 'string' ||
      !isCount(row.quantidade)
    )
      throw Error('Resposta de métricas inválida. Atualize a consulta.');
    if (!metricEvents.includes(row.tipo)) continue;
    if (row.dia < from || row.dia > to)
      throw Error('Data de métrica fora do período.');
    const key = row.dia + ':' + row.tipo;
    const existing = daily.get(key);
    if (existing && existing.quantidade !== row.quantidade)
      throw Error('Agregados diários conflitantes.');
    daily.set(key, {
      dia: row.dia,
      tipo: row.tipo,
      quantidade: row.quantidade,
    });
  }
  const onlyKnown = (values: Record<string, number> | null) =>
    values === null
      ? null
      : Object.fromEntries(
          Object.entries(values).filter(([name]) =>
            metricEvents.includes(name),
          ),
        );
  const current = metricValue(d.atual, 'visualizacao_perfil'),
    previous = metricValue(d.anterior, 'visualizacao_perfil');
  return {
    bloqueado: false,
    atual: onlyKnown(d.atual),
    anterior: onlyKnown(d.anterior),
    diario: [...daily.values()].sort(
      (a, b) => a.dia.localeCompare(b.dia) || a.tipo.localeCompare(b.tipo),
    ),
    queda_visitas:
      current !== null && previous !== null && previous > 0
        ? Math.round((current / previous - 1) * 1000) / 10
        : null,
    de: from,
    ate: to,
  };
}

export function dailyCsv(rows: Metrics['diario']) {
  // Validated dates, event enum and integers only: no spreadsheet formulas or free text.
  return (
    '\uFEFFdata;evento;quantidade\n' +
    rows
      .filter(
        (r) =>
          validDay(r.dia) &&
          metricEvents.includes(r.tipo) &&
          Number.isSafeInteger(r.quantidade) &&
          r.quantidade >= 0,
      )
      .map((r) => `${r.dia};${r.tipo};${r.quantidade}`)
      .join('\n')
  );
}

export function parseEditorialMetrics(input: unknown) {
  if (!isObject(input) || !Array.isArray(input.items) || !isCount(input.total))
    throw Error('Resposta editorial inválida.');
  const seen = new Set<string>();
  const items = input.items.map((row: unknown) => {
    if (
      !isObject(row) ||
      typeof row.id !== 'string' ||
      !/^[a-f0-9-]{36}$/i.test(row.id) ||
      typeof row.titulo !== 'string' ||
      row.titulo.length > 300 ||
      seen.has(row.id)
    )
      throw Error('Linha editorial inválida.');
    seen.add(row.id);
    const value = (v: unknown) => {
      if (v === undefined || v === null) return null;
      if (!isCount(v)) throw Error('Contagem editorial inválida.');
      return v;
    };
    const views = value(row.leituras),
      clicks = value(row.cliques_perfil);
    const proxy = row.tempo_medio_segundos;
    if (
      proxy !== undefined &&
      proxy !== null &&
      (typeof proxy !== 'number' || !Number.isFinite(proxy) || proxy < 0)
    )
      throw Error('Atividade editorial inválida.');
    return {
      id: row.id,
      titulo: row.titulo,
      aberturas: views,
      cliques_perfil: clicks,
      atividade_por_abertura:
        views !== null && views > 0 && typeof proxy === 'number' ? proxy : null,
    };
  });
  return { items, total: input.total };
}
