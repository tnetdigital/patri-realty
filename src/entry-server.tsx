import {
  institutionalMeta,
  publicDocumentVersion,
  documentVersionKey,
  legalIdentity,
  legalKey,
} from "./features/privacy/legal";
import { contentPublic, contentKey } from "./features/content/api";
import type { Article, Magazine } from "./features/content/model";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  dehydrate,
} from "@tanstack/react-query";
import { PassThrough } from "node:stream";
import App from "./pages/App";
import { AuthProvider } from "./features/auth/context";
import {
  DirectoryContext,
  directoryCatalog,
  searchDirectory,
  publicProfile,
  sitemapData,
  catalogKey,
  searchKey,
  profileKey,
  type DirectoryRuntime,
} from "./features/directory/api";
import { filtersFromRoute } from "./features/directory/model";
export async function render(url: string, r: DirectoryRuntime) {
  const u = new URL(url, r.siteUrl),
    client = new QueryClient(),
    f = filtersFromRoute(u.pathname, u.search);
  let title = "Patri Realty — conexões para condomínios",
    description = "Encontre fornecedores por especialidade e região.",
    status = 200,
    redirect: string | null = null;
  if (/^\/(guia|busca)(\/|$)/.test(u.pathname)) {
    const [catalog, result] = await Promise.all([
      client.fetchQuery({
        queryKey: catalogKey(r, f.uf),
        queryFn: () => directoryCatalog(r, f.uf),
      }),
      client.fetchQuery({
        queryKey: searchKey(r, f),
        queryFn: () => searchDirectory(r, f),
      }),
    ]);
    title =
      (catalog.segmentos.find((s) => s.slug === f.segmento)?.nome ||
        "Guia de fornecedores") +
      (f.cidade ? " — " + f.cidade : f.uf ? " — " + f.uf : "") +
      " | Patri Realty";
    if (result.redirect) redirect = result.redirect;
    else if (result.not_found) status = 404;
  }
  if (u.pathname.startsWith("/fornecedor/")) {
    const slug = decodeURIComponent(u.pathname.split("/")[2] || ""),
      data = await client.fetchQuery({
        queryKey: profileKey(r, slug),
        queryFn: () => publicProfile(r, slug),
      });
    redirect = data.redirect;
    if (data.fornecedor) {
      title = data.fornecedor.nome_fantasia + " | Patri Realty";
      description = data.fornecedor.descricao_curta;
      await client.fetchQuery({
        queryKey: contentKey(r, "fornecedor", slug),
        queryFn: () => contentPublic(r, "fornecedor", slug),
      });
    } else if (!redirect) {
      status = 404;
      title = "Empresa não encontrada | Patri Realty";
    }
  }
  const institutional = institutionalMeta[u.pathname];
  if (institutional) {
    title = institutional.title + " | Patri Realty";
    await client.fetchQuery({
      queryKey: documentVersionKey(r),
      queryFn: () => publicDocumentVersion(r),
    });
    description = institutional.description;
    await client.fetchQuery({
      queryKey: legalKey(r),
      queryFn: () => legalIdentity(r),
    });
  }
  let structured: object | null =
    r.source === "live" &&
    status === 200 &&
    u.pathname.startsWith("/fornecedor/")
      ? (() => {
          const data = client.getQueryData<
            import("./features/directory/model").ProfileResult
          >(profileKey(r, decodeURIComponent(u.pathname.split("/")[2] || "")));
          const s = data?.fornecedor;
          return s
            ? {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                name: s.nome_fantasia,
                description: s.descricao_curta,
                url: r.siteUrl + "/fornecedor/" + s.slug,
                telephone: s.telefone || undefined,
                ...(r.source === "live" && s.avaliacoes > 0 && s.nota !== null
                  ? {
                      aggregateRating: {
                        "@type": "AggregateRating",
                        ratingValue: s.nota,
                        reviewCount: s.avaliacoes,
                        bestRating: 5,
                        worstRating: 1,
                      },
                    }
                  : {}),
              }
            : null;
        })()
      : null;
  if (
    u.pathname === "/" ||
    /^\/(materias|materia|revista)(\/|$)/.test(u.pathname)
  ) {
    const parts = u.pathname.split("/").filter(Boolean),
      issue = parts[0] === "revista",
      detail = (parts[0] === "materia" || issue) && !!parts[1],
      kind = detail
        ? issue
          ? "revista"
          : "materia"
        : issue
          ? "catalogo"
          : "lista",
      slug = detail ? decodeURIComponent(parts[1]) : "",
      category =
        parts[0] === "materias" && parts[1] ? decodeURIComponent(parts[1]) : "",
      page = Math.max(
        1,
        Math.min(10000, Number(u.searchParams.get("pagina")) || 1),
      );
    const [data] = await Promise.all([
      client.fetchQuery({
        queryKey: contentKey(r, kind, slug, category, page),
        queryFn: () => contentPublic(r, kind, slug, category, page),
      }),
      client.fetchQuery({
        queryKey: contentKey(r, "catalogo"),
        queryFn: () => contentPublic(r, "catalogo"),
      }),
    ]);
    if (data.redirect) redirect = data.redirect;
    if ((detail && !data.item && !redirect) || data.not_found) status = 404;
    if (detail && data.item) {
      const item = data.item as Article | Magazine;
      title =
        ("seo_titulo" in item && item.seo_titulo
          ? item.seo_titulo
          : item.titulo) + " | Patri Realty";
      description =
        "seo_descricao" in item && item.seo_descricao
          ? item.seo_descricao
          : "resumo" in item
            ? item.resumo
            : "Revista Patri Realty, edição " + (item as Magazine).edicao;
      if (!issue && r.source === "live") {
        const article = item as Article;
        structured = {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.titulo,
          description: article.resumo,
          datePublished: article.publicada_em,
          dateModified: article.atualizado_em || article.publicada_em,
          author: {
            "@type": "Person",
            name: article.autor || "Redação Patri Realty",
          },
          publisher: { "@type": "Organization", name: "Patri Realty" },
          mainEntityOfPage: r.siteUrl + "/materia/" + article.slug,
          ...(article.imagem_capa ? { image: article.imagem_capa } : {}),
        };
      }
    } else if (u.pathname !== "/") {
      title =
        (status === 404
          ? "Publicação não encontrada"
          : issue
            ? "Revista Patri Realty"
            : "Matérias" + (category ? " — " + category : "")) +
        " | Patri Realty";
      description = "Conhecimento e perspectivas para a gestão condominial.";
    }
  }
  if (/^\/(guia|busca)(\/|$)/.test(u.pathname))
    description = title + ". " + description;
  if (
    !/^\/(guia|busca|fornecedor|materias|materia|revista|newsletter|sobre-o-projeto|para-fornecedores|entrar|cadastrar|recuperar-senha|redefinir-senha|confirmar-email|area|demonstracao|demonstracao-admin|demonstracao-plano|demonstracao-editorial|demonstracao-conteudo|demonstracao-materias|assumir|convite|painel|admin|conta|conta-removida|termos|privacidade|evento|contato|contrato-fornecedor|relatorio)(\/|$)/.test(
      u.pathname,
    ) &&
    u.pathname !== "/"
  )
    status = 404;
  if (u.pathname === "/" && r.source === "live")
    structured = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": r.siteUrl + "/#organization",
          name: "Patri Realty",
          url: r.siteUrl,
        },
        {
          "@type": "WebSite",
          name: "Patri Realty",
          url: r.siteUrl,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: r.siteUrl + "/guia?q={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
        },
      ],
    };
  const html = await new Promise<string>((resolve, reject) => {
    const output = new PassThrough();
    let content = "";
    output.on("data", (chunk) => (content += chunk));
    output.on("end", () => resolve(content));
    const stream = renderToPipeableStream(
      <QueryClientProvider client={client}>
        <DirectoryContext.Provider value={r}>
          <StaticRouter location={url}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </StaticRouter>
        </DirectoryContext.Provider>
      </QueryClientProvider>,
      {
        onAllReady() {
          stream.pipe(output);
        },
        onError: reject,
      },
    );
    setTimeout(() => stream.abort(), 15000).unref();
  });
  return {
    html,
    structured,
    state: dehydrate(client),
    title,
    description,
    status,
    redirect,
    noindex:
      r.source === "demo" ||
      status === 404 ||
      !(
        u.pathname === "/" ||
        !!institutional ||
        /^\/(guia|fornecedor|materias|materia|revista)(\/|$)/.test(u.pathname)
      ) ||
      !!u.search,
  };
}
export { sitemapData };

export async function contentSitemap(
  r: DirectoryRuntime,
): Promise<{ materias: string[]; revistas: string[]; categorias: string[] }> {
  if (r.source === "demo")
    return { materias: [], revistas: [], categorias: [] };
  return (await contentPublic(r, "sitemap")) as unknown as {
    materias: string[];
    revistas: string[];
    categorias: string[];
  };
}
