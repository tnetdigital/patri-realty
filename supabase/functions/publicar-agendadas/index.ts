// Fail closed while Data API/RPC editorial approval is not homologated.
// This endpoint must not publish merely because a worker secret is configured.
Deno.serve(async (request) => {
  const secret = Deno.env.get("SUPPLIER_JOBS_SECRET");
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  return Response.json(
    { error: "Publicação editorial bloqueada até homologação do backend." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
});
