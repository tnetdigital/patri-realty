export type Row = Record<string, unknown> & { id: string; criado_em?: string };
export type Contract = Row & {
  anunciante_nome: string;
  fornecedor_id: string | null;
  produto: string;
  valor_centavos: number;
  inicio: string;
  fim: string;
  status: string;
  pago: boolean;
  observacao: string;
  renovacao_em?: string | null;
};
export type Banner = Row & {
  contrato_id: string;
  anunciante_nome: string;
  posicao_id: string;
  imagem_desktop: string;
  imagem_mobile: string;
  link_destino: string;
  segmento_id: string | null;
  uf: string | null;
  inicio: string;
  fim: string;
  status: string;
};
export type Highlight = Row & {
  contrato_id: string;
  fornecedor_id: string;
  segmento_id: string;
  uf: string;
  cidade_id: string | null;
  vaga: number;
  inicio: string;
  fim: string;
  status: string;
};
export type Report = {
  anunciante: string;
  inicio: string;
  fim: string;
  de: string;
  ate: string;
  impressoes: number;
  cliques: number;
  ctr: number;
  diario: { dia: string; impressoes: number; cliques: number }[];
};
export type Catalog = {
  produtos: (Row & {
    codigo: string;
    nome: string;
    preco_centavos: number;
    ativo: boolean;
  })[];
  posicoes: (Row & {
    slug: string;
    nome: string;
    largura: number;
    altura: number;
  })[];
  renovacoes: Contract[];
};
export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n / 100,
  );
export const dateTime = (s: string) =>
  new Date(Date.parse(s) - new Date(s).getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
export const overlap = (
  a: { inicio: string; fim: string },
  b: { inicio: string; fim: string },
) =>
  Date.parse(a.inicio) < Date.parse(b.fim) &&
  Date.parse(a.fim) > Date.parse(b.inicio);
export const isActive = (
  a: { inicio: string; fim: string; status: string },
  now = Date.now(),
) =>
  a.status === "ativo" &&
  Date.parse(a.inicio) <= now &&
  Date.parse(a.fim) > now;
export function validateRow(kind: string, p: Record<string, unknown>) {
  if (
    ["contrato", "banner", "destaque"].includes(kind) &&
    !(Date.parse(String(p.fim)) > Date.parse(String(p.inicio)))
  )
    throw Error("A data final precisa ser posterior à inicial.");
  if (
    kind === "banner" &&
    (!/^https:\/\//.test(String(p.link_destino)) ||
      !p.imagem_desktop ||
      !p.imagem_mobile)
  )
    throw Error("Informe as duas imagens e um destino HTTPS.");
  if (
    kind === "destaque" &&
    (!Number.isInteger(Number(p.vaga)) ||
      Number(p.vaga) < 1 ||
      Number(p.vaga) > 3)
  )
    throw Error("Escolha uma vaga de 1 a 3.");
}
export function analyticsAllowed() {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("patri:consent") === "analytics"
    );
  } catch {
    return false;
  }
}
