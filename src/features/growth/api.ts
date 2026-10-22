import { db } from "../../lib/supabase";
import type { DirectoryRuntime } from "../directory/api";
import {
  demoReviewList,
  demoSaveReview,
  demoReviewAction,
  demoMetrics,
  growthDemo,
  demoInterest,
  demoInterestUpdate,
} from "./demo";
import type { ReviewPage, Interest, Metrics } from "./model";
export async function reviews(
  sid: string,
  mode: string,
  page: number,
  demo: boolean,
  r?: DirectoryRuntime,
): Promise<ReviewPage> {
  if (demo) return demoReviewList(sid, mode, page);
  if (mode === "publico" && r) {
    const res = await fetch(`${r.url}/rest/v1/rpc/listar_avaliacoes`, {
      method: "POST",
      headers: {
        apikey: r.key,
        Authorization: "Bearer " + r.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sid, mode, page_number: page }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw Error("Não foi possível carregar as avaliações");
    const payload = await res.json();
    if (!Array.isArray(payload?.items))
      throw Error("Não foi possível carregar as avaliações");
    return payload;
  }
  const { data, error } = await db().rpc("listar_avaliacoes", {
    sid: (["admin", "pendentes", "denunciadas"].includes(mode)
      ? null
      : sid) as string,
    mode,
    page_number: page,
  });
  if (error) throw Error(error.message);
  return data as unknown as ReviewPage;
}
export async function saveReview(
  sid: string,
  p: { nota: number; titulo: string; texto: string; condominio: string },
  demo: boolean,
) {
  if (demo) return demoSaveReview(sid, p);
  const { data, error } = await db().rpc("salvar_avaliacao", {
    sid,
    rating: p.nota,
    title: p.titulo,
    body: p.texto,
    condo: p.condominio,
  });
  if (error) throw Error(error.message);
  return data;
}
export async function reviewAction(
  rid: string,
  action: string,
  body: string,
  demo: boolean,
) {
  if (demo) return demoReviewAction(rid, action, body);
  const { error } = await db().rpc("acao_avaliacao", { rid, action, body });
  if (error) throw Error(error.message);
}
export async function metrics(
  sid: string | null,
  from: string,
  to: string,
  demo: boolean,
): Promise<Metrics> {
  if (demo) return demoMetrics(sid, from, to);
  const { data, error } = await db().rpc("resumo_metricas", {
    sid: sid as string,
    date_from: from,
    date_to: to,
  });
  if (error) throw Error(error.message);
  return data as unknown as Metrics;
}
export async function interests(
  sid: string | null,
  page: number,
  demo: boolean,
): Promise<{ items: Interest[]; total: number }> {
  if (demo) {
    const rows = growthDemo().interests.filter(
      (i) => !sid || i.fornecedor_id === sid,
    );
    return {
      items: rows.slice((page - 1) * 20, page * 20),
      total: rows.length,
    };
  }
  const { data, error } = await db().rpc("listar_interesses", {
    sid: sid as string,
    page_number: page,
  });
  if (error) throw Error(error.message);
  return data as unknown as { items: Interest[]; total: number };
}
export async function interest(
  sid: string,
  service: string,
  body: string,
  phone: string,
  demo: boolean,
) {
  if (demo) return demoInterest(sid, service, body, phone);
  const { error } = await db().rpc("interesse_marketing", {
    sid,
    service,
    body,
    phone,
  });
  if (error) throw Error(error.message);
}
export async function interestUpdate(
  rid: string,
  new_status: string,
  notes: string,
  demo: boolean,
) {
  if (demo) return demoInterestUpdate(rid, new_status, notes);
  const { error } = await db().rpc("atualizar_interesse", {
    rid,
    new_status,
    notes,
  });
  if (error) throw Error(error.message);
}
