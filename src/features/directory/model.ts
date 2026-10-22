export type Segment = {
  id: string;
  nome: string;
  slug: string;
  icone: string;
  quantidade: number;
  grupo?: string;
  apelidos?: string[];
};
export type City = { id: string; nome: string; uf: string; slug: string };
export type DirectoryCatalog = {
  segmentos: Segment[];
  estados: { uf: string; nome: string }[];
  cidades: City[];
};
export type PublicSupplier = {
  id: string;
  slug: string;
  nome_fantasia: string;
  descricao_curta: string;
  sobre: string;
  ano_fundacao: number | null;
  logo_url: string;
  logo_thumb_url: string;
  capa_url: string;
  whatsapp: string;
  telefone: string;
  site: string;
  instagram: string;
  endereco: string;
  cep: string;
  video_url: string;
  certificacoes: string[];
  instagram_posts: string[];
  atualizado_em: string;
  cidade: City | null;
  segmentos: Segment[];
  cobertura: {
    uf: string;
    cidade_id: string | null;
    cidade_nome: string;
    cidade_slug: string;
  }[];
  servicos: {
    id: string;
    titulo: string;
    descricao: string;
    foto_url: string;
  }[];
  midias: { id: string; url: string; legenda: string }[];
  cases: {
    id: string;
    condominio: string;
    descricao: string;
    foto_url: string;
  }[];
  faqs: { id: string; pergunta: string; resposta: string }[];
  verificado: boolean;
  patrocinado: boolean;
  nota: number | null;
  avaliacoes: number;
};
export type Filters = {
  segmento: string;
  uf: string;
  cidade: string;
  q: string;
  pagina: number;
  ordem: "relevancia" | "nome";
};
export type SearchResult = {
  items: PublicSupplier[];
  total: number;
  pagina: number;
  paginas: number;
  not_found: boolean;
  redirect?: string;
};
export type ProfileResult = {
  fornecedor: PublicSupplier | null;
  redirect: string | null;
};
export type SitemapData = {
  fornecedores: { slug: string; atualizado_em: string }[];
  segmentos: string[];
  locais: { segmento: string; uf: string; cidade: string; eligibleUntil?:number }[];
};
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const slug = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function filtersFromRoute(pathname: string, search: string): Filters {
  const p = pathname
      .split("/")
      .filter(Boolean)
      .map((s) => {
        try {
          return decodeURIComponent(s);
        } catch {
          return "";
        }
      }),
    q = new URLSearchParams(search);
  const page = Number(q.get("pagina") || 1);
  return {
    segmento:
      p[0] === "guia"
        ? p[1] || q.get("segmentos") || q.get("segmento") || ""
        : q.get("segmentos") || q.get("segmento") || "",
    uf: (p[0] === "guia" && p[2] ? p[2] : q.get("uf") || "").toUpperCase(),
    cidade: p[0] === "guia" && p[3] ? p[3] : q.get("cidade") || "",
    q: (q.get("q") || "").slice(0, 120),
    pagina: Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1,
    ordem: q.get("ordem") === "nome" ? "nome" : "relevancia",
  };
}
export const selectedSegments = (value: string) =>
  [...new Set(value.split(",").filter(Boolean))].sort();
export function directoryPath(filters: Partial<Filters> = {}) {
  const params = new URLSearchParams(),
    selected = selectedSegments(filters.segmento || "");
  let path = filters.q ? "/busca" : "/guia";
  if (filters.q) params.set("q", filters.q);
  const routeSegment = !filters.q && selected.length === 1;
  if (routeSegment) {
    path += "/" + encodeURIComponent(selected[0]);
    if (filters.uf && filters.cidade)
      path +=
        "/" +
        filters.uf.toLowerCase() +
        "/" +
        encodeURIComponent(filters.cidade);
  } else if (selected.length)
    params.set(
      selected.length > 1 ? "segmentos" : "segmento",
      selected.join(","),
    );
  if (filters.uf && (!routeSegment || !filters.cidade))
    params.set("uf", filters.uf.toUpperCase());
  if (filters.cidade && !routeSegment) params.set("cidade", filters.cidade);
  if (filters.pagina && filters.pagina > 1)
    params.set("pagina", String(filters.pagina));
  if (filters.ordem === "nome") params.set("ordem", "nome");
  return path + (params.size ? "?" + params.toString() : "");
}
export function safeHttps(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}
export function videoId(value: string) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.replace(/^www\./, "");
    const id =
      host === "youtu.be"
        ? u.pathname.slice(1)
        : host === "youtube.com"
          ? u.searchParams.get("v") || u.pathname.split("/").at(-1)
          : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function matchesSupplier(s: PublicSupplier, f: Filters) {
  if (
    f.segmento &&
    !s.segmentos.some((x) => selectedSegments(f.segmento).includes(x.slug))
  )
    return false;
  if (
    f.uf &&
    !s.cobertura.some(
      (r) =>
        r.uf === f.uf &&
        (!f.cidade || !r.cidade_id || r.cidade_slug === f.cidade),
    )
  )
    return false;
  return (
    !f.q ||
    normalize(
      [
        s.nome_fantasia,
        s.descricao_curta,
        ...s.segmentos.flatMap((x) => [x.nome, ...(x.apelidos || [])]),
      ].join(" "),
    ).includes(normalize(f.q))
  );
}
export function paginateSuppliers(
  items: PublicSupplier[],
  filters: Filters,
): SearchResult {
  const sorted = items
    .filter((s) => matchesSupplier(s, filters))
    .sort(
      (a, b) =>
        Number(b.patrocinado) - Number(a.patrocinado) ||
        Number(b.nota || 0) - Number(a.nota || 0) ||
        a.nome_fantasia.localeCompare(b.nome_fantasia, "pt-BR"),
    );
  return {
    items: sorted.slice((filters.pagina - 1) * 24, filters.pagina * 24),
    total: sorted.length,
    pagina: filters.pagina,
    paginas: Math.ceil(sorted.length / 24),
    not_found: false,
  };
}
