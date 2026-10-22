import { loginHandler } from "../_shared/login-handler.mjs";
Deno.serve(
  loginHandler({
    production: true,
    captchaEnabled: Deno.env.get("CAPTCHA_ENABLED") === "true",
    captchaSecret: Deno.env.get("TURNSTILE_SECRET_KEY"),
    hostname: Deno.env.get("SITE_URL")
      ? new URL(Deno.env.get("SITE_URL")!).hostname
      : undefined,
    url: Deno.env.get("SUPABASE_URL"),
    key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    salt: Deno.env.get("ACCOUNT_IP_SALT"),
    origins: [(Deno.env.get("SITE_URL") || "").replace(/\/$/, "")],
    ip: (r: Request) => r.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  }),
);
