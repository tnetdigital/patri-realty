export type Block = {
  tipo:
    | "paragrafo"
    | "titulo"
    | "citacao"
    | "lista"
    | "imagem"
    | "video"
    | "tabela"
    | "link";
  texto: string;
  url?: string;
  legenda?: string;
  linhas?: string[][];
};
export type Article = {
  id: string;
  titulo: string;
  slug: string;
  resumo: string;
  corpo: Block[];
  imagem_capa: string;
  categoria_id: string;
  autor_id?: string;
  tipo: "editorial" | "patrocinada" | "fornecedor";
  fornecedor_id: string | null;
  portal_id: string | null;
  status: string;
  publicada_em: string | null;
  agendada_em: string | null;
  seo_titulo: string;
  seo_descricao: string;
  canonical_url?: string;
  tempo_leitura: number;
  motivo: string;
  versao: number;
  criado_em: string;
  atualizado_em?: string;
  categoria?: string;
  categoria_slug?: string;
  autor?: string;
  selo?: string;
  fornecedor?: {
    nome: string;
    slug: string;
    descricao: string;
    logo: string;
  } | null;
  primeiro_envio_em?: string | null;
};
export type Category = {
  id: string;
  nome: string;
  slug: string;
  ativa?: boolean;
};
export type Magazine = {
  id: string;
  titulo: string;
  edicao: string;
  slug: string;
  capa_url: string;
  link_digital: string;
  publicada_em: string | null;
  status: string;
};
export type Portal = {
  id: string;
  nome: string;
  url: string;
  vagas_por_mes: number;
  ativo: boolean;
};
export type Topic = {
  id: string;
  titulo: string;
  responsavel_id: string | null;
  data_prevista: string | null;
  status: string;
  observacoes: string;
};
export type Subscriber = {
  id: string;
  email: string;
  nome: string;
  cidade: string;
  perfil: string;
  confirmado: boolean;
  confirmado_em: string | null;
  descadastrado_em: string | null;
  origem: string;
  criado_em: string;
};
export type Delivery = {
  id: string;
  materia_id: string;
  portal_id: string;
  url_externa: string;
  canonical_url: string;
  entregue_em: string;
};
export type Catalog = {
  categorias: Category[];
  revistas: Magazine[];
  portais?: Portal[];
  pautas?: Topic[];
  equipe?: { id: string; nome: string }[];
  entregas?: Delivery[];
};
export type Balance = {
  mensal: number;
  limite: number;
  usadas: number;
  cortesia: number;
  parceiro: number;
  mes: string;
};
export type PublicResult = {
  item?: Article | Magazine | null;
  items?: Article[];
  total?: number;
  pagina?: number;
  redirect?: string | null;
  not_found?: boolean;
};
export const statusNames: Record<string, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  ajuste: "Ajuste solicitado",
  recusada: "Recusada",
  agendada: "Agendada",
  publicada: "Publicada",
  arquivada: "Arquivada",
};
export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const blankArticle = (): Article => ({
  id: "",
  titulo: "",
  slug: "",
  resumo: "",
  corpo: [{ tipo: "paragrafo", texto: "" }],
  imagem_capa: "",
  categoria_id: "",
  tipo: "editorial",
  fornecedor_id: null,
  portal_id: null,
  status: "rascunho",
  publicada_em: null,
  agendada_em: null,
  seo_titulo: "",
  seo_descricao: "",
  tempo_leitura: 1,
  motivo: "",
  versao: 1,
  criado_em: new Date().toISOString(),
});
export function wordCount(blocks: Block[]) {
  return blocks.reduce(
    (n, b) =>
      n +
      [b.texto, ...(b.linhas || []).flat()]
        .join(" ")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length,
    0,
  );
}
export function validateArticle(a: Article, supplier: boolean) {
  const words = wordCount(a.corpo),
    links = a.corpo.reduce(
      (n, b) =>
        n +
        (b.tipo === "link" ? 1 : 0) +
        (
          [b.texto, ...(b.linhas || []).flat()]
            .join(" ")
            .match(/https?:\/\/|www\./gi) || []
        ).length,
      0,
    ),
    photos =
      a.corpo.filter((b) => b.tipo === "imagem").length +
      (a.imagem_capa ? 1 : 0);
  if (a.titulo.trim().length < 5 || !a.categoria_id || words < 10)
    throw Error("Preencha título, categoria e ao menos dez palavras.");
  if (supplier && (words > 600 || links > 1 || photos > 5))
    throw Error(
      "Limite do fornecedor: 600 palavras, um link e cinco fotos incluindo a capa.",
    );
  if (/[<>]/.test(JSON.stringify(a.corpo)) || /[<>]/.test(a.titulo + a.resumo))
    throw Error("Não use HTML nos textos.");
  if (
    a.corpo.some((b) => b.tipo === "link" && !/^https:\/\//.test(b.url || ""))
  )
    throw Error("Use links HTTPS.");
}
export const publicHref = (s: string) => (/^https?:\/\//.test(s) ? s : "");
export function videoId(s: string) {
  const m = s.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  return m?.[1] || "";
}
