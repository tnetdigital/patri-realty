import { db } from "../../lib/supabase";
export async function ownCompanies() {
  return db()
    .from("fornecedores")
    .select("id,nome_fantasia")
    .order("nome_fantasia");
}
export async function ownContracts() {
  return db()
    .from("contratos")
    .select("id,anunciante_nome,produto,valor_centavos,inicio,fim,status,pago")
    .order("fim", { ascending: false })
    .limit(100);
}
export async function activePortals() {
  return db().from("portais_parceiros").select("*").eq("ativo", true);
}
export async function billingHistory() {
  const [s, p] = await Promise.all([
    db()
      .from("assinaturas")
      .select("*")
      .order("atualizado_em", { ascending: false })
      .limit(100),
    db()
      .from("pagamentos")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(100),
  ]);
  if (s.error || p.error) throw Error("Falha na consulta de cobrança.");
  return { subscriptions: s.data, payments: p.data };
}
export async function unlockQuote(lid: string) {
  return db().rpc("liberar_orcamento", { lid });
}
export async function acceptOwnership(token: string) {
  return db().rpc("aceitar_propriedade", { token });
}
export async function uploadBanner(path: string, blob: Blob) {
  const r = await db()
    .storage.from("banners")
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (r.error) throw r.error;
  return db().storage.from("banners").getPublicUrl(path).data.publicUrl;
}
export async function updateName(id: string, nome: string) {
  return db().from("profiles").update({ nome }).eq("id", id);
}
export async function updateEmail(email: string) {
  return db().auth.updateUser(
    { email },
    { emailRedirectTo: location.origin + "/conta" },
  );
}
export async function updatePassword(password: string) {
  return db().auth.updateUser({ password });
}
export async function signOut(scope: "global" | "local") {
  return db().auth.signOut({ scope });
}
export async function ownQuoteHistory(page = 1) {
  const r = await db().rpc(
    "meus_orcamentos" as never,
    { page_number: page } as never,
  );
  if (r.error) throw r.error;
  return r.data as unknown as {
    items: {
      id: string;
      mensagem: string;
      status: string;
      criado_em: string;
      empresa: string;
    }[];
    total: number;
  };
}
export async function sendMessage(
  nome: string,
  email: string,
  mensagem: string,
) {
  const r = await db().rpc(
    "enviar_mensagem" as never,
    { p_nome: nome, p_email: email, p_mensagem: mensagem } as never,
  );
  if (r.error) throw Error(r.error.message);
}
