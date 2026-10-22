import { accountHandler } from "../_shared/account-handler.mjs";
Deno.serve(
  accountHandler({
    url: Deno.env.get("SUPABASE_URL"),
    key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    salt: Deno.env.get("ACCOUNT_IP_SALT"),
    origins: [(Deno.env.get("SITE_URL") || "").replace(/\/$/, "")],
    ip: (r: Request) => r.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  }),
);
