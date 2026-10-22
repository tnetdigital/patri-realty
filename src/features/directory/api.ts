import { growthDemo } from "../growth/demo";
import { commercialDemo } from "../commercial/demo";
import { isActive } from "../commercial/model";
import { createContext, useContext } from "react";
import type {
  DirectoryCatalog,
  Filters,
  ProfileResult,
  SearchResult,
  SitemapData,
} from "./model";
import { paginateSuppliers, selectedSegments, directoryPath } from "./model";
import { demoCatalog, demoSuppliers } from "./fixtures";
export type DirectoryRuntime = {
  source: "live" | "demo";
  url: string;
  key: string;
  siteUrl: string;
  hashRouting: boolean;
};
const defaultRuntime: DirectoryRuntime = {
  source:
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
      ? "live"
      : "demo",
  url: import.meta.env.VITE_SUPABASE_URL || "",
  key: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  siteUrl:
    import.meta.env.VITE_SITE_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://127.0.0.1:5173"),
  hashRouting:
    typeof window !== "undefined" && window.location.hash.startsWith("#/"),
};
export const DirectoryContext = createContext<DirectoryRuntime>(defaultRuntime);
export const useDirectoryRuntime = () => useContext(DirectoryContext);
async function rpc<T>(
  runtime: DirectoryRuntime,
  name: string,
  args: object,
): Promise<T> {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(
      `${runtime.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`,
      {
        method: "POST",
        headers: {
          apikey: runtime.key,
          Authorization: `Bearer ${runtime.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
        signal: controller.signal,
      },
    );
    if (!response.ok)
      throw new Error(
        "O guia está temporariamente indisponível. Tente novamente.",
      );
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
export const catalogKey = (r: DirectoryRuntime, uf = "") => [
  "public-catalog",
  r.source,
  uf,
];
export const searchKey = (r: DirectoryRuntime, f: Filters) => [
  "public-search",
  r.source,
  f.segmento,
  f.uf,
  f.cidade,
  f.q,
  f.pagina,
  f.ordem,
];
export const profileKey = (r: DirectoryRuntime, slug: string) => [
  "public-profile",
  r.source,
  slug,
];
const locations = import.meta.glob<{ default: import("./model").City[] }>(
  "./locations/*.json",
);
export async function directoryCatalog(r: DirectoryRuntime, uf = "") {
  if (r.source === "demo") {
    const c = demoCatalog(uf);
    const load = locations[`./locations/${uf}.json`];
    return { ...c, cidades: load ? (await load()).default : [] };
  }
  return rpc<DirectoryCatalog>(r, "catalogo_guia", { p_uf: uf });
}
export async function searchDirectory(
  r: DirectoryRuntime,
  f: Filters,
): Promise<SearchResult> {
  if (r.source === "demo") {
    const catalog = await directoryCatalog(r, f.uf);
    if (
      (f.segmento &&
        selectedSegments(f.segmento).some(
          (slug) => !catalog.segmentos.some((s) => s.slug === slug),
        )) ||
      (f.uf && !catalog.estados.some((s) => s.uf === f.uf)) ||
      (f.cidade && !catalog.cidades.some((c) => c.slug === f.cidade))
    )
      return {
        items: [],
        total: 0,
        pagina: f.pagina,
        paginas: 0,
        not_found: true,
      };
    const commercial = typeof window === "undefined" ? null : commercialDemo();
    return paginateSuppliers(
      demoSuppliers.map((s) => ({
        ...s,
        ...demoRating(s.id),
        patrocinado: !!commercial?.destaques.some(
          (d) =>
            d.fornecedor_id === s.id &&
            isActive(d) &&
            commercial.contratos.some(
              (c) => c.id === d.contrato_id && isActive(c),
            ) &&
            (!f.uf || d.uf === f.uf) &&
            (!f.segmento ||
              catalog.segmentos.some(
                (seg) =>
                  seg.id === d.segmento_id &&
                  f.segmento.split(",").includes(seg.slug),
              )) &&
            (!d.cidade_id ||
              !f.cidade ||
              catalog.cidades.some(
                (c) => c.id === d.cidade_id && c.slug === f.cidade,
              )),
        ),
      })),
      f,
    );
  }
  const result = await rpc<SearchResult>(r, "buscar_fornecedores", {
    p_segmento: f.segmento,
    p_uf: f.uf,
    p_cidade: f.cidade,
    p_q: f.q,
    p_pagina: f.pagina,
    p_ordem: f.ordem,
  });
  if (result.not_found && f.segmento && !f.segmento.includes(",")) {
    const target = await rpc<string | null>(r, "redirecionamento_segmento", {
      slug: f.segmento,
    });
    if (target) {
      return { ...result, redirect: directoryPath({ ...f, segmento: target }) };
    }
  }
  return result;
}
export async function publicProfile(
  r: DirectoryRuntime,
  slug: string,
): Promise<ProfileResult> {
  if (r.source === "demo")
    return {
      fornecedor: (() => {
        const s = demoSuppliers.find((s) => s.slug === slug);
        return s ? { ...s, ...demoRating(s.id) } : null;
      })(),
      redirect: null,
    };
  return rpc<ProfileResult>(r, "fornecedor_publico", { p_slug: slug });
}
export async function sitemapData(r: DirectoryRuntime): Promise<SitemapData> {
  if (r.source === "demo")
    return { fornecedores: [], segmentos: [], locais: [] };
  return rpc<SitemapData>(r, "sitemap_publico", {});
}

function demoRating(id: string) {
  const rows =
    typeof window === "undefined"
      ? []
      : growthDemo().reviews.filter(
          (r) => r.fornecedor_id === id && r.status === "publicada",
        );
  return {
    avaliacoes: rows.length,
    nota: rows.length
      ? Math.round((rows.reduce((n, r) => n + r.nota, 0) / rows.length) * 10) /
        10
      : null,
  };
}
