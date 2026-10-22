import type { PublicSupplier } from '../features/directory/model';
import { describe, it, expect } from 'vitest';
import { buildGraph, serializeStructured, type GraphInput } from './structured';
import { localFixture } from '../../tests/fixtures/local-eligibility';
import type { Article } from '../features/content/model';

const base: GraphInput = {
  origin: 'https://patri.example',
  canonical: 'https://patri.example/guia/teste',
  title: 'Teste & Segurança',
  description: 'Critérios públicos.',
  enabled: true,
};
const article = (extra: Partial<Article> = {}) =>
  ({
    slug: 'teste',
    titulo: 'Título público',
    resumo: 'Resumo público',
    status: 'publicada',
    publicada_em: '2026-01-01T12:00:00Z',
    tipo: 'editorial',
    ...extra,
  }) as Article;
const nodes = (input: GraphInput) => buildGraph(input)!['@graph'];
describe('grafo público compartilhado', () => {
  it.each([false, true])(
    'não cria dados quando desabilitado ou sem origem confiável (%s)',
    (disabled) => {
      expect(
        buildGraph({
          ...base,
          enabled: !disabled,
          origin: disabled ? base.origin : 'https://preview.appdeploy.ai',
        }),
      ).toBeNull();
    },
  );
  it.each([
    'invalid',
    'https://evil.example/guia',
    'https://patri.example/#fake',
  ])('rejeita canonical inválido: %s', (canonical) =>
    expect(buildGraph({ ...base, canonical })).toBeNull(),
  );
  it('liga plataforma, site e página com IDs absolutos, sem serviço próprio', () => {
    const graph = nodes(base);
    expect(graph.map((n) => n['@type'])).toEqual([
      'Organization',
      'WebSite',
      'CollectionPage',
    ]);
    expect(graph[1].publisher).toEqual({
      '@id': 'https://patri.example/#organization',
    });
    expect(graph[2].isPartOf).toEqual({
      '@id': 'https://patri.example/#website',
    });
  });
  it('mantém ordem e contagem da seleção exibida, não o total da busca', async () => {
    const f = await localFixture(async () => 'test');
    const graph = nodes({
      ...base,
      suppliers: [f.suppliers[2], f.suppliers[0]],
    });
    const list = graph.find((n) => n['@type'] === 'ItemList')!;
    expect(list.numberOfItems).toBe(2);
    expect(list.itemListElement).toMatchObject([
      { position: 1, item: { name: f.suppliers[2].nome_fantasia } },
      { position: 2 },
    ]);
  });
  it('representa lista vazia sem empresa de preenchimento', () =>
    expect(nodes({ ...base, suppliers: [] }).at(-1)).toMatchObject({
      numberOfItems: 0,
      itemListElement: [],
    }));
  it('serviço pertence ao fornecedor; dados extras e agregados sem prova não vazam', async () => {
    const s = (await localFixture(async () => 'test'))
      .suppliers[0] as PublicSupplier;
    s.servicos = [
      {
        id: 's/1',
        titulo: 'Manutenção',
        descricao: 'Escopo público',
        foto_url: '',
      },
    ];
    s.nota = 5;
    s.avaliacoes = 300;
    s.endereco = 'Endereço sem prova de estabelecimento';
    const graph = nodes({
      ...base,
      canonical: 'https://patri.example/fornecedor/' + s.slug,
      supplier: { ...s, segredo: 'NUNCA' } as typeof s,
    });
    expect(graph.find((n) => n['@type'] === 'Service')?.provider).toEqual({
      '@id': 'https://patri.example/fornecedor/' + s.slug + '#organization',
    });
    const text = JSON.stringify(graph);
    expect(text).not.toMatch(
      /NUNCA|AggregateRating|LocalBusiness|PostalAddress|price|availability/,
    );
  });
  it('não inventa serviço quando o perfil não o informa', async () => {
    const s = (await localFixture(async () => 'test')).suppliers[0];
    expect(
      nodes({ ...base, supplier: s }).some((n) => n['@type'] === 'Service'),
    ).toBe(false);
  });
  it('separa autor pessoa, publisher e datas de moderação', () => {
    const graph = nodes({
      ...base,
      article: article({
        autor: 'Autora de teste',
        atualizado_em: '2026-02-01T12:00:00Z',
      }),
    });
    expect(graph.find((n) => n['@type'] === 'Person')?.name).toBe(
      'Autora de teste',
    );
    expect(graph.find((n) => n['@type'] === 'Article')).toMatchObject({
      publisher: { '@id': 'https://patri.example/#organization' },
      datePublished: '2026-01-01T12:00:00Z',
    });
    expect(JSON.stringify(graph)).not.toContain('dateModified');
  });
  it('redação é Organization, sem jornalista inventado', () => {
    const graph = nodes({ ...base, article: article() });
    expect(graph.some((n) => n['@type'] === 'Person')).toBe(false);
    expect(
      graph.find((n) => n.name === 'Redação Patri Realty')?.['@type'],
    ).toBe('Organization');
  });
  it('identifica conteúdo comercial sem inventar patrocinador', () => {
    const a = nodes({
      ...base,
      article: article({ tipo: 'patrocinada' }),
    }).find((n) => n['@type'] === 'Article')!;
    expect(a.genre).toBe('Conteúdo de marca');
    expect(a.sponsor).toBeUndefined();
  });
  it.each([
    { status: 'rascunho' },
    { publicada_em: null },
    { publicada_em: 'invalid' },
    { publicada_em: '2999-01-01T12:00:00Z' },
  ])('suprime Article sem publicação comprovada: %j', (extra) =>
    expect(
      nodes({ ...base, article: article(extra) }).some(
        (n) => n['@type'] === 'Article',
      ),
    ).toBe(false),
  );
  it('escapa script, ampersand e separadores sem mudar os dados JSON', () => {
    const payload = {
      text: '</script><script>alert("x")</script>&\u2028\u2029 São Paulo',
    };
    const result = serializeStructured(payload);
    expect(result).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(result)).toEqual(payload);
  });
});
