import { logJobFailure } from "../_shared/job-log.mjs";
Deno.serve(async (request) => {
  const secret = Deno.env.get("SUPPLIER_JOBS_SECRET");
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key)
    return Response.json({ error: "Serviço não configurado" }, { status: 503 });
  const r = await fetch(url + "/rest/v1/rpc/publicar_agendadas", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!r.ok) {
    await logJobFailure(url, key, "publicar-agendadas", "PUBLICATION_FAILED");
    return Response.json(
      { error: "Não foi possível publicar a fila" },
      { status: 500 },
    );
  }
  return Response.json({ publicadas: await r.json() });
});
