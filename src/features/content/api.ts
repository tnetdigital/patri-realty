import { editorialAllowed, editorialProjection } from "../../seo/editorial";
import { db } from "../../lib/supabase";
import type { DirectoryRuntime } from "../directory/api";
import {
  contentDemo,
  demoSaveArticle,
  demoArticleAction,
  demoSaveResource,
} from "./demo";
import {
  slugify,
  type Article,
  type Catalog,
  type Balance,
  type PublicResult,
  type Subscriber,
} from "./model";
import type { Json } from "../../lib/database.types";
export const contentKey = (
  r: DirectoryRuntime,
  kind: string,
  slug = "",
  category = "",
  page = 1,
) => ["content-public", r.source, kind, slug, category, page];
export async function contentPublic(
  r: DirectoryRuntime,
  kind: string,
  slug = "",
  category = "",
  page = 1,
): Promise<
  PublicResult &
    Partial<Catalog> & {
      materias?: string[];
      categorias_slugs?: string[];
      revistas_slugs?: string[];
    }
> {
  if (r.source === "demo") {
    const s = contentDemo(),
      published = s.articles.filter(
        (a) =>
          a.status === "publicada" &&
          !!a.publicada_em &&
          Date.parse(a.publicada_em) <= Date.now(),
      ),
      project = (a: Article) => ({
        ...a,
        categoria: s.catalog.categorias.find((c) => c.id === a.categoria_id)
          ?.nome,
        categoria_slug: s.catalog.categorias.find(
          (c) => c.id === a.categoria_id,
        )?.slug,
        autor: "Redação de demonstração",
        selo: a.tipo === "editorial" ? undefined : "Conteúdo de marca",
        fornecedor: a.fornecedor_id
          ? {
              nome: "Empresa Exemplo",
              slug: "manutencao-exemplo-paulista",
              descricao: "Fornecedor fictício de demonstração.",
              logo: "",
            }
          : null,
      });
    if (kind === "catalogo") return s.catalog;
    if (kind === "materia")
      return {
        item: published.find((a) => a.slug === slug)
          ? project(published.find((a) => a.slug === slug)!)
          : null,
        redirect: s.redirects[slug] ? "/materia/" + s.redirects[slug] : null,
      };
    if (kind === "revista")
      return {
        item:
          s.catalog.revistas.find(
            (a) =>
              a.slug === slug &&
              a.status === "publicada" &&
              !!a.publicada_em &&
              Date.parse(a.publicada_em) <= Date.now(),
          ) || null,
      };
    const rows = published.filter(
      (a) =>
        (kind !== "fornecedor" || !!a.fornecedor_id) &&
        (!category ||
          s.catalog.categorias.find((c) => c.id === a.categoria_id)?.slug ===
            category),
    );
    return {
      items: rows.slice((page - 1) * 12, page * 12).map(project),
      total: rows.length,
      pagina: page,
      not_found:
        !!category && !s.catalog.categorias.some((c) => c.slug === category),
    };
  }
  if (typeof window !== "undefined") {
    const params = new URLSearchParams({
      kind,
      slug,
      category,
      page: String(page),
    });
    const res = await fetch("/api/editorial-public?" + params, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw Error("Conteúdo temporariamente indisponível.");
    return res.json();
  }
  const response = await fetch(
    r.url.replace(/\/$/, "") + "/rest/v1/rpc/conteudo_publico",
    {
      method: "POST",
      headers: {
        apikey: r.key,
        Authorization: "Bearer " + r.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind,
        slug_value: slug,
        category,
        page_number: page,
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw Error("Não foi possível carregar o conteúdo. Tente novamente.");
  const data = await response.json();
  const project = async (a: Article) => {
    const review = await editorialAllowed(
      a,
      r.editorialReviews,
      Date.now(),
      r.editorialFixtures,
    );
    if (!review) return null;
    return {
      ...editorialProjection(a),
      public_sources: review.sources.map(
        ({ url, claim, block, limit, checkedAt }) => ({
          url,
          claim,
          block,
          limit,
          checkedAt,
        }),
      ),
      media_credits: review.media
        .filter((m) => m.allowed)
        .map(({ url, credit, alt }) => ({ url, credit, alt })),
      social_image: review.metadata.image,
      social_image_alt: review.metadata.imageAlt,
    };
  };
  if (kind === "materia")
    return {
      item: data.item ? await project(data.item) : null,
      redirect: data.redirect || null,
    };
  if (["lista", "fornecedor"].includes(kind)) {
    const candidates = [
      ...new Set(
        (r.editorialReviews || [])
          .filter(
            (v) =>
              v.approval.status === "approved" &&
              (v.origin === "real" || r.editorialFixtures),
          )
          .map((v) => v.slug),
      ),
    ];
    if (candidates.length > 25)
      throw Error("Inventário editorial requer paginação homologada.");
    const rows: Article[] = [];
    for (const value of candidates) {
      const detail = await contentPublic(r, "materia", value);
      const a = detail.item as Article | null;
      if (
        a &&
        (!category || a.categoria_slug === category) &&
        (kind !== "fornecedor" || a.fornecedor?.slug === slug)
      )
        rows.push(a);
    }
    rows.sort(
      (a, b) =>
        Date.parse(b.publicada_em || "") - Date.parse(a.publicada_em || "") ||
        a.slug.localeCompare(b.slug),
    );
    return {
      items: rows.slice((page - 1) * 12, page * 12),
      total: rows.length,
      pagina: page,
      not_found: data.not_found || false,
    };
  }
  if (Array.isArray(data.items))
    data.items = (await Promise.all(data.items.map(project))).filter(Boolean);
  if (kind === "sitemap") {
    const eligible = [];
    const candidates = (r.editorialReviews || []).filter(
      (v) =>
        v.approval.status === "approved" &&
        (v.origin === "real" || r.editorialFixtures),
    );
    if (candidates.length > 25)
      throw Error("Sitemap editorial requer paginação homologada.");
    for (const candidate of candidates) {
      const value = candidate.slug;
      const detail = await contentPublic(r, "materia", value);
      if (detail.item) eligible.push(value);
    }
    data.materias = eligible;
  }
  return Object.fromEntries(
    [
      "item",
      "items",
      "total",
      "pagina",
      "not_found",
      "categorias",
      "revistas",
      "materias",
      "categorias_slugs",
      "revistas_slugs",
    ]
      .filter((k) => Object.hasOwn(data, k))
      .map((k) => [k, data[k]]),
  );
}
export async function staffList(
  kind: string,
  demo: boolean,
  page = 1,
): Promise<{ items: Article[] | Subscriber[]; total: number } & Catalog> {
  if (demo) {
    const s = contentDemo();
    if (kind === "catalogo") return s.catalog as never;
    const rows = kind === "newsletter" ? s.subscribers : s.articles;
    return {
      items: rows.slice((page - 1) * 25, page * 25),
      total: rows.length,
    } as never;
  }
  const r = await db().rpc("editorial_listar", { kind, page_number: page });
  if (r.error) throw Error(r.error.message);
  return r.data as never;
}
export async function ownArticles(sid: string, demo: boolean) {
  if (demo)
    return contentDemo().articles.filter((a) => a.fornecedor_id === sid);
  const r = await db()
    .from("materias")
    .select("*")
    .eq("fornecedor_id", sid)
    .order("atualizado_em", { ascending: false });
  if (r.error) throw Error(r.error.message);
  return r.data as unknown as Article[];
}
export async function balance(sid: string, demo: boolean): Promise<Balance> {
  if (demo) return contentDemo().balance;
  const r = await db().rpc("saldo_materias", { sid });
  if (r.error) throw Error(r.error.message);
  return r.data as unknown as Balance;
}
export async function saveArticle(
  a: Article,
  sid: string | null,
  demo: boolean,
) {
  if (demo) return demoSaveArticle(a, sid);
  const r = await db().rpc("salvar_materia", {
    mid: (a.id || null) as unknown as string,
    sid: sid as unknown as string,
    p: a as unknown as Json,
    ...(a.id && a.versao !== undefined ? { expected: a.versao } : {}),
  });
  if (r.error) throw Error(r.error.message);
  return r.data as unknown as Article;
}
export async function articleAction(
  mid: string,
  action: string,
  p: Record<string, unknown>,
  demo: boolean,
) {
  if (demo) return demoArticleAction(mid, action, p);
  const r = await db().rpc("acao_materia", { mid, action, p: p as Json });
  if (r.error) throw Error(r.error.message);
  return r.data as unknown as Article;
}
export async function saveResource(
  kind: string,
  rid: string | null,
  p: Record<string, unknown>,
  demo: boolean,
) {
  if (demo) return demoSaveResource(kind, rid, p);
  const r = await db().rpc("editorial_salvar", {
    kind,
    rid: rid as unknown as string,
    p: p as Json,
  });
  if (r.error) throw Error(r.error.message);
  return r.data;
}
export async function newsletterToken(token: string, action: string) {
  const r = await db().rpc("newsletter_token", {
    p_token: token,
    p_action: action,
  });
  if (r.error) throw Error("Não foi possível processar o link.");
  return (r.data as unknown as { valido: boolean }).valido;
}
export async function uploadContent(
  file: File,
  mid: string,
  demo: boolean,
): Promise<string> {
  if (
    file.size > 5242880 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw Error("Use JPG, PNG ou WebP de até 5 MB.");
  const bitmap = await createImageBitmap(file),
    canvas = document.createElement("canvas"),
    scale = Math.min(1, 1600 / bitmap.width);
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("Imagem inválida"))),
      "image/webp",
      0.85,
    ),
  );
  if (demo)
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(Error("Falha na imagem"));
      r.readAsDataURL(blob);
    });
  const path = mid + "/" + crypto.randomUUID() + ".webp";
  const r = await db()
    .storage.from("materias")
    .upload(path, blob, { contentType: "image/webp", upsert: false });
  if (r.error)
    throw Error("Não foi possível salvar a imagem. Confira sua permissão.");
  return db().storage.from("materias").getPublicUrl(path).data.publicUrl;
}
export { slugify };

export type EditorialRow = {
  id: string;
  titulo: string;
  leituras: number;
  cliques_perfil: number;
  tempo_medio_segundos: number;
};
export async function editorialReport(
  sid: string | null,
  from: string,
  to: string,
  page: number,
) {
  const q = await db().rpc(
    "relatorio_editorial" as never,
    { sid, date_from: from, date_to: to, page_number: page } as never,
  );
  if (q.error) throw q.error;
  return q.data as unknown as { items: EditorialRow[]; total: number };
}
