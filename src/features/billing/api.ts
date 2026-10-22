import { db } from "../../lib/supabase";
import { demoPlans, demoPackages, readBillingDemo } from "./demo";
import type { Plan, Package, Summary } from "./model";
export async function catalog(demo: boolean) {
  if (demo) {
    const merge = <T extends { id: string }>(x: T): T => ({
      ...x,
      ...JSON.parse(
        localStorage.getItem("patri:billing-config:" + x.id) || "{}",
      ),
    });
    return { plans: demoPlans.map(merge), packs: demoPackages.map(merge) };
  }
  const [p, k] = await Promise.all([
    db().from("planos").select("*").eq("ativo", true).order("preco_centavos"),
    db().from("tabela_precos").select("*").eq("ativo", true).order("creditos"),
  ]);
  if (p.error || k.error) throw Error("Não foi possível carregar os planos.");
  return { plans: p.data as Plan[], packs: k.data as Package[] };
}
export async function summary(sid: string, demo: boolean): Promise<Summary> {
  if (demo) return readBillingDemo().summary;
  const r = await db().rpc("resumo_plano", { sid });
  if (r.error) throw Error(r.error.message);
  return r.data as unknown as Summary;
}
export async function checkout(
  sid: string,
  product: string,
  request_id: string,
  action = "checkout",
) {
  const { data } = await db().auth.getSession();
  if (!data.session) throw Error("Entre na conta proprietária.");
  const r = await fetch(
    import.meta.env.VITE_CHECKOUT_URL ||
      import.meta.env.VITE_SUPABASE_URL + "/functions/v1/criar-checkout",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + data.session.access_token,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ sid, product, request_id, action }),
      signal: AbortSignal.timeout(20000),
    },
  );
  const b = await r.json();
  if (!r.ok) throw Error(b.error || "Falha ao abrir pagamento.");
  const url = new URL(b.url);
  if (
    url.protocol !== "https:" ||
    !["checkout.stripe.com", "billing.stripe.com"].includes(url.hostname)
  )
    throw Error("Destino de pagamento inválido.");
  location.assign(url.href);
}
export async function savePrice(
  kind: string,
  pid: string,
  data: Record<string, unknown>,
) {
  const r = await db().rpc("configurar_cobranca", {
    kind,
    pid,
    data: data as import("../../lib/database.types").Json,
  });
  if (r.error) throw Error(r.error.message);
}
