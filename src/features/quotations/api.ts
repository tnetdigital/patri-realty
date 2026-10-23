import { acceptedReceipt } from "../conversion/contracts";
import { db } from "../../lib/supabase";
import { readDemo, writeDemo, type Quotation, type Lead } from "./model";
export async function submitQuotation(
  data: Quotation,
  demo: boolean,
  id: string,
  token: string,
  empresa: string,
) {
  if (demo) {
    const old = readDemo();
    if (!old.some((x) => x.id === id)) {
      const now = new Date().toISOString();
      writeDemo([
        {
          ...data,
          id,
          empresa,
          status: "novo",
          criado_em: now,
          atualizado_em: now,
          visto_em: null,
          respondido_em: null,
          notas: [],
        },
        ...data.copias.map((sid, i) => ({
          ...data,
          fornecedor_id: sid,
          id: id + "-" + i,
          empresa: "Fornecedor semelhante (demonstração)",
          status: "novo" as const,
          criado_em: now,
          atualizado_em: now,
          visto_em: null,
          respondido_em: null,
          notas: [],
        })),
        ...old,
      ]);
    }
    return { recebido: true as const, simulated: true };
  }
  const endpoint =
    import.meta.env.VITE_QUOTATION_URL ||
    import.meta.env.VITE_SUPABASE_URL + "/functions/v1/quotation";
  const { data: auth } = await db().auth.getSession();
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth.session
        ? { Authorization: "Bearer " + auth.session.access_token }
        : {}),
    },
    body: JSON.stringify({ ...data, request_id: id, turnstile_token: token }),
    signal: AbortSignal.timeout(15000),
  });
  return { ...(await acceptedReceipt(r)), simulated: false };
}
export async function listLeads(id: string, demo: boolean): Promise<Lead[]> {
  if (demo) return readDemo();
  const r = await db().rpc("listar_orcamentos", { sid: id });
  if (r.error) throw new Error(r.error.message);
  return r.data as unknown as Lead[];
}
export async function manageLead(
  id: string,
  action: string,
  text: string,
  demo: boolean,
) {
  if (demo) {
    writeDemo(
      readDemo().map((x) => {
        if (x.id !== id) return x;
        const now = new Date().toISOString();
        if (action === "visto")
          return {
            ...x,
            visto_em: x.visto_em || now,
            status: x.status === "novo" ? "visto" : x.status,
          };
        if (action === "respondido")
          return {
            ...x,
            status: "respondido",
            visto_em: x.visto_em || now,
            respondido_em: x.respondido_em || now,
          };
        if (action === "spam") return { ...x, status: "spam" };
        if (action === "nota") {
          if (!text.trim() || text.length > 2000 || /[<>]/.test(text))
            throw Error("Confira sua nota.");
          return {
            ...x,
            notas: [
              ...x.notas,
              { id: crypto.randomUUID(), texto: text.trim(), criado_em: now },
            ],
          };
        }
        return x;
      }),
    );
    return;
  }
  const r = await db().rpc("gerenciar_orcamento", {
    lid: id,
    p_action: action,
    p_text: text,
  });
  if (r.error) throw new Error(r.error.message);
}
