import { billingHandlers } from "../_shared/billing-handler.mjs";
Deno.serve(
  billingHandlers({
    enabled: Deno.env.get("STRIPE_ENABLED") === "true",
    url: Deno.env.get("SUPABASE_URL"),
    anonKey: Deno.env.get("SUPABASE_ANON_KEY"),
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    stripeKey: Deno.env.get("STRIPE_SECRET_KEY"),
    site: Deno.env.get("SITE_URL"),
  }).checkout,
);
