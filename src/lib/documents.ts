import { db, configured } from "./supabase";
import { documentVersion } from "./texts";
export async function currentDocumentVersion() {
  if (!configured) return documentVersion;
  const { data, error } = await db().rpc("document_version" as never);
  if (error || typeof data !== "string")
    throw Error("Não foi possível consultar os documentos. Tente novamente.");
  return data;
}
