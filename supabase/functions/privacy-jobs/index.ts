import { logJobFailure } from "../_shared/job-log.mjs";
import { finishAuthErasure } from "../_shared/account-handler.mjs";
Deno.serve(async (request: Request) => {
  const secret = Deno.env.get("SUPPLIER_JOBS_SECRET");
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret)
    return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key)
    return Response.json({ error: "Serviço não configurado" }, { status: 503 });
  const headers = {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
  };
  try {
    const result = await fetch(url + "/rest/v1/rpc/exclusoes_auth_pendentes", {
      method: "POST",
      headers,
      body: "{}",
    });
    if (!result.ok) throw new Error("queue");
    const pending = await result.json();
    let completed = 0;
    for (const uid of pending) {
      if (await finishAuthErasure({ url, key }, uid)) completed++;
    }
    const retention = await fetch(url + "/rest/v1/rpc/retencao_privacidade", {
      method: "POST",
      headers,
      body: "{}",
    });
    if (!retention.ok) throw new Error("retention");
    return Response.json({ completed, pending: pending.length - completed });
  } catch {
    await logJobFailure(url, key, "privacy-jobs", "PRIVACY_FAILED");
    return Response.json(
      { error: "Falha nas rotinas de privacidade" },
      { status: 503 },
    );
  }
});
