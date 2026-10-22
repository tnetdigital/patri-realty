// Synthetic test transport only. Never import this into application code or a real review document.
import type { LocalReview } from '../../src/seo/eligibility.ts';
import type { PublicSupplier } from '../../src/features/directory/model.ts';
export async function localFixture(
  hash: (review: LocalReview) => Promise<string>,
  count = 3,
  now = Date.now(),
) {
  const profileVersion = new Date(now - 7200000).toISOString(),
    verifiedAt = new Date(now - 3600000).toISOString();
  const expiresAt = new Date(now + 86400000).toISOString();
  const location = {
    segment: 'teste',
    uf: 'SP',
    city: 'cidade-teste',
    cityId: 'synthetic-city',
  };
  const suppliers = Array.from(
    { length: count },
    (_, i) =>
      ({
        id: 'synthetic-' + i,
        slug: 'synthetic-' + i,
        nome_fantasia: 'Empresa sintética ' + i,
        descricao_curta: 'Fixture de teste, não é empresa real.',
        sobre: '',
        ano_fundacao: null,
        logo_url: '',
        logo_thumb_url: '',
        capa_url: '',
        whatsapp: '',
        telefone: '',
        site: '',
        instagram: '',
        endereco: '',
        cep: '',
        video_url: '',
        certificacoes: [],
        instagram_posts: [],
        atualizado_em: profileVersion,
        cidade: null,
        segmentos: [
          {
            id: 's',
            slug: 'teste',
            nome: 'Teste',
            icone: '',
            quantidade: count,
          },
        ],
        cobertura: [
          {
            uf: 'SP',
            cidade_id: 'synthetic-city',
            cidade_slug: 'cidade-teste',
            cidade_nome: 'Cidade sintética',
          },
        ],
        servicos: [],
        midias: [],
        cases: [],
        faqs: [],
        verificado: false,
        patrocinado: false,
        nota: null,
        avaliacoes: 0,
      }) satisfies PublicSupplier,
  );
  const criterion = (points: number) => ({
    points,
    evidence: ['https://evidence.example/synthetic-only'],
  });
  const review: LocalReview = {
    version: 'patri-local-2026-10-22.04',
    origin: 'real',
    revision: 'synthetic-v1',
    location,
    content: {
      title: 'Guia local sintético para QA',
      description: 'Exclusivamente fixture, sem aprovação editorial real.',
      intro: 'Orientação sintética para o cenário de testes.',
      context: 'Contexto municipal sintético, não publicar.',
      checklist: ['Critério sintético de seleção.'],
    },
    criteria: {
      utility: criterion(20),
      differentiation: criterion(20),
      accuracy: criterion(15),
      editorial: criterion(10),
      technical: criterion(10),
      interlinking: criterion(10),
      conversion: criterion(10),
      media: criterion(5),
    },
    checks: {
      uniqueUseful: true,
      truthful: true,
      rights: true,
      technical: true,
      ctaFunctional: true,
      publicExposure: true,
    },
    supplierProofs: suppliers.map((s) => ({
      id: s.id,
      slug: s.slug,
      businessKey: 'synthetic-business-' + s.id,
      real: true,
      reference: 'https://evidence.example/synthetic-company',
      municipalReference: 'https://evidence.example/synthetic-municipality',
      profileVersion,
      verifiedAt,
      expiresAt,
    })),
    approval: {
      status: 'approved',
      reviewer: 'Revisor sintético — não é aprovação de Tércio',
      approvedAt: new Date(now - 1800000).toISOString(),
      expiresAt,
      hash: '0'.repeat(64),
    },
  };
  review.approval.hash = await hash(review);
  return { review, suppliers, location, now };
}
