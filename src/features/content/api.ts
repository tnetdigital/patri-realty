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
  return response.json();
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
