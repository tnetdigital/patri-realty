import { eventHandler } from "../_shared/event-handler.mjs";
Deno.serve(
  eventHandler({
    url: Deno.env.get("SUPABASE_URL"),
    key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    salt: Deno.env.get("EVENT_IP_SALT"),
    origins: [(Deno.env.get("SITE_URL") || "").replace(/\/$/, "")],
    ip: (r: Request) => r.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  }),
);
