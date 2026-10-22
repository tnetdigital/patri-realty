import type { DirectoryCatalog, PublicSupplier } from "./model";
import { slug } from "./model";
import taxonomy from "./taxonomy.json" with { type: "json" };
import states from "./states.json" with { type: "json" };
const segments = taxonomy.segments.map((s, i) => ({
  id: `demo-segment-${i}`,
  nome: s.nome,
  slug: s.slug,
  icone: s.icone,
  grupo: s.grupo,
  apelidos: s.aliases,
  quantidade: 0,
}));
const cities = [
  { id: "demo-sp", nome: "São Paulo", uf: "SP", slug: "sao-paulo" },
  { id: "demo-campinas", nome: "Campinas", uf: "SP", slug: "campinas" },
  { id: "demo-rj", nome: "Rio de Janeiro", uf: "RJ", slug: "rio-de-janeiro" },
  { id: "demo-bh", nome: "Belo Horizonte", uf: "MG", slug: "belo-horizonte" },
];
const rows: [string, number, number, boolean][] = [
  ["Manutenção Exemplo Paulista", 2, 0, true],
  ["Portaria Exemplo São Paulo", 0, 0, false],
  ["Limpeza Exemplo Campinas", 1, 1, false],
  ["Elevadores Exemplo Rio", 3, 2, true],
  ["Jardins Exemplo Paulista", 5, 0, true],
  ["Administração Exemplo Minas", 4, 3, true],
  ["Conservação Exemplo São Paulo", 1, 0, true],
  ["Segurança Exemplo Rio", 0, 2, false],
];
export const demoSuppliers: PublicSupplier[] = rows.map(
  ([nome, sector, city, whole], i) => ({
    id: `demo-company-${i}`,
    slug: slug(nome),
    nome_fantasia: nome,
    descricao_curta:
      "Empresa fictícia para conhecer a experiência de busca e apresentação no guia Patri Realty.",
    sobre:
      "Este perfil é uma demonstração da Patri Realty. As informações, os serviços e os projetos apresentados são ilustrativos e não representam um fornecedor contratado ou aprovado. Use esta página para analisar a organização das informações e os caminhos de navegação do portal.",
    ano_fundacao: null,
    logo_url: "",
    logo_thumb_url: "",
    capa_url:
      i % 2
        ? "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80"
        : "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80",
    whatsapp: "",
    telefone: "",
    site: "",
    instagram: "",
    endereco: "",
    cep: "",
    video_url: "",
    certificacoes: [],
    instagram_posts: [],
    atualizado_em: "2026-10-20T00:00:00Z",
    cidade: cities[city],
    segmentos: [segments[sector]],
    cobertura: [
      {
        uf: cities[city].uf,
        cidade_id: whole ? null : cities[city].id,
        cidade_nome: whole ? "" : cities[city].nome,
        cidade_slug: whole ? "" : cities[city].slug,
      },
    ],
    servicos: [
      {
        id: `service-${i}`,
        titulo: segments[sector].nome,
        descricao:
          "Descrição ilustrativa do serviço. O perfil real apresentará as soluções cadastradas pelo fornecedor.",
        foto_url: "",
      },
    ],
    midias: [],
    cases: [],
    faqs: [
      {
        id: `faq-${i}`,
        pergunta: "Este fornecedor pode ser contratado?",
        resposta:
          "Não. Este é um perfil fictício, criado apenas para analisar a experiência do guia.",
      },
    ],
    verificado: false,
    patrocinado: false,
    nota: null,
    avaliacoes: 0,
  }),
);
export function demoCatalog(uf = ""): DirectoryCatalog {
  return {
    segmentos: segments.map((s) => ({
      ...s,
      quantidade: demoSuppliers.filter((f) =>
        f.segmentos.some((x) => x.slug === s.slug),
      ).length,
    })),
    estados: states,
    cidades: cities.filter((c) => c.uf === uf),
  };
}
