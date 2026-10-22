import { db } from "../../lib/supabase";
import type { Json } from "../../lib/database.types";
import type { DirectoryRuntime } from "../directory/api";
import {
  commercialDemo,
  saveDemoCommercial,
  demoLink,
  demoReport,
  demoBanners,
  demoEvent,
} from "./demo";
import {
  analyticsAllowed,
  type Banner,
  type Row,
  type Report,
  type Catalog,
} from "./model";
export async function listCommercial(kind: string, page = 1, demo = false) {
  if (demo) {
    const s = commercialDemo();
    if (kind === "catalogo")
      return {
        ...s.catalog,
        renovacoes: s.contratos.filter(
          (c) =>
            c.status === "ativo" &&
            Date.parse(c.fim) > Date.now() &&
            Date.parse(c.fim) < Date.now() + 30 * 86400000,
        ),
      };
    const rows = s[kind as "contratos"] || [];
    return {
      items: rows.slice((page - 1) * 25, page * 25),
      total: rows.length,
    };
  }
  const { data, error } = await db().rpc("comercial_listar", {
    kind,
    page_number: page,
  });
  if (error) throw error;
  return data as unknown as Catalog | { items: Row[]; total: number };
}
export async function saveCommercial(
  kind: string,
  id: string | null,
  p: Record<string, unknown>,
  demo = false,
) {
  if (demo) return saveDemoCommercial(kind, id, p);
  const { data, error } = await db().rpc("comercial_salvar", {
    kind,
    rid: id as string,
    p: p as Json,
  });
  if (error) throw error;
  return data;
}
export async function reportLink(id: string, operation: string, demo = false) {
  if (demo) return demoLink(id, operation);
  const { data, error } = await db().rpc("link_relatorio", {
    bid: id,
    operation,
  });
  if (error) throw error;
  return (data as { token: string }).token;
}
async function publicRpc<T>(
  r: DirectoryRuntime,
  name: string,
  args: object,
): Promise<T> {
  const res = await fetch(`${r.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: r.key,
      Authorization: `Bearer ${r.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok)
    throw Error("Serviço temporariamente indisponível. Tente novamente.");
  return res.json();
}
export const publicBanners = (
  r: DirectoryRuntime,
  position: string,
  segment = "",
  region = "",
): Promise<Banner[]> =>
  r.source === "demo"
    ? Promise.resolve(demoBanners(position, segment, region))
    : publicRpc(r, "banners_publicos", {
        p_position: position,
        p_segment: segment,
        p_region: region,
      });
export const bannerDestination = (
  r: DirectoryRuntime,
  id: string,
): Promise<string | null> =>
  r.source === "demo"
    ? Promise.resolve(
        demoBanners("home_topo")
          .concat(
            ...commercialDemo()
              .catalog.posicoes.filter((p) => p.slug !== "home_topo")
              .map((p) => demoBanners(p.slug)),
          )
          .find((b) => b.id === id)?.link_destino || null,
      )
    : publicRpc(r, "destino_banner", { bid: id });
export const advertiserReport = (
  r: DirectoryRuntime,
  token: string,
  from: string,
  to: string,
): Promise<Report | null> =>
  r.source === "demo"
    ? Promise.resolve(demoReport(token, from, to))
    : publicRpc(r, "relatorio_anunciante", {
        token,
        date_from: from,
        date_to: to,
      });
export async function bannerEvent(
  r: DirectoryRuntime,
  bid: string,
  event_type: "impressao" | "clique",
  event_id = crypto.randomUUID(),
) {
  if (!analyticsAllowed()) return;
  if (r.source === "demo") {
    demoEvent(bid, event_type, event_id, true);
    return;
  }
  const url =
    import.meta.env.VITE_BANNER_EVENT_URL ||
    (import.meta.env.VITE_QUOTATION_URL
      ? import.meta.env.VITE_QUOTATION_URL.replace(
          /\/quotation$/,
          "/banner-event",
        )
      : "") ||
    `${r.url}/functions/v1/banner-event`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bid, event_type, event_id, consented: true }),
    keepalive: true,
  }).catch(() => {});
}

export type CalendarRow = {
  id: string;
  anunciante_nome: string;
  produto: string;
  inicio: string;
  fim: string;
  status: string;
  pago: boolean;
  faturamento_centavos: number;
  exibicoes: { inicio: string; fim: string; tipo: string }[];
};
export async function commercialCalendar(
  from: string,
  to: string,
  page: number,
) {
  const q = await db().rpc(
    "calendario_comercial" as never,
    { date_from: from, date_to: to, page_number: page } as never,
  );
  if (q.error) throw q.error;
  return q.data as unknown as {
    items: CalendarRow[];
    total: number;
    faturamento_centavos: number;
    recebido_centavos: number;
  };
}
