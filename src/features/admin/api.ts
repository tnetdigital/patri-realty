import { db } from "../../lib/supabase";
import { demoList, demoAct, demoImport } from "./demo";
import type {
  AdminKind,
  Filters,
  Page,
  Row,
  ImportRow,
  ImportResult,
} from "./model";
export async function adminList(
  kind: string,
  filters: Partial<Filters>,
  demo: boolean,
  role: string,
) {
  if (demo) return demoList(kind, filters, role);
  const r = await db().rpc("admin_listar", {
    p_kind: kind,
    p_filters: filters,
  });
  if (r.error) throw Error(r.error.message);
  return r.data as unknown as Page | Record<string, unknown>;
}
export async function adminAct(
  kind: AdminKind,
  id: string,
  action: string,
  data: Record<string, unknown>,
  demo: boolean,
  role: string,
) {
  if (demo) return demoAct(kind, id, action, data, role);
  const r = await db().rpc("admin_agir", {
    p_kind: kind,
    p_id: id,
    p_action: action,
    p_data: data as import("../../lib/database.types").Json,
  });
  if (r.error) throw Error(r.error.message);
  return r.data as unknown as Row;
}
export async function adminImport(
  rows: ImportRow[],
  commit: boolean,
  batch: string,
  invite: boolean,
  demo: boolean,
  role: string,
) {
  if (demo) return demoImport(rows, commit, batch, invite, role);
  const r = await db().rpc("admin_importar", {
    p_rows: rows as unknown as import("../../lib/database.types").Json,
    p_commit: commit,
    p_batch: batch,
    p_invite: invite,
  });
  if (r.error) throw Error(r.error.message);
  return r.data as unknown as ImportResult[];
}
export async function exportAdmin(
  kind: AdminKind,
  filters: Filters,
  demo: boolean,
  role: string,
) {
  const rows: Row[] = [];
  for (let p = 1; p <= 400; p++) {
    const data = (await adminList(
      kind,
      { ...filters, pagina: p },
      demo,
      role,
    )) as Page;
    rows.push(...data.items);
    if (p >= data.paginas) break;
    if (p === 400)
      throw Error(
        "Mais de 10 mil registros. Refine os filtros antes de exportar.",
      );
  }
  return rows;
}

export async function jobStatus() {
  const r = await db().rpc("status_rotinas" as never);
  if (r.error) throw r.error;
  return r.data as unknown as {
    falhas_24h: number;
    ultimas: { rotina: string; codigo: string; criado_em: string }[];
  };
}
