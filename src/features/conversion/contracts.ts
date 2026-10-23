// Essential retry identifier only: no form values, contacts or browsing history.
// A denied/unavailable sessionStorage degrades to the component's in-memory ID.
export function retryId(scope: string, fallback: string) {
  try {
    const key = "patri:retry:" + scope;
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const p = JSON.parse(raw);
      if (/^[a-f0-9-]{36}$/i.test(p.id) && p.expires > Date.now())
        return p.id as string;
    }
    sessionStorage.setItem(
      key,
      JSON.stringify({ id: fallback, expires: Date.now() + 3600000 }),
    );
  } catch {
    /* Storage is optional to submit. */
  }
  return fallback;
}
export function clearRetry(scope: string) {
  try {
    sessionStorage.removeItem("patri:retry:" + scope);
  } catch {
    /* Optional storage. */
  }
}
export async function acceptedReceipt(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.recebido !== true) {
    throw new Error(
      !response.ok &&
        typeof body?.error === "string" &&
        body.error.length <= 240
        ? body.error
        : "Não foi possível confirmar o recebimento. Tente novamente com os mesmos dados.",
    );
  }
  return { recebido: true as const };
}
