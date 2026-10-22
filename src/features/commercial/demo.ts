import { demoCatalog, demoSuppliers } from "../directory/fixtures";
import {
  isActive,
  overlap,
  validateRow,
  type Row,
  type Contract,
  type Banner,
  type Highlight,
  type Catalog,
  type Report,
} from "./model";
const key = "patri:commercial-demo:v1";
type State = {
  contratos: Contract[];
  banners: Banner[];
  destaques: Highlight[];
  catalog: Catalog;
  links: Record<string, string>;
  linkExpires?: Record<string, number>;
  events: string[];
  metrics: Record<
    string,
    { dia: string; impressoes: number; cliques: number }[]
  >;
};
const now = () => new Date().toISOString();
function seed(): State {
  const start = new Date(Date.now() - 86400000).toISOString(),
    end = new Date(Date.now() + 29 * 86400000).toISOString(),
    c: Contract = {
      id: "contract-banner-demo",
      anunciante_nome: "Anunciante Exemplo",
      fornecedor_id: null,
      produto: "banner",
      valor_centavos: 0,
      inicio: start,
      fim: end,
      status: "ativo",
      pago: false,
      observacao: "Contrato fictício, sem cobrança real.",
    };
  return {
    contratos: [c],
    banners: [
      {
        id: "banner-demo-1",
        contrato_id: c.id,
        anunciante_nome: c.anunciante_nome,
        posicao_id: "position-home_topo",
        imagem_desktop:
          "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80",
        imagem_mobile:
          "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=640&q=80",
        link_destino: "https://example.com",
        segmento_id: null,
        uf: null,
        inicio: start,
        fim: end,
        status: "ativo",
      },
    ],
    destaques: [],
    catalog: {
      produtos: ["banner", "destaque", "materia", "orcamentos", "plano"].map(
        (k, i) => ({
          id: "product-" + k,
          codigo: k,
          nome: [
            "Banner",
            "Destaque",
            "Matéria patrocinada",
            "Pacote de orçamentos",
            "Plano",
          ][i],
          preco_centavos: 0,
          ativo: true,
        }),
      ),
      posicoes: [
        "home_topo",
        "home_meio",
        "materia_meio",
        "guia_topo",
        "segmento_topo",
      ].map((k) => ({
        id: "position-" + k,
        slug: k,
        nome: k.replaceAll("_", " "),
        largura: 1200,
        altura: 300,
      })),
      renovacoes: [],
    },
    links: {},
    linkExpires: {},
    events: [],
    metrics: {},
  };
}
export function commercialDemo(): State {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || seed();
  } catch {
    return seed();
  }
}
function write(s: State) {
  localStorage.setItem(key, JSON.stringify(s));
  window.dispatchEvent(new Event("patri:commercial"));
}
export function resetCommercialDemo() {
  write(seed());
}
export function saveDemoCommercial(
  kind: string,
  rid: string | null,
  p: Record<string, unknown>,
) {
  const s = commercialDemo();
  validateRow(kind, p);
  const id = rid || crypto.randomUUID();
  if (kind === "preco") {
    if (!Number.isInteger(p.preco_centavos) || Number(p.preco_centavos) < 0)
      throw Error("Preço inválido");
    const product = s.catalog.produtos.find((x) => x.id === rid);
    if (product) {
      product.preco_centavos = Number(p.preco_centavos);
      product.ativo = !!p.ativo;
    }
  } else {
    const table =
      kind === "contrato"
        ? "contratos"
        : kind === "banner"
          ? "banners"
          : "destaques";
    if (
      table === "contratos" &&
      [...s.banners, ...s.destaques].some(
        (b) =>
          b.contrato_id === id &&
          (p.produto !==
            (s.banners.some((x) => x.id === b.id) ? "banner" : "destaque") ||
            Date.parse(String(p.inicio)) > Date.parse(b.inicio) ||
            Date.parse(String(p.fim)) < Date.parse(b.fim)),
      )
    )
      throw Error("Contrato não pode invalidar campanhas vinculadas");
    if (table !== "contratos") {
      const c = s.contratos.find((c) => c.id === p.contrato_id);
      if (
        !c ||
        c.produto !== kind ||
        Date.parse(String(p.inicio)) < Date.parse(c.inicio) ||
        Date.parse(String(p.fim)) > Date.parse(c.fim)
      )
        throw Error(
          "A campanha precisa de contrato compatível e período dentro da vigência",
        );
    }
    if (
      kind === "destaque" &&
      (!demoSuppliers.some(
        (f) =>
          f.id === p.fornecedor_id &&
          f.segmentos.some((s) => s.id === p.segmento_id),
      ) ||
        s.contratos.find((c) => c.id === p.contrato_id)?.fornecedor_id !==
          p.fornecedor_id)
    )
      throw Error("Fornecedor e especialidade não conferem com a reserva");
    if (
      kind === "destaque" &&
      p.status === "ativo" &&
      s.destaques.some(
        (d) =>
          d.id !== id &&
          d.status === "ativo" &&
          d.segmento_id === p.segmento_id &&
          d.uf === p.uf &&
          d.vaga === Number(p.vaga) &&
          overlap(d, p as never),
      )
    )
      throw Error(
        "Vaga já reservada neste período. Há no máximo três vagas por especialidade e UF",
      );
    s[table] = [
      { ...p, id, criado_em: now() },
      ...s[table].filter((x) => x.id !== id),
    ] as never;
  }
  write(s);
  return id;
}
export function demoBanners(position: string, segment = "", region = "") {
  const s = commercialDemo(),
    pos = s.catalog.posicoes.find((p) => p.slug === position);
  return s.banners.filter(
    (b) =>
      b.posicao_id === pos?.id &&
      isActive(b) &&
      s.contratos.some((c) => c.id === b.contrato_id && isActive(c)) &&
      (!b.segmento_id ||
        segment
          .split(",")
          .some(
            (x) =>
              x === b.segmento_id ||
              demoCatalog().segmentos.some(
                (s) => s.id === b.segmento_id && s.slug === x,
              ),
          )) &&
      (!b.uf || b.uf === region),
  );
}
export function demoEvent(
  bid: string,
  type: string,
  id: string,
  consented: boolean,
) {
  const s = commercialDemo();
  if (!consented || s.events.includes(id)) return;
  if (
    !["impressao", "clique"].includes(type) ||
    !s.banners.some(
      (b) =>
        b.id === bid &&
        isActive(b) &&
        s.contratos.some((c) => c.id === b.contrato_id && isActive(c)),
    )
  )
    return;
  s.events.push(id);
  const date = now().slice(0, 10),
    rows = s.metrics[bid] || [],
    row = rows.find((x) => x.dia === date) || {
      dia: date,
      impressoes: 0,
      cliques: 0,
    };
  if (type === "impressao") row.impressoes++;
  else row.cliques++;
  if (!rows.includes(row)) rows.push(row);
  s.metrics[bid] = rows;
  write(s);
}
export function demoLink(bid: string, operation: string) {
  const s = commercialDemo();
  for (const [t, id] of Object.entries(s.links))
    if (id === bid) delete s.links[t];
  const token =
    operation === "revogar"
      ? ""
      : crypto.randomUUID().replaceAll("-", "") +
        crypto.randomUUID().replaceAll("-", "");
  if (token) {
    s.links[token] = bid;
    s.linkExpires = { ...s.linkExpires, [token]: Date.now() + 90 * 86400000 };
  }
  write(s);
  return token;
}
export function demoReport(
  token: string,
  from: string,
  to: string,
): Report | null {
  const s = commercialDemo(),
    bid = s.links[token],
    b = s.banners.find((b) => b.id === bid);
  if (
    (s.linkExpires?.[token] || Infinity) < Date.now() ||
    !b ||
    !from ||
    !to ||
    to < from ||
    Date.parse(to) - Date.parse(from) > 365 * 86400000
  )
    return null;
  const diario = (s.metrics[bid] || []).filter(
      (x) => x.dia >= from && x.dia <= to,
    ),
    impressoes = diario.reduce((n, x) => n + x.impressoes, 0),
    cliques = diario.reduce((n, x) => n + x.cliques, 0);
  return {
    anunciante: b.anunciante_nome,
    inicio: b.inicio,
    fim: b.fim,
    de: from,
    ate: to,
    impressoes,
    cliques,
    ctr: impressoes ? Math.round((cliques / impressoes) * 10000) / 100 : 0,
    diario,
  };
}
