import { db } from "../../lib/supabase";
export async function accountAction(
  action: "export" | "delete",
  password = "",
  confirmation = "",
) {
  const { data } = await db().auth.getSession();
  if (!data.session) throw new Error("Entre novamente para continuar.");
  const endpoint =
    import.meta.env.VITE_ACCOUNT_URL ||
    (import.meta.env.VITE_QUOTATION_URL
      ? import.meta.env.VITE_QUOTATION_URL.replace(/quotation\/?$/, "account")
      : import.meta.env.VITE_SUPABASE_URL + "/functions/v1/account");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + data.session.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      ...(action === "delete" ? { password, confirmation } : {}),
    }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Não foi possível concluir.");
  return result;
}
export function downloadPersonalData(data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "patri-realty-meus-dados.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
