import {
  quotationHandler,
  verifyTurnstile,
} from "../_shared/quotation-handler.mjs";
const site = Deno.env.get("SITE_URL") || "";
Deno.serve(
  quotationHandler({
    url: Deno.env.get("SUPABASE_URL"),
    key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    salt: Deno.env.get("QUOTATION_IP_SALT"),
    origins: [site.replace(/\/$/, "")],
    ip: (r: Request) => r.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    verify: (token: string, ip: string) =>
      verifyTurnstile(
        Deno.env.get("TURNSTILE_SECRET_KEY"),
        token,
        ip,
        site ? new URL(site).hostname : "",
      ),
  }),
);
